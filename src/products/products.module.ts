import { Module } from '@nestjs/common';
import { ProductsResolver } from './products.resolver';

import { ProductService } from './products.service';

@Module({
  providers: [ProductsResolver, ProductService],
  //If we export a module then exported module is also accessible to using module
  //exports: [PrismaService],
})
export class ProductsModule {}
