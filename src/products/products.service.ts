import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { PaginationArgs } from '../common/pagination.args';
import { CreateProductInput } from './dto/create-product.input';
import { UpdateProductInput } from './dto/update-product.input';

@Injectable()
export class ProductService {
  constructor(private readonly prisma: PrismaService) {}
  create(data: CreateProductInput) {
    return this.prisma.product.create({ data });
  }
  findAll(page: PaginationArgs) {
    return this.prisma.product.findMany({
      ...page,
      orderBy: { productId: 'asc' },
    });
  }
  findOne(productId: string) {
    return this.prisma.product.findUniqueOrThrow({ where: { productId } });
  }
  update({ productId, ...data }: UpdateProductInput) {
    return this.prisma.product.update({ where: { productId }, data });
  }
  remove(productId: string) {
    return this.prisma.product.delete({ where: { productId } });
  }
}
