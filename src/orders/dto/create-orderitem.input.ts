import { Field, InputType, Int } from '@nestjs/graphql';
import { IsInt, IsUUID, Max, Min } from 'class-validator';

@InputType()
export class OrderItemInput {
  @Field()
  @IsUUID()
  productId!: string;

  @Field(() => Int)
  @IsInt()
  @Min(1)
  @Max(1000000)
  quantity!: number;
}
