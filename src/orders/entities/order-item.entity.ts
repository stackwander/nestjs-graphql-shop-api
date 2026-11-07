import type { Relation } from '../../common/relation';
import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import { DecimalScalar } from '../../common/decimal.scalar';
import { Order } from './order.entity';

@ObjectType()
export class OrderItem {
  @Field(() => ID)
  orderItemId!: string;

  @Field()
  productId!: string;

  @Field()
  productName!: string;

  @Field(() => Int)
  quantity!: number;

  @Field(() => DecimalScalar)
  unitPrice!: string;

  @Field(() => Order)
  order!: Relation<Order>;

  @Field()
  orderId!: string;
}
