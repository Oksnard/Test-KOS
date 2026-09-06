import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { KeyPool } from './entities/key-pool.entity';
import { Order } from './entities/order.entity';
import { PromoCode } from './entities/promo-code.entity';
import { WebhookEvent } from './entities/webhook-event.entity';
import { DeliveryLog } from './entities/delivery-log.entity';

export const entities = [Product, KeyPool, Order, PromoCode, WebhookEvent, DeliveryLog];

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DATABASE_HOST || 'postgres',
      port: parseInt(process.env.DATABASE_PORT || '5432'),
      username: process.env.DATABASE_USERNAME || 'store_user',
      password: process.env.DATABASE_PASSWORD || 'store_pass_123',
      database: process.env.DATABASE_NAME || 'digitalstore',
      entities,
      synchronize: true,
    }),
    TypeOrmModule.forFeature(entities),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
