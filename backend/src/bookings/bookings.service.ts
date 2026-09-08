import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Booking } from './entities/booking.entity';
import { KeyPool } from '../database/entities/key-pool.entity';
import { Product } from '../database/entities/product.entity';
import { ShowroomGateway } from '../products/products.gateway';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class BookingsService implements OnModuleInit {
  private readonly logger = new Logger(BookingsService.name);
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    @InjectRepository(Booking)
    private bookingRepo: Repository<Booking>,
    @InjectRepository(KeyPool)
    private keyPoolRepo: Repository<KeyPool>,
    @InjectRepository(Product)
    private productRepo: Repository<Product>,
    private readonly showroomGateway: ShowroomGateway,
  ) {}

  onModuleInit() {
    // Запускаем периодическую очистку истёкших броней
    this.cleanupTimer = setInterval(() => this.cleanupExpired(), 30000);
  }

  /**
   * Создать бронь для товара.
   * Возвращает null, если товар уже забронирован.
   */
  async create(orderId: number, productId: number, ttlSeconds = 300): Promise<Booking | null> {
    // Проверяем, нет ли уже активной брони
    const existing = await this.bookingRepo.findOne({
      where: {
        orderId,
        status: 'active',
      },
    });
    if (existing) {
      return existing;
    }

    // Проверяем, нет ли брони на этот товар от другого заказа
    const productBooking = await this.bookingRepo.findOne({
      where: {
        productId,
        status: 'active',
      },
    });
    if (productBooking) {
      this.logger.warn(`Product ${productId} already booked under order ${productBooking.orderId}`);
      return null;
    }

    const booking = this.bookingRepo.create({
      orderId,
      productId,
      expiresAt: new Date(Date.now() + ttlSeconds * 1000),
      status: 'active',
    });

    const saved = await this.bookingRepo.save(booking);
    this.logger.log(`Booking created: order=${orderId}, product=${productId}, expires=${saved.expiresAt.toISOString()}`);
    return saved;
  }

  /**
   * Подтвердить бронь (оплата прошла).
   */
  async confirm(orderId: number): Promise<boolean> {
    const booking = await this.bookingRepo.findOne({
      where: { orderId, status: 'active' },
    });
    if (!booking) return false;

    booking.status = 'confirmed';
    await this.bookingRepo.save(booking);
    this.logger.log(`Booking confirmed: order=${orderId}`);
    return true;
  }

  /**
   * Получить активную броню по orderNumber.
   */
  async getActiveByOrderId(orderId: number): Promise<Booking | null> {
    return this.bookingRepo.findOne({
      where: { orderId, status: 'active' },
      relations: ['product'],
    });
  }

  /**
   * Получить оставшееся время в мс.
   */
  getRemainingMs(booking: Booking): number {
    return Math.max(0, booking.expiresAt.getTime() - Date.now());
  }

  /**
   * Проверить и снять истекшие брони.
   */
  @Cron(CronExpression.EVERY_30_SECONDS)
  async cleanupExpired(): Promise<void> {
    const now = new Date();
    const expired = await this.bookingRepo.find({
      where: {
        status: 'active',
        expiresAt: LessThan(now),
      },
    });

    if (expired.length === 0) return;

    this.logger.log(`Cleaning up ${expired.length} expired bookings`);

    for (const booking of expired) {
      booking.status = 'expired';
      await this.bookingRepo.save(booking);

      // Освобождаем товар — эмитим событие restock
      const product = await this.productRepo.findOne({ where: { id: booking.productId } });
      if (product) {
        const available = await this.keyPoolRepo.count({
          where: { productId: booking.productId, isUsed: false },
        });
        this.showroomGateway.emitProductRestocked(booking.productId, available);
      }

      this.showroomGateway.emitBookingUpdate({
        orderId: booking.orderId,
        expiresAt: booking.expiresAt,
        remainingMs: 0,
        status: 'expired',
      });
    }
  }

  /**
   * Отменить бронь вручную.
   */
  async cancel(orderId: number): Promise<boolean> {
    const booking = await this.bookingRepo.findOne({
      where: { orderId, status: 'active' },
    });
    if (!booking) return false;

    booking.status = 'cancelled';
    await this.bookingRepo.save(booking);

    // Освобождаем товар — эмитим событие restock
    const product = await this.productRepo.findOne({ where: { id: booking.productId } });
    if (product) {
      const available = await this.keyPoolRepo.count({
        where: { productId: booking.productId, isUsed: false },
      });
      this.showroomGateway.emitProductRestocked(booking.productId, available);
    }

    this.showroomGateway.emitBookingUpdate({
      orderId: booking.orderId,
      expiresAt: booking.expiresAt,
      remainingMs: 0,
      status: 'cancelled',
    });

    return true;
  }
}
