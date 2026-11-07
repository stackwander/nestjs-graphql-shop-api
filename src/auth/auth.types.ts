import {
  SetMetadata,
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';
import { GqlExecutionContext, ObjectType, Field } from '@nestjs/graphql';

export type Role = 'ADMIN' | 'CUSTOMER';
export interface Principal {
  id: string;
  role: Role;
  customerId: string | null;
}
export const Public = () => SetMetadata('public', true);
export const Roles = (...roles: Role[]) => SetMetadata('roles', roles);
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): Principal =>
    GqlExecutionContext.create(context).getContext().req.user,
);

@ObjectType()
export class AuthPayload {
  @Field() accessToken!: string;
}
