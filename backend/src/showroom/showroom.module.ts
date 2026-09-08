import { Module, Global } from '@nestjs/common';
import { ShowroomGateway } from '../products/products.gateway';

@Global()
@Module({
  providers: [ShowroomGateway],
  exports: [ShowroomGateway],
})
export class ShowroomModule {
  static get ShowroomGateway() {
    return ShowroomGateway;
  }
}

// Re-export for easier importing
export { ShowroomGateway };
