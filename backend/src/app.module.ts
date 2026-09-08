import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from './database/database.module';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { PromoCodesModule } from './promo-codes/promo-codes.module';
import { AdminModule } from './admin/admin.module';
import { BookingsModule } from './bookings/bookings.module';
import { ShowroomModule } from './showroom/showroom.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    DatabaseModule,
    ProductsModule,
    OrdersModule,
    WebhooksModule,
    PromoCodesModule,
    AdminModule,
    BookingsModule,
    ShowroomModule,
  ],
})
export class AppModule {}
