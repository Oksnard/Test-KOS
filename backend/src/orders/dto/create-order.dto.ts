import { Type } from 'class-transformer';
import { IsEmail, IsInt, IsIP, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';

export class CreateOrderDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  productId: number;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  userEmail?: string;

  @IsOptional()
  @IsIP()
  userIp?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  promoCode?: string;
}
