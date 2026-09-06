import { Controller, Get, Post, Param, Body, Query, ParseIntPipe, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminAuthGuard } from '../common/guards/admin-auth.guard';
import { AddKeysDto } from './dto/add-keys.dto';

@Controller('admin-api')
@UseGuards(AdminAuthGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  checkAuth() {
    return { ok: true };
  }

  @Get('orders')
  async getOrders(
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    // Невалидные limit/offset (NaN, <=0) не должны ронять запрос в 500.
    const numLimit = Number(limit);
    const parsedLimit = Number.isFinite(numLimit) && numLimit > 0 ? Math.floor(numLimit) : 50;
    const numOffset = Number(offset);
    const parsedOffset = Number.isFinite(numOffset) && numOffset >= 0 ? Math.floor(numOffset) : 0;
    return this.adminService.getOrders(parsedLimit, parsedOffset, status);
  }

  @Get('orders/:orderId')
  async getOrder(@Param('orderId', ParseIntPipe) orderId: number) {
    return this.adminService.getOrder(orderId);
  }

  @Post('orders/:orderId/deliver')
  async deliverOrder(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Body('key_value') keyValue?: string,
  ) {
    return this.adminService.deliverOrder(orderId, keyValue);
  }

  @Get('key-pool')
  async getKeyPool() {
    return this.adminService.getKeyPool();
  }

  @Post('key-pool')
  async addKeys(@Body() body: AddKeysDto) {
    const count = await this.adminService.addKeys(body.productId, body.keys);
    return { added: count, message: `${count} keys added` };
  }

  @Get('stats')
  async getStats() {
    return this.adminService.getStats();
  }
}
