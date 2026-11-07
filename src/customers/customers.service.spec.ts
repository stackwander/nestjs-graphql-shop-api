import { ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CustomersService } from './customers.service';

it('rejects reading or updating another customer profile before querying the database', () => {
  const prisma = {
    customer: { findUniqueOrThrow: jest.fn(), update: jest.fn() },
  };
  const service = new CustomersService(prisma as unknown as PrismaService);
  const user = { id: 'user', role: 'CUSTOMER' as const, customerId: 'own' };
  expect(() => service.findOne('other', user)).toThrow(ForbiddenException);
  expect(() =>
    service.update({ customerId: 'other', city: 'Lahore' }, user),
  ).toThrow(ForbiddenException);
  expect(prisma.customer.update).not.toHaveBeenCalled();
});
