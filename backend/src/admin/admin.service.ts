import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Order } from '../database/entities/order.entity';
import { KeyPool } from '../database/entities/key-pool.entity';
import { DeliveryLog } from '../database/entities/delivery-log.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Order)
    private orderRepo: Repository<Order>,
    @InjectRepository(KeyPool)
    private keyPoolRepo: Repository<KeyPool>,
    @InjectRepository(DeliveryLog)
    private deliveryLogRepo: Repository<DeliveryLog>,
  ) {}

  async getOrders(limit = 50, offset = 0, status?: string): Promise<{ orders: Order[]; total: number }> {
    const where = status ? { status } : {};
    const [orders, total] = await this.orderRepo.findAndCount({
      where,
      relations: ['product'],
      order: { createdAt: 'DESC' },
      skip: offset,
      take: limit,
    });
    return { orders, total };
  }

  async getOrder(id: number): Promise<any> {
    const order = await this.orderRepo.findOne({
      where: { id },
      relations: ['product'],
    });
    if (!order) throw new NotFoundException('Order not found');

    const deliveryLog = await this.deliveryLogRepo.find({ where: { orderId: id }, order: { createdAt: 'DESC' } });
    const key = order.assignedKeyId ? await this.keyPoolRepo.findOne({ where: { id: order.assignedKeyId } }) : null;

    return { order, deliveryLog, assignedKey: key };
  }

  async getStats(): Promise<any> {
    const total = await this.orderRepo.count();
    const delivered = await this.orderRepo.count({ where: { status: 'delivered' } });
    const pending = await this.orderRepo.count({ where: { status: In(['created', 'paid', 'delivering']) } });
    const failed = await this.orderRepo.count({ where: { status: In(['out_of_stock', 'delivery_failed']) } });

    const keyStats = await this.keyPoolRepo
      .createQueryBuilder('kp')
      .select('kp.productId', 'productId')
      .addSelect('COUNT(*)', 'total')
      .addSelect('SUM(CASE WHEN kp.isUsed THEN 1 ELSE 0 END)', 'used')
      .addSelect('SUM(CASE WHEN NOT kp.isUsed THEN 1 ELSE 0 END)', 'available')
      .groupBy('kp.productId')
      .getRawMany();

    return { total_orders: total, delivered_orders: delivered, pending_orders: pending, failed_orders: failed, keyStats };
  }

  async getKeyPool(): Promise<any[]> {
    return await this.keyPoolRepo
      .createQueryBuilder('kp')
      .select('kp.productId', 'productId')
      .addSelect('COUNT(*)', 'total')
      .addSelect('SUM(CASE WHEN kp.isUsed THEN 1 ELSE 0 END)', 'used')
      .addSelect('SUM(CASE WHEN NOT kp.isUsed THEN 1 ELSE 0 END)', 'available')
      .groupBy('kp.productId')
      .getRawMany();
  }

  async addKeys(productId: number, keys: string[]): Promise<number> {
    if (!productId) throw new BadRequestException('productId is required');
    if (!Array.isArray(keys) || keys.length === 0) {
      throw new BadRequestException('keys must be a non-empty array');
    }
    const entities = keys.map(keyValue => this.keyPoolRepo.create({ productId, keyValue, isUsed: false }));
    await this.keyPoolRepo.save(entities);
    return keys.length;
  }

  async deliverOrder(orderId: number, keyValue?: string): Promise<any> {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');

    // Идемпотентность: повторная выдача уже выданного заказа возвращает
    // тот же ключ, не тратя новый (проверка до Conflict для delivered).
    if (order.status === 'delivered') {
      if (!order.assignedKeyId) {
        throw new ConflictException('Order already delivered but has no key');
      }
      const key = await this.keyPoolRepo.findOne({ where: { id: order.assignedKeyId } });
      return { delivered: true, key };
    }

    if (!['out_of_stock', 'delivery_failed', 'created', 'paid', 'delivering'].includes(order.status)) {
      throw new ConflictException(`Cannot deliver order in status "${order.status}"`);
    }

    let assignedKeyId = order.assignedKeyId;

    if (!assignedKeyId) {
      if (keyValue) {
        let key = await this.keyPoolRepo.findOne({ where: { keyValue, productId: order.productId } });
        if (!key) {
          key = this.keyPoolRepo.create({ productId: order.productId, keyValue, isUsed: true, assignedToOrderId: orderId });
          await this.keyPoolRepo.save(key);
        } else {
          key.isUsed = true;
          key.assignedToOrderId = orderId;
          await this.keyPoolRepo.save(key);
        }
        assignedKeyId = key.id;
      } else {
        // Резервируем ровно ОДИН свободный ключ атомарно (см. orders.service).
        assignedKeyId = await this.reserveFreeKey(order.productId, orderId);
      }
    }

    order.status = 'delivered';
    order.assignedKeyId = assignedKeyId;
    order.deliveredAt = new Date();
    await this.orderRepo.save(order);

    await this.deliveryLogRepo.save({
      orderId,
      supplier: 'admin_manual',
      requestId: uuidv4(),
      status: 'success',
      keyValue: keyValue || '(auto)',
    });

    const refreshed = await this.orderRepo.findOne({ where: { id: orderId } });
    const key = await this.keyPoolRepo.findOne({ where: { id: assignedKeyId } });
    return { delivered: true, order: refreshed, key };
  }

  /** Резервирует ровно ОДИН свободный ключ товара атомарно и возвращает его id. */
  private async reserveFreeKey(productId: number, orderId: number): Promise<number> {
    const queryRunner = this.keyPoolRepo.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const key = await queryRunner.manager
        .getRepository(KeyPool)
        .createQueryBuilder('kp')
        .where('kp.productId = :productId AND kp.isUsed = :isUsed', {
          productId,
          isUsed: false,
        })
        .orderBy('kp.id', 'ASC')
        .setLock('pessimistic_write')
        .getOne();

      if (!key) {
        await queryRunner.rollbackTransaction();
        throw new BadRequestException('No keys available for this product');
      }

      key.isUsed = true;
      key.assignedToOrderId = orderId;
      await queryRunner.manager.save(key);
      await queryRunner.commitTransaction();
      return key.id;
    } catch (error) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
