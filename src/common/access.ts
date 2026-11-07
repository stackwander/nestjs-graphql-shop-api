import { ForbiddenException } from '@nestjs/common';
import { Principal } from '../auth/auth.types';

export function customerScope(user: Principal) {
  if (user.role === 'ADMIN') return {};
  if (!user.customerId)
    throw new ForbiddenException('A customer profile is required.');
  return { customerId: user.customerId };
}

export function assertCustomerAccess(user: Principal, customerId: string) {
  if (user.role !== 'ADMIN' && user.customerId !== customerId)
    throw new ForbiddenException('This profile belongs to another account.');
}
