import { Controller, Get, Post, Param, NotFoundException } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { ShowroomGateway } from '../showroom/showroom.module';
import { ProductsService } from '../products/products.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../database/entities/order.entity';

@Controller('api')
export class BookingsController {
  constructor(
    private readonly bookingsService: BookingsService,
    private readonly showroomGateway: ShowroomGateway,
    private readonly productsService: ProductsService,
    @InjectRepository(Order)
    private orderRepo: Repository<Order>,
  ) {}

  @Post('bookings')
  async createBooking(@Param('orderId') orderId: number, @Param('productId') productId: number) {
    const booking = await this.bookingsService.create(orderId, productId, 300);

    if (!booking) {
      return {
        success: false,
        error: 'Товар уже забронирован другим заказом',
        booking: null,
      };
    }

    return {
      success: true,
      booking: {
        id: booking.id,
        orderId: booking.orderId,
        expiresAt: booking.expiresAt.toISOString(),
        remainingMs: this.bookingsService.getRemainingMs(booking),
      },
    };
  }

  @Get('bookings/:orderNumber')
  async getBooking(@Param('orderNumber') orderNumber: string) {
    const order = await this.orderRepo.findOne({
      where: { orderNumber },
    });
    if (!order) throw new NotFoundException('Order not found');

    const booking = await this.bookingsService.getActiveByOrderId(order.id);
    if (!booking) {
      return {
        hasBooking: false,
        remainingMs: 0,
      };
    }

    const remainingMs = this.bookingsService.getRemainingMs(booking);

    return {
      hasBooking: true,
      booking: {
        id: booking.id,
        orderId: booking.orderId,
        productId: booking.productId,
        expiresAt: booking.expiresAt.toISOString(),
        remainingMs,
        status: booking.status,
      },
    };
  }

  @Post('bookings/:orderNumber/cancel')
  async cancelBooking(@Param('orderNumber') orderNumber: string) {
    const order = await this.orderRepo.findOne({
      where: { orderNumber },
    });
    if (!order) throw new NotFoundException('Order not found');

    const cancelled = await this.bookingsService.cancel(order.id);

    if (cancelled) {
      await this.productsService.notifyRestocked(order.productId);
    }

    return { success: cancelled };
  }
}
