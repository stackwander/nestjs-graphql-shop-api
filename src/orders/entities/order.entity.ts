import type { Relation } from '../../common/relation';
import { ObjectType, Field, ID } from '@nestjs/graphql';
import { OrderItem } from './order-item.entity';
import { DecimalScalar } from '../../common/decimal.scalar';
import { Customer } from '../../customers/entities/customer.entity';

@ObjectType()
export class Order {
  @Field(() => ID)
  orderId!: string;

  @Field()
  orderDate!: Date;

  @Field()
  customerId!: string;

  @Field(() => Customer)
  customer!: Relation<Customer>;

  @Field(() => Date, { nullable: true })
  shippingDate!: Date | null;

  @Field()
  status!: string;

  @Field({ nullable: true })
  comments?: string;

  @Field(() => DecimalScalar)
  total!: string;

  @Field(() => [OrderItem])
  orderItems!: OrderItem[];

  @Field()
  paid!: boolean;
}
