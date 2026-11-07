import { PrismaService } from '../database/prisma.service';
import { ProductService } from './products.service';

it('paginates products with a stable order', () => {
  const prisma = { product: { findMany: jest.fn() } };
  new ProductService(prisma as unknown as PrismaService).findAll({
    take: 10,
    skip: 20,
  });
  expect(prisma.product.findMany).toHaveBeenCalledWith({
    take: 10,
    skip: 20,
    orderBy: { productId: 'asc' },
  });
});
