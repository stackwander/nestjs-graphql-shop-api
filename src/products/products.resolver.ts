import { CurrentUser, Principal, Roles } from '../auth/auth.types';
import { DecimalScalar } from '../common/decimal.scalar';
import { PaginationArgs } from '../common/pagination.args';
import { ParseUUIDPipe } from '@nestjs/common';
import {
  Resolver,
  Query,
  Mutation,
  Args,
  ResolveField,
  Parent,
} from '@nestjs/graphql';
import { ProductService } from './products.service';
import { Product } from './entities/product.entity';
import { CreateProductInput } from './dto/create-product.input';
import { UpdateProductInput } from './dto/update-product.input';

@Resolver(() => Product)
export class ProductsResolver {
  constructor(private readonly productsService: ProductService) {}

  @Mutation(() => Product)
  createProduct(
    @Args('createProductInput') createProductInput: CreateProductInput,
  ) {
    return this.productsService.create(createProductInput);
  }

  @Roles('ADMIN', 'CUSTOMER')
  @Query(() => [Product], { name: 'products' })
  findAll(@Args() page: PaginationArgs) {
    return this.productsService.findAll(page);
  }

  @Roles('ADMIN', 'CUSTOMER')
  @Query(() => Product, { name: 'product' })
  findOne(@Args('id', { type: () => String }, new ParseUUIDPipe()) id: string) {
    return this.productsService.findOne(id);
  }

  @Mutation(() => Product)
  updateProduct(
    @Args('updateProductInput') updateProductInput: UpdateProductInput,
  ) {
    return this.productsService.update(updateProductInput);
  }

  @Mutation(() => Product)
  removeProduct(
    @Args('id', { type: () => String }, new ParseUUIDPipe()) id: string,
  ) {
    return this.productsService.remove(id);
  }
  @ResolveField(() => DecimalScalar, { nullable: true })
  buyPrice(@Parent() product: Product, @CurrentUser() user: Principal) {
    return user.role === 'ADMIN' ? product.buyPrice : null;
  }
}
