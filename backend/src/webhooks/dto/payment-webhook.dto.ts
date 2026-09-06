import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class PaymentWebhookDto {
  @IsString()
  @IsNotEmpty()
  event_id: string;

  @Type(() => Number)
  @IsInt()
  order_id: number;

  @IsIn(['paid', 'failed'])
  status: 'paid' | 'failed';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  timestamp?: string;
}
