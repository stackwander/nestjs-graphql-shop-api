import { ParseUUIDPipe } from '@nestjs/common';
import {
  Resolver,
  Query,
  Mutation,
  Args,
  ResolveField,
  Parent,
} from '@nestjs/graphql';
import { CurrentUser, Principal, Roles } from '../auth/auth.types';
import { PaginationArgs } from '../common/pagination.args';
import { Customer } from '../customers/entities/customer.entity';
import { OrderItem } from './entities/order-item.entity';
import { OrdersService } from './orders.service';
import { Order } from './entities/order.entity';
import { CreateOrderInput } from './dto/create-order.input';
import { UpdateOrderInput } from './dto/update-order.input';

@Roles('ADMIN', 'CUSTOMER')
@Resolver(() => Order)
export class OrdersResolver {
  constructor(private readonly ordersService: OrdersService) {}
  @Mutation(() => Order)
  createOrder(
    @Args('createOrderInput') input: CreateOrderInput,
    @CurrentUser() user: Principal,
  ) {
    return this.ordersService.create(input, user);
  }
  @Query(() => [Order], { name: 'orders' })
  findAll(@Args() page: PaginationArgs, @CurrentUser() user: Principal) {
    return this.ordersService.findAll(page, user);
  }
  @Query(() => Order, { name: 'order' })
  findOne(
    @Args('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: Principal,
  ) {
    return this.ordersService.findOne(id, user);
  }
  @Mutation(() => Order)
  updateOrder(
    @Args('updateOrderInput') input: UpdateOrderInput,
    @CurrentUser() user: Principal,
  ) {
    return this.ordersService.update(input, user);
  }
  @Mutation(() => Order, {
    deprecationReason: 'Use cancelOrder; order history is retained.',
  })
  removeOrder(
    @Args('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: Principal,
  ) {
    return this.ordersService.remove(id, user);
  }
  @Mutation(() => Order)
  cancelOrder(
    @Args('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: Principal,
  ) {
    return this.ordersService.remove(id, user);
  }
  @Roles('ADMIN')
  @Mutation(() => Order)
  setOrderPaid(
    @Args('id', new ParseUUIDPipe()) id: string,
    @Args('paid') paid: boolean,
  ) {
    return this.ordersService.setPaid(id, paid);
  }
  @ResolveField(() => Customer)
  customer(@Parent() order: Order) {
    return this.ordersService.customer(order.customerId);
  }
  @ResolveField(() => [OrderItem])
  orderItems(@Parent() order: Order, @Args() page: PaginationArgs) {
    return order.orderItems
      ? order.orderItems.slice(page.skip, page.skip + page.take)
      : this.ordersService.items(order.orderId, page);
  }
}

@Resolver(() => OrderItem)
export class OrderItemsResolver {
  constructor(private readonly ordersService: OrdersService) {}
  @ResolveField(() => Order)
  order(@Parent() item: OrderItem, @CurrentUser() user: Principal) {
    return this.ordersService.findOne(item.orderId, user);
  }
}
