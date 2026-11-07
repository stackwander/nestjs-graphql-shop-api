import { Test } from '@nestjs/testing';
import { ProductsResolver } from './products.resolver';
import { ProductService } from './products.service';

it('ProductsResolver delegates lists with pagination', async () => {
  const service = { findAll: jest.fn().mockReturnValue([]) };
  const module = await Test.createTestingModule({
    providers: [
      ProductsResolver,
      { provide: ProductService, useValue: service },
    ],
  }).compile();
  const resolver = module.get(ProductsResolver);
  const page = { take: 10, skip: 0 };
  resolver.findAll(page);
  expect(service.findAll).toHaveBeenCalledWith(page);
  await module.close();
});
