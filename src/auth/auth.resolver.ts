import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginInput, RegisterInput } from './auth.inputs';
import { AuthPayload, Public } from './auth.types';

@Resolver()
export class AuthResolver {
  constructor(private readonly auth: AuthService) {}
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Public()
  @Mutation(() => AuthPayload)
  register(@Args('input') input: RegisterInput) {
    return this.auth.register(input);
  }
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Public()
  @Mutation(() => AuthPayload)
  login(@Args('input') input: LoginInput) {
    return this.auth.login(input);
  }
}
