import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { Principal } from '../auth/auth.types';
import { OrdersService } from './orders.service';

const user: Principal = {
  id: 'user',
  role: 'CUSTOMER',
  customerId: 'customer',
};
describe('OrdersService integrity', () => {
  let service: OrdersService;
  let tx: any;
  let prisma: any;
  beforeEach(() => {
    tx = {
      customer: { findUniqueOrThrow: jest.fn().mockResolvedValue({}) },
      product: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          productName: 'Widget',
          msrp: new Prisma.Decimal('19.95'),
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn().mockResolvedValue({}),
      },
      order: {
        create: jest.fn().mockImplementation(({ data }) => data),
        findFirstOrThrow: jest.fn().mockResolvedValue({
          orderId: 'order',
          paid: false,
          status: 'PENDING',
          orderItems: [],
        }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          orderId: 'order',
          paid: false,
          status: 'PENDING',
        }),
        update: jest.fn().mockImplementation(({ data }) => data),
      },
      orderItem: { deleteMany: jest.fn() },
    };
    prisma = {
      $transaction: jest.fn().mockImplementation((run) => run(tx)),
      order: { findMany: jest.fn(), findFirstOrThrow: jest.fn() },
    };
    service = new OrdersService(prisma as PrismaService);
  });
  const input = () => ({
    comments: '',
    orderItems: [{ productId: 'product', quantity: 3 }],
  });
  it('derives exact totals, names, prices and payment state from server data', async () => {
    const order: any = await service.create(input(), user);
    expect(order.total.toFixed(2)).toBe('59.85');
    expect(order.paid).toBe(false);
    expect(order.status).toBe('PENDING');
    expect(order.orderItems.create[0]).toMatchObject({
      productName: 'Widget',
      quantity: 3,
    });
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: 'Serializable',
    });
    expect(tx.product.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { productId: 'product', quantityInStock: { gte: 3 } },
      }),
    );
  });
  it('rejects ordering for another customer before writing', () => {
    expect(() =>
      service.create({ ...input(), customerId: 'other' }, user),
    ).toThrow(ForbiddenException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
  it('does not create orders when stock is insufficient', async () => {
    tx.product.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.create(input(), user)).rejects.toThrow(
      ConflictException,
    );
    expect(tx.order.create).not.toHaveBeenCalled();
  });
  it('rejects duplicate products and invalid quantities', async () => {
    await expect(
      service.create(
        {
          ...input(),
          orderItems: [...input().orderItems, ...input().orderItems],
        },
        user,
      ),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.create(
        { ...input(), orderItems: [{ productId: 'product', quantity: -1 }] },
        user,
      ),
    ).rejects.toThrow(BadRequestException);
  });
  it('allows partial updates without orderItems and does not overwrite total or comments', async () => {
    await service.update({ orderId: 'order' }, user);
    expect(tx.orderItem.deleteMany).not.toHaveBeenCalled();
    expect(tx.order.update).toHaveBeenCalledWith({
      where: { orderId: 'order' },
      data: { comments: undefined, shippingDate: undefined },
    });
    expect(tx.order.findFirstOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { orderId: 'order', customerId: 'customer' },
      }),
    );
  });
  it('retains existing unit prices when replacing items and restores previous reservations', async () => {
    tx.order.findFirstOrThrow.mockResolvedValue({
      orderId: 'order',
      paid: false,
      status: 'PENDING',
      orderItems: [
        {
          productId: 'product',
          quantity: 1,
          unitPrice: new Prisma.Decimal('10.10'),
        },
      ],
    });
    const result: any = await service.update(
      { orderId: 'order', orderItems: [{ productId: 'product', quantity: 2 }] },
      user,
    );
    expect(result.total.toFixed(2)).toBe('20.20');
    expect(tx.product.update).toHaveBeenCalledWith({
      where: { productId: 'product' },
      data: { quantityInStock: { increment: 1 } },
    });
  });
  it('rejects edits and cancellations of paid orders', async () => {
    tx.order.findFirstOrThrow.mockResolvedValue({
      orderId: 'order',
      paid: true,
    });
    await expect(service.update({ orderId: 'order' }, user)).rejects.toThrow(
      ConflictException,
    );
    await expect(service.remove('order', user)).rejects.toThrow(
      ConflictException,
    );
  });
  it('cancels once, retaining history and restoring inventory', async () => {
    tx.order.findFirstOrThrow.mockResolvedValue({
      orderId: 'order',
      paid: false,
      status: 'PENDING',
      orderItems: [{ productId: 'product', quantity: 2 }],
    });
    await service.remove('order', user);
    expect(tx.product.update).toHaveBeenCalledTimes(1);
    expect(tx.order.update).toHaveBeenCalledWith({
      where: { orderId: 'order' },
      data: { status: 'CANCELLED' },
    });
    tx.order.findFirstOrThrow.mockResolvedValue({
      orderId: 'order',
      paid: false,
      status: 'CANCELLED',
    });
    await service.remove('order', user);
    expect(tx.product.update).toHaveBeenCalledTimes(1);
  });
  it('never marks cancelled orders as paid', async () => {
    tx.order.findUniqueOrThrow.mockResolvedValue({ status: 'CANCELLED' });
    await expect(service.setPaid('order', true)).rejects.toThrow(
      ConflictException,
    );
    expect(tx.order.update).not.toHaveBeenCalled();
  });
  it('retries serializable conflicts but stops after three attempts', async () => {
    const conflict = new Prisma.PrismaClientKnownRequestError('conflict', {
      code: 'P2034',
      clientVersion: '5.22.0',
    });
    prisma.$transaction.mockRejectedValue(conflict);
    await expect(service.create(input(), user)).rejects.toThrow(
      ConflictException,
    );
    expect(prisma.$transaction).toHaveBeenCalledTimes(3);
  });
  it('scopes order listings to the authenticated customer', () => {
    service.findAll({ take: 10, skip: 0 }, user);
    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { customerId: 'customer' }, take: 10 }),
    );
  });
});
