import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsInt, IsPositive, IsString } from 'class-validator';

export class AddKeysDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  productId: number;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  keys: string[];
}
