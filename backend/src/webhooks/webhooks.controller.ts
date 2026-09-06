import { Controller, Post, Body } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { PaymentWebhookDto } from './dto/payment-webhook.dto';

@Controller('api/webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('payment')
  // Валидация тела — на DTO (PaymentWebhookDto) и глобальном ValidationPipe:
  // невалидный webhook получает 400 BadRequest, а не молчаливый { error }.
  async handlePayment(@Body() body: PaymentWebhookDto) {
    const result = await this.webhooksService.handlePaymentWebhook(
      body.event_id,
      body.order_id,
      body.status,
    );

    return { received: true, ...result };
  }
}
