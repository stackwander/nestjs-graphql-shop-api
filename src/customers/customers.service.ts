import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Principal } from '../auth/auth.types';
import { assertCustomerAccess } from '../common/access';
import { PaginationArgs } from '../common/pagination.args';
import { CreateCustomerInput } from './dto/create-customer.input';
import { UpdateCustomerInput } from './dto/update-customer.input';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}
  create(data: CreateCustomerInput) {
    return this.prisma.customer.create({ data });
  }
  findAll(page: PaginationArgs) {
    return this.prisma.customer.findMany({
      ...page,
      orderBy: { customerId: 'asc' },
    });
  }
  findOne(customerId: string, user: Principal) {
    assertCustomerAccess(user, customerId);
    return this.prisma.customer.findUniqueOrThrow({ where: { customerId } });
  }
  update({ customerId, ...data }: UpdateCustomerInput, user: Principal) {
    assertCustomerAccess(user, customerId);
    return this.prisma.customer.update({ where: { customerId }, data });
  }
  remove(customerId: string) {
    return this.prisma.customer.delete({ where: { customerId } });
  }
  orders(customerId: string, page: PaginationArgs) {
    return this.prisma.order.findMany({
      where: { customerId },
      ...page,
      orderBy: [{ orderDate: 'desc' }, { orderId: 'asc' }],
    });
  }
}
