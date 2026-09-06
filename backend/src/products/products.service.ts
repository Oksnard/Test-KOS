import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../database/entities/product.entity';
import { KeyPool } from '../database/entities/key-pool.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private productRepo: Repository<Product>,
    @InjectRepository(KeyPool)
    private keyPoolRepo: Repository<KeyPool>,
  ) {}

  async findAll(): Promise<Product[]> {
    return this.productRepo.find({ order: { id: 'ASC' } });
  }

  async findOne(id: number): Promise<Product | null> {
    return this.productRepo.findOne({ where: { id } });
  }

  async getAvailableKeys(productId: number): Promise<number> {
    const result = await this.keyPoolRepo
      .createQueryBuilder('kp')
      .select('COUNT(*)', 'count')
      .where('kp.productId = :productId', { productId })
      .andWhere('kp.isUsed = :isUsed', { isUsed: false })
      .getRawOne();
    return parseInt(result.count);
  }
}
