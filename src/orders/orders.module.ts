import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersResolver, OrderItemsResolver } from './orders.resolver';

@Module({
  providers: [OrdersResolver, OrderItemsResolver, OrdersService],
})
export class OrdersModule {}
