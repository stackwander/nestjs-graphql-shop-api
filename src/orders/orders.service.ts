import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { Principal } from '../auth/auth.types';
import { assertCustomerAccess, customerScope } from '../common/access';
import { PaginationArgs } from '../common/pagination.args';
import { CreateOrderInput } from './dto/create-order.input';
import { OrderItemInput } from './dto/create-orderitem.input';
import { UpdateOrderInput } from './dto/update-order.input';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  private async transaction<T>(
    run: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await this.prisma.$transaction(run, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });
      } catch (error) {
        if (
          !(error instanceof Prisma.PrismaClientKnownRequestError) ||
          error.code !== 'P2034'
        )
          throw error;
      }
    }
    throw new ConflictException(
      'Concurrent order changes detected. Please retry.',
    );
  }

  private async reserveItems(
    tx: Prisma.TransactionClient,
    input: OrderItemInput[],
    previous: { productId: string; unitPrice: Prisma.Decimal }[] = [],
  ) {
    if (
      !input.length ||
      input.length > 100 ||
      new Set(input.map((i) => i.productId)).size !== input.length
    ) {
      throw new BadRequestException('Provide 1-100 distinct products.');
    }
    const items: {
      productId: string;
      productName: string;
      quantity: number;
      unitPrice: Prisma.Decimal;
    }[] = [];
    let total = new Prisma.Decimal(0);
    for (const item of [...input].sort((a, b) =>
      a.productId.localeCompare(b.productId),
    )) {
      if (
        !Number.isInteger(item.quantity) ||
        item.quantity < 1 ||
        item.quantity > 1000000
      )
        throw new BadRequestException('Invalid quantity.');
      const product = await tx.product.findUniqueOrThrow({
        where: { productId: item.productId },
      });
      const reserved = await tx.product.updateMany({
        where: {
          productId: item.productId,
          quantityInStock: { gte: item.quantity },
        },
        data: { quantityInStock: { decrement: item.quantity } },
      });
      if (reserved.count !== 1)
        throw new ConflictException(
          `Insufficient stock for product ${item.productId}.`,
        );
      const unitPrice =
        previous.find((p) => p.productId === item.productId)?.unitPrice ??
        product.msrp;
      total = total.plus(unitPrice.times(item.quantity));
      items.push({
        productId: item.productId,
        productName: product.productName,
        quantity: item.quantity,
        unitPrice,
      });
    }
    if (total.greaterThan('99999999.99'))
      throw new BadRequestException(
        'Order total exceeds the supported amount.',
      );
    return { items, total };
  }

  private async restoreItems(
    tx: Prisma.TransactionClient,
    items: { productId: string; quantity: number }[],
  ) {
    for (const item of [...items].sort((a, b) =>
      a.productId.localeCompare(b.productId),
    )) {
      await tx.product.update({
        where: { productId: item.productId },
        data: { quantityInStock: { increment: item.quantity } },
      });
    }
  }

  create(input: CreateOrderInput, user: Principal) {
    const customerId = input.customerId ?? user.customerId;
    if (!customerId)
      throw new BadRequestException(
        'customerId is required for administrator orders.',
      );
    assertCustomerAccess(user, customerId);
    return this.transaction(async (tx) => {
      await tx.customer.findUniqueOrThrow({ where: { customerId } });
      const { items, total } = await this.reserveItems(tx, input.orderItems);
      return tx.order.create({
        data: {
          customerId,
          shippingDate: input.shippingDate,
          comments: input.comments ?? '',
          status: 'PENDING',
          paid: false,
          total,
          orderItems: { create: items },
        },
      });
    });
  }

  findAll(page: PaginationArgs, user: Principal) {
    return this.prisma.order.findMany({
      ...page,
      where: customerScope(user),
      orderBy: [{ orderDate: 'desc' }, { orderId: 'asc' }],
    });
  }
  findOne(orderId: string, user: Principal) {
    return this.prisma.order.findFirstOrThrow({
      where: { orderId, ...customerScope(user) },
    });
  }

  update(input: UpdateOrderInput, user: Principal) {
    return this.transaction(async (tx) => {
      const order = await tx.order.findFirstOrThrow({
        where: { orderId: input.orderId, ...customerScope(user) },
        include: { orderItems: true },
      });
      if (order.paid || order.status === 'CANCELLED')
        throw new ConflictException(
          'Paid or cancelled orders cannot be edited.',
        );
      let replacement:
        Awaited<ReturnType<OrdersService['reserveItems']>> | undefined;
      if (input.orderItems !== undefined) {
        if (input.orderItems === null)
          throw new BadRequestException('orderItems cannot be null.');
        await this.restoreItems(tx, order.orderItems);
        replacement = await this.reserveItems(
          tx,
          input.orderItems,
          order.orderItems,
        );
        await tx.orderItem.deleteMany({ where: { orderId: order.orderId } });
      }
      return tx.order.update({
        where: { orderId: order.orderId },
        data: {
          comments: input.comments ?? undefined,
          shippingDate: input.shippingDate,
          ...(replacement
            ? {
                total: replacement.total,
                orderItems: { create: replacement.items },
              }
            : {}),
        },
      });
    });
  }

  remove(orderId: string, user: Principal) {
    return this.transaction(async (tx) => {
      const order = await tx.order.findFirstOrThrow({
        where: { orderId, ...customerScope(user) },
        include: { orderItems: true },
      });
      if (order.paid)
        throw new ConflictException(
          'Paid orders require a refund before cancellation.',
        );
      if (order.status === 'CANCELLED') return order;
      await this.restoreItems(tx, order.orderItems);
      return tx.order.update({
        where: { orderId },
        data: { status: 'CANCELLED' },
      });
    });
  }

  setPaid(orderId: string, paid: boolean) {
    return this.transaction(async (tx) => {
      const order = await tx.order.findUniqueOrThrow({ where: { orderId } });
      if (order.status === 'CANCELLED')
        throw new ConflictException('Cancelled orders cannot be paid.');
      return tx.order.update({
        where: { orderId },
        data: { paid, status: paid ? 'PAID' : 'PENDING' },
      });
    });
  }
  customer(customerId: string) {
    return this.prisma.customer.findUniqueOrThrow({ where: { customerId } });
  }
  items(orderId: string, page: PaginationArgs) {
    return this.prisma.orderItem.findMany({
      where: { orderId },
      ...page,
      orderBy: { orderItemId: 'asc' },
    });
  }
}
