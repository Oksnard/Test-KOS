import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
  },
  namespace: 'showroom',
  path: '/showroom/',
})
export class ShowroomGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ShowroomGateway.name);

  private clientCount = 0;

  handleConnection(client: Socket) {
    this.clientCount++;
    this.logger.log(`Client connected (${this.clientCount} total). ID: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.clientCount--;
    this.logger.log(`Client disconnected (${this.clientCount} total). ID: ${client.id}`);
  }

  @SubscribeMessage('subscribe_product')
  handleSubscribe(client: Socket, productId: number) {
    this.logger.log(`Client ${client.id} subscribed to product ${productId}`);
    client.data.productId = productId;
  }

  /**
   * Эмитнуть обновление товара всем подписчикам.
   */
  emitProductUpdated(product: any, availableKeys: number) {
    this.server.emit('product_updated', {
      productId: product.id,
      name: product.name,
      price: product.price,
      availableKeys,
      isOutOfStock: availableKeys === 0,
      timestamp: Date.now(),
    });
  }

  /**
   * Эмитнуть событие "товар закончился" для конкретного товара.
   */
  emitOutOfStock(productId: number) {
    this.server.emit('out_of_stock', {
      productId,
      timestamp: Date.now(),
    });
  }

  /**
   * Эмитнуть обновление бронирования (таймер, снятие брони).
   */
  emitBookingUpdate(booking: any) {
    this.server.emit('booking_update', {
      orderId: booking.orderId,
      expiresAt: booking.expiresAt,
      remainingMs: booking.remainingMs,
      status: booking.status,
      timestamp: Date.now(),
    });
  }

  /**
   * Эмитнуть освобождение товара (бронь истекла, товар вернулся в продажу).
   */
  emitProductRestocked(productId: number, availableKeys: number) {
    this.server.emit('product_restocked', {
      productId,
      availableKeys,
      timestamp: Date.now(),
    });
  }
}
