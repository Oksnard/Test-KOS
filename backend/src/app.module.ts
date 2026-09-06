import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { PromoCodesModule } from './promo-codes/promo-codes.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    DatabaseModule,
    ProductsModule,
    OrdersModule,
    WebhooksModule,
    PromoCodesModule,
    AdminModule,
  ],
})
export class AppModule {}
