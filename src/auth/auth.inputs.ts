import { Field, InputType } from '@nestjs/graphql';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { CreateCustomerInput } from '../customers/dto/create-customer.input';

@InputType()
export class RegisterInput extends CreateCustomerInput {
  @Field()
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password!: string;
}

@InputType()
export class LoginInput {
  @Field()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @Field()
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password!: string;
}
