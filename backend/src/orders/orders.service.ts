import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { Order } from '../database/entities/order.entity';
import { KeyPool } from '../database/entities/key-pool.entity';
import { WebhookEvent } from '../database/entities/webhook-event.entity';
import { DeliveryLog } from '../database/entities/delivery-log.entity';
import { ProductsService } from '../products/products.service';
import { PromoCodesService } from '../promo-codes/promo-codes.service';
import { v4 as uuidv4 } from 'uuid';

interface SupplierResult {
  success: boolean;
  supplier: string;
  requestId?: string;
  error?: string;
  keyValue?: string;
}

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private orderRepo: Repository<Order>,
    @InjectRepository(KeyPool)
    private keyPoolRepo: Repository<KeyPool>,
    @InjectRepository(WebhookEvent)
    private webhookEventRepo: Repository<WebhookEvent>,
    @InjectRepository(DeliveryLog)
    private deliveryLogRepo: Repository<DeliveryLog>,
    private productsService: ProductsService,
    private promoCodesService: PromoCodesService,
  ) {}

  async createOrder(
    productId: number,
    userEmail?: string,
    userIp?: string,
    promoCode?: string,
  ): Promise<Order> {
    const product = await this.productsService.findOne(productId);
    if (!product) throw new NotFoundException('Product not found');

    const orderNumber = `ORD-${Date.now()}-${uuidv4().substring(0, 6).toUpperCase()}`;
    const requestId = uuidv4();
    const originalPrice = Number(product.price);

    const buildOrder = (discountAmount: number, promo: string | undefined) => {
      const finalPrice = Math.max(0, Math.round((originalPrice - discountAmount) * 100) / 100);
      return this.orderRepo.create({
        orderNumber,
        productId,
        userEmail,
        userIp,
        status: 'created',
        originalPrice,
        discountAmount,
        finalPrice,
        promoCode: promo,
        requestId,
      });
    };

    // Без промокода — простая вставка, как раньше.
    if (!promoCode) {
      return this.orderRepo.save(buildOrder(0, undefined));
    }

    // Промокод: расход и создание заказа в ОДНОЙ транзакции. Скидку считает
    // только сервер: сумма берётся из discountPercent промокода в БД (не из
    // запроса клиента). consume() атомарно блокирует строку промокода, поэтому
    // под параллельными запросами лимит не превышается; при исчерпании
    // транзакция откатывается и заказ не создаётся.
    const queryRunner = this.orderRepo.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const discountPercent = await this.promoCodesService.applyWithin(promoCode, queryRunner.manager);
      const discountAmount = Math.round(originalPrice * (discountPercent / 100) * 100) / 100;
      const order = queryRunner.manager.getRepository(Order).create(buildOrder(discountAmount, promoCode));
      const saved = await queryRunner.manager.getRepository(Order).save(order);
      await queryRunner.commitTransaction();
      return saved;
    } catch (error) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getOrder(orderNumber: string): Promise<Order | null> {
    const order = await this.orderRepo.findOne({
      where: { orderNumber },
      relations: ['product'],
    });
    return this.attachKeyValue(order);
  }

  /**
   * Клиент показывает выданный ключ из поля assignedKeyValue,
   * но сама сущность Order хранит только assignedKeyId.
   * Подмешиваем значение ключа из KeyPool в объект ответа.
   */
  private async attachKeyValue<T extends Order | null>(order: T): Promise<T> {
    if (order && order.assignedKeyId) {
      const key = await this.keyPoolRepo.findOne({
        where: { id: order.assignedKeyId },
      });
      if (key) {
        (order as Order & { assignedKeyValue?: string }).assignedKeyValue =
          key.keyValue;
      }
    }
    return order;
  }

  async processPayment(orderId: number, eventId: string): Promise<Order> {
    const queryRunner = this.orderRepo.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Lock order first: сериализует параллельные вебхуки с одним
      // event_id — только первый поток обрабатывает событие, остальные
      // дождутся коммита и уйдут по идемпотентной ветке ниже.
      const order = await queryRunner.manager
        .getRepository(Order)
        .createQueryBuilder()
        .where('id = :id', { id: orderId })
        .setLock('pessimistic_write')
        .getOne();

      if (!order) {
        throw new Error('ORDER_NOT_FOUND');
      }

      // Idempotency: проверка ПОСЛЕ lock заказа, чтобы параллельные вебхуки с
      // одним event_id сериализовались (без гонки INSERT в UNIQUE "eventId").
      // Событие со статусом 'pending' означает, что webhook пришёл раньше
      // заказа (deferred): доставка ещё не производилась, поэтому его НЕ
      // считаем обработанным и продолжаем — иначе платёж был бы потерян.
      const existingEvent = await queryRunner.manager
        .getRepository(WebhookEvent)
        .findOne({ where: { eventId } });

      const alreadyHandled = existingEvent && existingEvent.status !== 'pending';
      if (alreadyHandled) {
        await queryRunner.commitTransaction();
        return this.attachKeyValue(order);
      }

      // Фиксируем событие один раз: insert для нового, update для отложенного
      // (pending-запись уже занимает уникальный eventId).
      const recordEvent = async (status: string) => {
        const repo = queryRunner.manager.getRepository(WebhookEvent);
        if (existingEvent) {
          await repo.update({ eventId }, { status, orderId });
        } else {
          await repo.save({ eventId, orderId, status });
        }
      };

      if (['delivered', 'out_of_stock', 'delivery_failed'].includes(order.status)) {
        await recordEvent('duplicate');
        await queryRunner.commitTransaction();
        return this.attachKeyValue(order);
      }

      if (order.status !== 'created' && order.status !== 'paid') {
        throw new Error(`Invalid status: ${order.status}`);
      }

      order.status = 'paid';
      await queryRunner.manager.save(order);

      await recordEvent('paid');

      const result = await this.deliverKey(order, queryRunner);
      await queryRunner.commitTransaction();
      return result;
    } catch (error) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async deliverKey(order: Order, queryRunner: QueryRunner): Promise<Order> {
    const lockedOrder = await queryRunner.manager
      .getRepository(Order)
      .createQueryBuilder()
      .where('id = :id', { id: order.id })
      .setLock('pessimistic_write')
      .getOne();

    if (!lockedOrder) {
      throw new Error('ORDER_NOT_FOUND');
    }

    if (lockedOrder.status === 'delivered') return lockedOrder;

    lockedOrder.status = 'delivering';
    lockedOrder.deliveryAttempts = (lockedOrder.deliveryAttempts || 0) + 1;
    await queryRunner.manager.save(lockedOrder);

    // Резервируем ровно ОДИН ключ товара: без LIMIT прежний массовый
    // UPDATE помечал весь пул свободных ключей одним заказом. FOR UPDATE
    // держит строку заблокированной до коммита, поэтому параллельный
    // заказ после ожидания перепроверит условие isUsed=false (Read
    // Committed) и возьмёт следующую свободную строку — ключ не выдаётся
    // дважды и не теряется.
    const key = await queryRunner.manager
      .getRepository(KeyPool)
      .createQueryBuilder('kp')
      .where('kp.productId = :productId AND kp.isUsed = :isUsed', {
        productId: order.productId,
        isUsed: false,
      })
      .orderBy('kp.id', 'ASC')
      .setLock('pessimistic_write')
      .getOne();

    if (!key) {
      lockedOrder.status = 'out_of_stock';
      await queryRunner.manager.save(lockedOrder);
      await queryRunner.manager
        .getRepository(DeliveryLog)
        .save({
          orderId: order.id,
          supplier: 'all',
          status: 'failed',
          errorMessage: 'No keys available',
        });
      return queryRunner.manager.findOne(Order, { where: { id: order.id } }) as Promise<Order>;
    }

    key.isUsed = true;
    key.assignedToOrderId = order.id;
    await queryRunner.manager.save(key);

    const supplierResult = await this.trySupplierDelivery(order, key.keyValue);

    if (supplierResult.success) {
      lockedOrder.status = 'delivered';
      lockedOrder.assignedKeyId = key.id;
      lockedOrder.deliveredAt = new Date();
      await queryRunner.manager.save(lockedOrder);
      await queryRunner.manager
        .getRepository(DeliveryLog)
        .save({
          orderId: order.id,
          supplier: supplierResult.supplier,
          requestId: supplierResult.requestId,
          status: 'success',
          keyValue: key.keyValue,
        });
    } else {
      lockedOrder.status = 'delivery_failed';
      lockedOrder.lastError = supplierResult.error || 'Unknown error';
      await queryRunner.manager.save(lockedOrder);
      await queryRunner.manager
        .getRepository(DeliveryLog)
        .save({
          orderId: order.id,
          supplier: supplierResult.supplier,
          requestId: supplierResult.requestId,
          status: 'failed',
          errorMessage: supplierResult.error,
        });
    }

    const freshOrder = (await queryRunner.manager.findOne(Order, {
      where: { id: order.id },
    })) as (Order & { assignedKeyValue?: string }) | null;
    if (supplierResult.success && freshOrder) {
      freshOrder.assignedKeyValue = key.keyValue;
    }
    return freshOrder as Order;
  }

  private async trySupplierDelivery(order: Order, keyValue: string): Promise<SupplierResult> {
    const suppliers = ['supplier_primary', 'supplier_fallback'];

    for (const supplier of suppliers) {
      const requestId = uuidv4();
      const success = Math.random() > 0.15;

      if (success) {
        return { success: true, supplier, requestId, keyValue };
      }

      await this.deliveryLogRepo.save({
        orderId: order.id,
        supplier,
        requestId,
        status: 'failed',
        errorMessage: 'Supplier error',
      });
    }

    return { success: false, supplier: 'all', requestId: uuidv4(), error: 'All suppliers failed' };
  }
}
