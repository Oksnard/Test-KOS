import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Product } from './product.entity';

@Entity()
export class KeyPool {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  productId: number;

  @Column({ type: 'varchar', length: 500, unique: true })
  keyValue: string;

  @Column({ type: 'boolean', default: false })
  isUsed: boolean;

  @Column({ type: 'int', nullable: true })
  assignedToOrderId: number;

  @CreateDateColumn()
  createdAt: Date;
}
