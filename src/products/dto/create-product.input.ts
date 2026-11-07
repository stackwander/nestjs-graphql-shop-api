import { InputType, Field, Int } from '@nestjs/graphql';
import { DecimalScalar } from '../../common/decimal.scalar';
import {
  IsNotEmpty,
  IsInt,
  Matches,
  IsString as IsDecimalString,
  IsString,
  Min,
} from 'class-validator';

@InputType() // GraphQL decorator
export class CreateProductInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  productName!: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  productvendor!: string;

  @Field()
  @IsString()
  productDescription!: string;

  @Field(() => Int)
  @IsNotEmpty()
  @IsInt()
  @Min(0)
  quantityInStock!: number;

  @Field(() => DecimalScalar)
  @IsDecimalString()
  @Matches(/^\d{1,8}(\.\d{1,2})?$/)
  buyPrice!: string;

  @Field(() => DecimalScalar)
  @IsDecimalString()
  @Matches(/^\d{1,8}(\.\d{1,2})?$/)
  msrp!: string;
}
