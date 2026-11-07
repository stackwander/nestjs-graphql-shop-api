import { Field, InputType, OmitType, PartialType } from '@nestjs/graphql';
import { IsUUID } from 'class-validator';
import { CreateOrderInput } from './create-order.input';

@InputType()
export class UpdateOrderInput extends PartialType(
  OmitType(CreateOrderInput, ['customerId'] as const),
  { skipNullProperties: false, omitDefaultValues: true },
) {
  @Field()
  @IsUUID()
  orderId!: string;
}
