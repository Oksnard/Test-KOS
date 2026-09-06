import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class PromoCodeActionDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  productId?: number;
}
