import { Transform } from 'class-transformer';
import { InputType, Field } from '@nestjs/graphql';
import {
  IsNotEmpty,
  IsString,
  IsEmail,
  IsPhoneNumber,
  MaxLength,
} from 'class-validator';

@InputType()
export class CreateCustomerInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  customerName!: string;

  @Field()
  @IsNotEmpty()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @MaxLength(254)
  @IsEmail()
  cemail!: string;

  @Field()
  @IsNotEmpty()
  @IsPhoneNumber() // You can specify a region code if needed
  phone!: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  address!: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  city!: string;

  @Field()
  @IsNotEmpty()
  @MaxLength(20) // You can specify a locale if needed
  postalCode!: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  country!: string;
}
