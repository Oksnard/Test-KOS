import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Controller('api')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('orders')
  async createOrder(@Body() body: CreateOrderDto) {
    const order = await this.ordersService.createOrder(
      body.productId,
      body.userEmail,
      body.userIp,
      body.promoCode,
    );
    return { order, message: 'Order created' };
  }

  @Get('orders/:orderNumber')
  async getOrder(@Param('orderNumber') orderNumber: string) {
    const order = await this.ordersService.getOrder(orderNumber);
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  @Post('orders/:orderNumber/pay')
  @HttpCode(HttpStatus.OK)
  async payOrder(@Param('orderNumber') orderNumber: string) {
    const order = await this.ordersService.getOrder(orderNumber);
    if (!order) throw new NotFoundException('Order not found');
    const eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    const result = await this.ordersService.processPayment(order.id, eventId);
    return { order: result, message: 'Payment processed' };
  }
}
