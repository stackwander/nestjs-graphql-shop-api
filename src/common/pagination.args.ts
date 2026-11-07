import { ArgsType, Field, Int } from '@nestjs/graphql';
import { IsInt, Max, Min } from 'class-validator';

@ArgsType()
export class PaginationArgs {
  @Field(() => Int, { defaultValue: 20 })
  @IsInt()
  @Min(1)
  @Max(100)
  take = 20;

  @Field(() => Int, { defaultValue: 0 })
  @IsInt()
  @Min(0)
  @Max(100000)
  skip = 0;
}
