import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Product } from './product.entity';

@Entity()
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  orderNumber: string;

  @Column({ type: 'int' })
  productId: number;

  @ManyToOne(() => Product, { nullable: false })
  @JoinColumn({ name: 'productId' })
  product?: Product;

  @Column({ type: 'varchar', length: 255, nullable: true })
  userEmail: string;

  @Column({ type: 'varchar', length: 45, nullable: true })
  userIp: string;

  @Column({ type: 'varchar', length: 50, default: 'created' })
  status: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  originalPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  discountAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  finalPrice: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  promoCode: string | null;

  @Column({ type: 'int', nullable: true })
  assignedKeyId: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  eventId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  requestId: string;

  @Column({ type: 'int', default: 0 })
  deliveryAttempts: number;

  @Column({ type: 'text', nullable: true })
  lastError: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  deliveredAt: Date;
}
