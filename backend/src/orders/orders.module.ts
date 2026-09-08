import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../database/entities/order.entity';
import { KeyPool } from '../database/entities/key-pool.entity';
import { WebhookEvent } from '../database/entities/webhook-event.entity';
import { DeliveryLog } from '../database/entities/delivery-log.entity';
import { ProductsModule } from '../products/products.module';
import { PromoCodesModule } from '../promo-codes/promo-codes.module';
import { BookingsModule } from '../bookings/bookings.module';
import { ShowroomModule } from '../showroom/showroom.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, KeyPool, WebhookEvent, DeliveryLog]),
    ProductsModule,
    PromoCodesModule,
    BookingsModule,
    ShowroomModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
