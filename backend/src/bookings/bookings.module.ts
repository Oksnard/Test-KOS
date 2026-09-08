import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { BookingsService } from './bookings.service';
import { Booking } from './entities/booking.entity';
import { Order } from '../database/entities/order.entity';
import { KeyPool } from '../database/entities/key-pool.entity';
import { Product } from '../database/entities/product.entity';
import { ShowroomModule } from '../showroom/showroom.module';
import { ProductsModule } from '../products/products.module';
import { BookingsController } from './bookings.controller';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([Booking, Order, KeyPool, Product]),
    ShowroomModule,
    ProductsModule,
  ],
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
