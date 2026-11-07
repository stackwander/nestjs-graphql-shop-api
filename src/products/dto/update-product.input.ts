import { IsUUID } from 'class-validator';
import { CreateProductInput } from './create-product.input';
import { InputType, Field, PartialType } from '@nestjs/graphql';

@InputType()
export class UpdateProductInput extends PartialType(CreateProductInput, {
  skipNullProperties: false,
}) {
  @Field(() => String)
  @IsUUID()
  productId!: string;
}
