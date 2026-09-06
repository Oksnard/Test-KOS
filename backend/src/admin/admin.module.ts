import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../database/entities/order.entity';
import { KeyPool } from '../database/entities/key-pool.entity';
import { WebhookEvent } from '../database/entities/webhook-event.entity';
import { DeliveryLog } from '../database/entities/delivery-log.entity';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, KeyPool, WebhookEvent, DeliveryLog]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
