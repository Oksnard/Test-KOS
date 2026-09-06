import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity()
export class WebhookEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255, unique: true })
  eventId: string;

  @Column({ type: 'int' })
  orderId: number;

  @Column({ type: 'varchar', length: 50 })
  status: string;

  @Column({ type: 'jsonb', nullable: true })
  rawData: any;

  @CreateDateColumn()
  processedAt: Date;
}
