import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Product } from '../../database/entities/product.entity';
import { Order } from '../../database/entities/order.entity';

/**
 * Бронирование товара на время оформления заказа.
 * Когда покупатель нажимает "Купить", товар резервируется
 * на 300 секунд (5 минут). Если оплата не пришла — бронь снимается,
 * товар снова доступен.
 */
@Entity()
@Index(['orderId'], { unique: true })
export class Booking {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  orderId: number;

  @Column({ type: 'int' })
  productId: number;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'productId' })
  product?: Product;

  @ManyToOne(() => Order)
  @JoinColumn({ name: 'orderId' })
  order?: Order;

  /** Момент истечения брони (UTC). */
  @Column({ type: 'timestamp' })
  expiresAt: Date;

  /** Текущий статус брони. */
  @Column({ type: 'varchar', length: 30, default: 'active' })
  status: string; // 'active' | 'confirmed' | 'expired' | 'cancelled'

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
