import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Order } from '../../orders/entities/order.entity';

@ObjectType()
export class Customer {
  @Field(() => ID)
  customerId!: string;

  @Field()
  customerName!: string;

  @Field()
  cemail!: string;

  @Field()
  phone!: string;

  @Field()
  address!: string;

  @Field()
  city!: string;

  @Field()
  postalCode!: string;

  @Field()
  country!: string;

  @Field()
  creationDate!: Date;

  @Field()
  modificationDate!: Date;

  @Field(() => [Order])
  orders!: Order[];
}
