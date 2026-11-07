import { strict as assert } from 'assert';
import { randomUUID } from 'crypto';
import { spawnSync } from 'child_process';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../src/database/prisma.service';
import { OrdersService } from '../src/orders/orders.service';
import { Principal } from '../src/auth/auth.types';

async function main() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url || !/test/i.test(new URL(url).pathname))
    throw new Error(
      'Set TEST_DATABASE_URL to an isolated database whose name contains test.',
    );
  const migration = spawnSync(
    process.execPath,
    ['node_modules/prisma/build/index.js', 'migrate', 'deploy'],
    {
      env: { ...process.env, DATABASE_URL: url },
      stdio: 'pipe',
      encoding: 'utf8',
    },
  );
  if (migration.status !== 0)
    throw new Error(
      'Test database migration failed. Check that the isolated database is empty and reachable.',
    );
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  const service = new OrdersService(prisma as PrismaService);
  const customerIds: string[] = [randomUUID(), randomUUID()];
  const productIds: string[] = [randomUUID(), randomUUID()].sort();
  const user = (i: number): Principal => ({
    id: randomUUID(),
    role: 'CUSTOMER',
    customerId: customerIds[i],
  });
  try {
    for (const customerId of customerIds)
      await prisma.customer.create({
        data: {
          customerId,
          cemail: `${customerId}@example.com`,
          customerName: 'Integration test',
          phone: '+14155552671',
          address: 'Street',
          city: 'City',
          postalCode: '12345',
          country: 'US',
        },
      });
    for (let i = 0; i < productIds.length; i++)
      await prisma.product.create({
        data: {
          productId: productIds[i],
          productName: 'Test',
          productvendor: 'Test',
          productDescription: '',
          quantityInStock: i === 0 ? 1 : 0,
          buyPrice: '10.10',
          msrp: '19.95',
        },
      });
    const input = {
      comments: '',
      orderItems: [{ productId: productIds[0], quantity: 1 }],
    };
    const outcomes = await Promise.allSettled([
      service.create(input, user(0)),
      service.create(input, user(1)),
    ]);
    assert.equal(
      outcomes.filter((outcome) => outcome.status === 'fulfilled').length,
      1,
      'Exactly one competing reservation must succeed',
    );
    const winner = outcomes.find(
      (
        outcome,
      ): outcome is PromiseFulfilledResult<
        Awaited<ReturnType<OrdersService['create']>>
      > => outcome.status === 'fulfilled',
    )!.value;
    assert.equal(winner.total.toFixed(2), '19.95');
    assert.equal(
      (
        await prisma.product.findUniqueOrThrow({
          where: { productId: productIds[0] },
        })
      ).quantityInStock,
      0,
    );
    const owner = user(customerIds.indexOf(winner.customerId));
    const other = user(customerIds.indexOf(winner.customerId) === 0 ? 1 : 0);
    await assert.rejects(service.findOne(winner.orderId, other));
    await service.update(
      { orderId: winner.orderId, comments: 'Metadata only' },
      owner,
    );
    const item = await prisma.orderItem.findFirstOrThrow({
      where: { orderId: winner.orderId },
    });
    assert.equal(item.unitPrice.toFixed(2), '19.95');
    await service.remove(winner.orderId, owner);
    await service.remove(winner.orderId, owner);
    assert.equal(
      (
        await prisma.product.findUniqueOrThrow({
          where: { productId: productIds[0] },
        })
      ).quantityInStock,
      1,
    );
    // One item can reserve; the other fails. The entire transaction must roll back.
    await assert.rejects(
      service.create(
        {
          ...input,
          orderItems: productIds.map((productId) => ({
            productId,
            quantity: 1,
          })),
        },
        owner,
      ),
    );
    assert.equal(
      (
        await prisma.product.findUniqueOrThrow({
          where: { productId: productIds[0] },
        })
      ).quantityInStock,
      1,
    );
    assert.equal(
      await prisma.order.count({ where: { customerId: { in: customerIds } } }),
      1,
    );
    await assert.rejects(
      prisma.product.update({
        where: { productId: productIds[0] },
        data: { quantityInStock: -1 },
      }),
    );
    await assert.rejects(
      prisma.product.delete({ where: { productId: productIds[0] } }),
    );
    console.log(
      'Database checks passed: migrations, concurrent reservations, rollback, exact prices, ownership, idempotent cancellation, stock checks and foreign keys.',
    );
  } finally {
    await prisma.orderItem.deleteMany({
      where: { order: { customerId: { in: customerIds } } },
    });
    await prisma.order.deleteMany({
      where: { customerId: { in: customerIds } },
    });
    await prisma.customer.deleteMany({
      where: { customerId: { in: customerIds } },
    });
    await prisma.product.deleteMany({
      where: { productId: { in: productIds } },
    });
    await prisma.$disconnect();
  }
}
void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
