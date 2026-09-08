import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../database/entities/product.entity';
import { KeyPool } from '../database/entities/key-pool.entity';
import { ShowroomGateway } from '../products/products.gateway';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private productRepo: Repository<Product>,
    @InjectRepository(KeyPool)
    private keyPoolRepo: Repository<KeyPool>,
    private readonly showroomGateway: ShowroomGateway,
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

  async search(params: {
    query?: string;
    category?: string;
    service?: string;
    minPrice?: number;
    maxPrice?: number;
    limit?: number;
    offset?: number;
  }): Promise<{ products: Product[]; total: number }> {
    const {
      query,
      category,
      service,
      minPrice,
      maxPrice,
      limit = 48,
      offset = 0,
    } = params;

    const qb = this.productRepo.createQueryBuilder('p');

    if (query) {
      qb.where(
        'p.name ILIKE :query OR p.description ILIKE :query',
        { query: `%${query}%` },
      );
    }

    if (category) {
      qb.andWhere('p.category = :category', { category });
    }

    if (service) {
      qb.andWhere('p.service = :service', { service });
    }

    if (minPrice !== undefined) {
      qb.andWhere('p.price >= :minPrice', { minPrice });
    }

    if (maxPrice !== undefined) {
      qb.andWhere('p.price <= :maxPrice', { maxPrice });
    }

    const [products, total] = await qb
      .orderBy('p.id', 'ASC')
      .take(limit)
      .skip(offset)
      .getManyAndCount();

    return { products, total };
  }

  async notifyProductUpdate(productId: number): Promise<void> {
    const product = await this.findOne(productId);
    if (!product) return;
    const available = await this.getAvailableKeys(productId);
    this.showroomGateway.emitProductUpdated(product, available);
  }

  async notifyOutOfStock(productId: number): Promise<void> {
    this.showroomGateway.emitOutOfStock(productId);
  }

  async notifyRestocked(productId: number): Promise<void> {
    const product = await this.findOne(productId);
    if (!product) return;
    const available = await this.getAvailableKeys(productId);
    this.showroomGateway.emitProductRestocked(productId, available);
  }
}
