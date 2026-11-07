import { Test } from '@nestjs/testing';
import { CustomersResolver } from './customers.resolver';
import { CustomersService } from './customers.service';

it('CustomersResolver delegates lists with pagination', async () => {
  const service = { findAll: jest.fn().mockReturnValue([]) };
  const module = await Test.createTestingModule({
    providers: [
      CustomersResolver,
      { provide: CustomersService, useValue: service },
    ],
  }).compile();
  const resolver = module.get(CustomersResolver);
  const page = { take: 10, skip: 0 };
  resolver.findAll(page);
  expect(service.findAll).toHaveBeenCalledWith(page);
  await module.close();
});
