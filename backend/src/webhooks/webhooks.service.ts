import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { WebhookEvent } from '../database/entities/webhook-event.entity';
import { Order } from '../database/entities/order.entity';
import { OrdersService } from '../orders/orders.service';

@Injectable()
export class WebhooksService {
  constructor(
    @InjectRepository(WebhookEvent)
    private webhookEventRepo: Repository<WebhookEvent>,
    @InjectRepository(Order)
    private orderRepo: Repository<Order>,
    private ordersService: OrdersService,
  ) {}

  async handlePaymentWebhook(
    eventId: string,
    orderId: number,
    status: 'paid' | 'failed',
  ): Promise<any> {
    if (status === 'failed') {
      // Идемпотентность, зеркальная paid-ветке: повторный failed с тем же
      // event_id (ретрай поставщика) НЕ должен падать на UNIQUE eventId.
      const existing = await this.webhookEventRepo.findOne({ where: { eventId } });
      if (existing && existing.status !== 'pending') {
        return { received: true, duplicate: true };
      }

      await this.orderRepo.update(
        { id: orderId, status: In(['created', 'paid']) },
        { status: 'failed' },
      );

      if (existing) {
        await this.webhookEventRepo.update({ eventId }, { status: 'failed', orderId });
      } else {
        await this.webhookEventRepo.save({ eventId, orderId, status: 'failed' });
      }
      return { received: true };
    }

    try {
      const order = await this.ordersService.processPayment(orderId, eventId);
      return { received: true, order };
    } catch (error) {
      if (error.message === 'ORDER_NOT_FOUND') {
        await this.webhookEventRepo.save({
          eventId,
          orderId,
          status: 'pending',
          rawData: { note: 'Order not found yet' },
        });
        return { received: true, deferred: true };
      }
      throw error;
    }
  }
}
