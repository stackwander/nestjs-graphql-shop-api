import { ObjectType, Field, Int, ID } from '@nestjs/graphql';
import { DecimalScalar } from '../../common/decimal.scalar';

@ObjectType()
export class Product {
  @Field(() => ID)
  productId!: string;

  @Field()
  productName!: string;

  @Field()
  productvendor!: string;

  @Field()
  productDescription!: string;

  @Field(() => Int)
  quantityInStock!: number;

  @Field(() => DecimalScalar, { nullable: true })
  buyPrice!: string | null;

  @Field(() => DecimalScalar)
  msrp!: string;
}
