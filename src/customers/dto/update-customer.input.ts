import { IsUUID } from 'class-validator';
import { CreateCustomerInput } from './create-customer.input';
import { InputType, Field, PartialType } from '@nestjs/graphql';

@InputType()
export class UpdateCustomerInput extends PartialType(CreateCustomerInput, {
  skipNullProperties: false,
}) {
  @Field(() => String)
  @IsUUID()
  customerId!: string;
}
