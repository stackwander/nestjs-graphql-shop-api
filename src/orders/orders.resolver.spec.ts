import { Test } from '@nestjs/testing';
import { OrdersResolver } from './orders.resolver';
import { OrdersService } from './orders.service';

it('OrdersResolver delegates lists with pagination', async () => {
  const service = { findAll: jest.fn().mockReturnValue([]) };
  const module = await Test.createTestingModule({
    providers: [OrdersResolver, { provide: OrdersService, useValue: service }],
  }).compile();
  const resolver = module.get(OrdersResolver);
  const page = { take: 10, skip: 0 };
  resolver.findAll(page, {
    id: 'user',
    role: 'CUSTOMER',
    customerId: 'customer',
  });
  expect(service.findAll).toHaveBeenCalledWith(
    page,
    expect.objectContaining({ customerId: 'customer' }),
  );
  await module.close();
});
