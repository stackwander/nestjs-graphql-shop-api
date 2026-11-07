import { Type } from 'class-transformer';
import { Field, GraphQLISODateTime, InputType } from '@nestjs/graphql';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDate,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { OrderItemInput } from './create-orderitem.input';

@InputType()
export class CreateOrderInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @Field(() => GraphQLISODateTime, { nullable: true })
  @IsOptional()
  @IsDate()
  shippingDate?: Date | null;

  @Field({ defaultValue: '' })
  @IsString()
  @MaxLength(2000)
  comments!: string;

  @Field(() => [OrderItemInput])
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => OrderItemInput)
  orderItems!: OrderItemInput[];
}
