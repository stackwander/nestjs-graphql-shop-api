import { NotFoundException, ParseUUIDPipe } from '@nestjs/common';
import {
  Resolver,
  Query,
  Mutation,
  Args,
  ResolveField,
  Parent,
} from '@nestjs/graphql';
import { CurrentUser, Principal, Roles } from '../auth/auth.types';
import { PaginationArgs } from '../common/pagination.args';
import { Order } from '../orders/entities/order.entity';
import { CustomersService } from './customers.service';
import { Customer } from './entities/customer.entity';
import { CreateCustomerInput } from './dto/create-customer.input';
import { UpdateCustomerInput } from './dto/update-customer.input';

@Resolver(() => Customer)
export class CustomersResolver {
  constructor(private readonly customersService: CustomersService) {}
  @Mutation(() => Customer)
  createCustomer(@Args('createCustomerInput') input: CreateCustomerInput) {
    return this.customersService.create(input);
  }
  @Query(() => [Customer], { name: 'customers' })
  findAll(@Args() page: PaginationArgs) {
    return this.customersService.findAll(page);
  }
  @Roles('ADMIN', 'CUSTOMER')
  @Query(() => Customer, { name: 'customer' })
  findOne(
    @Args('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: Principal,
  ) {
    return this.customersService.findOne(id, user);
  }
  @Roles('ADMIN', 'CUSTOMER')
  @Query(() => Customer)
  me(@CurrentUser() user: Principal) {
    if (!user.customerId)
      throw new NotFoundException('This account has no customer profile.');
    return this.customersService.findOne(user.customerId, user);
  }
  @Roles('ADMIN', 'CUSTOMER')
  @Mutation(() => Customer)
  updateCustomer(
    @Args('updateCustomerInput') input: UpdateCustomerInput,
    @CurrentUser() user: Principal,
  ) {
    return this.customersService.update(input, user);
  }
  @Mutation(() => Customer)
  removeCustomer(@Args('id', new ParseUUIDPipe()) id: string) {
    return this.customersService.remove(id);
  }
  @ResolveField(() => [Order])
  orders(@Parent() customer: Customer, @Args() page: PaginationArgs) {
    return this.customersService.orders(customer.customerId, page);
  }
}
