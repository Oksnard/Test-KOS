import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { PromoCode } from '../database/entities/promo-code.entity';

@Injectable()
export class PromoCodesService {
  constructor(
    @InjectRepository(PromoCode)
    private promoCodeRepo: Repository<PromoCode>,
  ) {}

  async findByCode(code: string): Promise<PromoCode | null> {
    return this.promoCodeRepo.findOne({ where: { code } });
  }

  async validate(code: string, productId?: number): Promise<any> {
    const promo = await this.promoCodeRepo.findOne({ where: { code } });
    if (!promo) throw new NotFoundException('Promo code not found');
    if (!promo.isActive) throw new BadRequestException('Promo code is inactive');

    const remaining = promo.maxUses - promo.usedCount;
    return { valid: true, code: promo.code, discountPercent: promo.discountPercent, remainingUses: remaining };
  }

  /**
   * Общая логика атомарного «списания» одного использования промокода.
   * Рow-lock (pessimistic_write) на строку промокода сериализует параллельные
   * применения: поток, пришедший после исчерпания лимита, перечитывает строку
   * уже с usedCount == maxUses и получает ConflictException — лимит никогда не
   * превышается даже под конкурентными запросами.
   */
  private async applyInManager(m: EntityManager, code: string): Promise<number> {
    const promo = await m
      .getRepository(PromoCode)
      .createQueryBuilder('pc')
      .where('pc.code = :code', { code })
      .setLock('pessimistic_write')
      .getOne();

    if (!promo) throw new BadRequestException('Промокод не найден');
    if (!promo.isActive) throw new BadRequestException('Промокод неактивен');
    if (promo.usedCount >= promo.maxUses) {
      throw new ConflictException('Лимит использований промокода исчерпан');
    }

    promo.usedCount += 1;
    await m.save(promo);
    return promo.discountPercent;
  }

  /**
   * Атомарное применение промокода внутри УЖЕ открытой транзакции заказа.
   * Скидку при заказе считает сервер, вызывающий этот метод до создания заказа.
   * @returns discountPercent применённого промокода
   */
  async applyWithin(code: string, manager: EntityManager): Promise<number> {
    return this.applyInManager(manager, code);
  }

  /**
   * Публичный ручной API: атомарно применяет промокод (своя транзакция).
   */
  async apply(code: string, productId?: number): Promise<any> {
    const queryRunner = this.promoCodeRepo.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const discountPercent = await this.applyInManager(queryRunner.manager, code);
      const promo = await queryRunner.manager.getRepository(PromoCode).findOne({ where: { code } });
      await queryRunner.commitTransaction();
      return { valid: true, code, discountPercent, remainingUses: promo ? promo.maxUses - promo.usedCount : 0 };
    } catch (error) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
