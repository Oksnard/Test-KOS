import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { PromoCodesService } from './promo-codes.service';
import { PromoCodeActionDto } from './dto/promo-code.dto';

@Controller('api/promo-codes')
export class PromoCodesController {
  constructor(private readonly promoCodesService: PromoCodesService) {}

  @Get(':code')
  async findByCode(@Param('code') code: string) {
    return this.promoCodesService.findByCode(code);
  }

  @Post('validate')
  async validate(@Body() body: PromoCodeActionDto) {
    return this.promoCodesService.validate(body.code, body.productId);
  }

  @Post('apply')
  async apply(@Body() body: PromoCodeActionDto) {
    return this.promoCodesService.apply(body.code, body.productId);
  }
}
