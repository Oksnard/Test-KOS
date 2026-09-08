import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../database/entities/product.entity';
import { KeyPool } from '../database/entities/key-pool.entity';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { ShowroomGateway } from './products.gateway';

@Module({
  imports: [TypeOrmModule.forFeature([Product, KeyPool])],
  controllers: [ProductsController],
  providers: [ProductsService, ShowroomGateway],
  exports: [ProductsService],
})
export class ProductsModule {}
