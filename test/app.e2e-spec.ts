import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../src/database/prisma.service';
import { Prisma } from '@prisma/client';
import request from 'supertest';
import { hashPassword } from '../src/auth/password';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/common/configure-app';

const customerId = 'b2f8dc4f-c533-4cef-8d2f-9a73ce69bb11';
const otherId = 'e2f8dc4f-c533-4cef-8d2f-9a73ce69bb12';
const productId = 'a2f8dc4f-c533-4cef-8d2f-9a73ce69bb13';
describe('GraphQL API', () => {
  let app: INestApplication;
  let token: string;
  let admin: string;
  const prisma = {
    user: { findUnique: jest.fn(), create: jest.fn() },
    customer: { findUniqueOrThrow: jest.fn(), findMany: jest.fn() },
    product: { findMany: jest.fn(), create: jest.fn() },
    order: { findMany: jest.fn(), findFirstOrThrow: jest.fn() },
    orderItem: { findMany: jest.fn() },
  };
  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-only-secret-that-is-at-least-32-bytes';
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();
    app = module.createNestApplication();
    configureApp(app);
    await app.init();
    const jwt = module.get(JwtService);
    token = await jwt.signAsync({ sub: 'customer-user' });
    admin = await jwt.signAsync({ sub: 'admin-user' });
  });
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.user.findUnique.mockImplementation(async ({ where }) =>
      where.id
        ? {
            id: where.id,
            role: where.id === 'admin-user' ? 'ADMIN' : 'CUSTOMER',
            customerId: where.id === 'admin-user' ? null : customerId,
          }
        : null,
    );
    prisma.product.findMany.mockResolvedValue([
      {
        productId,
        productName: 'Widget',
        buyPrice: new Prisma.Decimal('9.95'),
        msrp: new Prisma.Decimal('19.95'),
      },
    ]);
    prisma.order.findMany.mockResolvedValue([
      { orderId: 'order', customerId, total: new Prisma.Decimal('39.90') },
    ]);
    prisma.orderItem.findMany.mockResolvedValue([
      {
        orderItemId: 'item',
        orderId: 'order',
        productId,
        quantity: 2,
        unitPrice: new Prisma.Decimal('19.95'),
      },
    ]);
    prisma.order.findFirstOrThrow.mockResolvedValue({
      orderId: 'order',
      customerId,
      total: new Prisma.Decimal('39.90'),
    });
    prisma.customer.findUniqueOrThrow.mockResolvedValue({
      customerId,
      customerName: 'Test',
    });
  });
  afterAll(async () => {
    await app.close();
  });
  const query = (text: string, auth = token, variables?: object) =>
    request(app.getHttpServer())
      .post('/graphql')
      .set('Authorization', auth ? `Bearer ${auth}` : '')
      .send({ query: text, variables });
  it('rejects anonymous product access', async () => {
    const { body } = await query('{ products { productId } }', '');
    expect(body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
    expect(prisma.product.findMany).not.toHaveBeenCalled();
  });
  it('serializes exact prices and hides purchase costs from customers', async () => {
    const { body } = await query('{ products(take: 2) { msrp buyPrice } }');
    expect(body.errors).toBeUndefined();
    expect(body.data.products).toEqual([{ msrp: '19.95', buyPrice: null }]);
    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 2 }),
    );
    const response = await query('{ products { buyPrice } }', admin);
    expect(response.body.data.products[0].buyPrice).toBe('9.95');
  });
  it('forbids customer product mutations and payment updates', async () => {
    const { body } = await query(
      `mutation { setOrderPaid(id: "${customerId}", paid: true) { paid } }`,
    );
    expect(body.errors[0].extensions.code).toBe('FORBIDDEN');
  });
  it('rejects cross-account customer access', async () => {
    const { body } = await query(
      `{ customer(id: "${otherId}") { customerId } }`,
    );
    expect(body.errors[0].extensions.code).toBe('FORBIDDEN');
    expect(prisma.customer.findUniqueOrThrow).not.toHaveBeenCalled();
  });
  it('scopes orders and resolves nested relationships', async () => {
    const { body } = await query(
      '{ orders { total customer { customerName } orderItems { unitPrice order { orderId } } } }',
    );
    expect(body.errors).toBeUndefined();
    expect(body.data.orders[0]).toEqual({
      total: '39.90',
      customer: { customerName: 'Test' },
      orderItems: [{ unitPrice: '19.95', order: { orderId: 'order' } }],
    });
    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { customerId } }),
    );
  });
  it('rejects oversized pages and invalid identifiers at the API boundary', async () => {
    expect(
      (await query('{ products(take: 101) { productId } }')).body.errors,
    ).toBeDefined();
    expect(
      (await query('{ customer(id: "bad") { customerId } }')).body.errors,
    ).toBeDefined();
    expect(prisma.product.findMany).not.toHaveBeenCalled();
  });
  it('rejects overdeep queries', async () => {
    const { body } = await query(
      '{ orders { customer { orders { customer { orders { customer { orders { customer { orders { orderId } } } } } } } } } }',
    );
    expect(body.errors[0].message).toContain('maximum depth');
  });
  it('does not leak database constraint details', async () => {
    prisma.customer.findUniqueOrThrow.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('sensitive SQL details', {
        code: 'P2025',
        clientVersion: '5.22.0',
      }),
    );
    const { body } = await query('{ me { customerId } }');
    expect(body.errors[0].message).toBe('Record not found.');
    expect(JSON.stringify(body)).not.toContain('sensitive SQL');
    expect(JSON.stringify(body)).not.toContain('stacktrace');
  });
  it('registers only customers and stores a password hash', async () => {
    prisma.user.create.mockImplementationOnce(async ({ data }) => ({
      id: 'new-user',
      ...data,
    }));
    const profile = {
      customerName: 'Test',
      cemail: 'USER@EXAMPLE.COM',
      phone: '+14155552671',
      address: 'Street',
      city: 'City',
      postalCode: '12345',
      country: 'US',
      password: 'a-secure-password-123',
    };
    const { body } = await query(
      'mutation($input: RegisterInput!) { register(input: $input) { accessToken } }',
      '',
      { input: profile },
    );
    expect(body.errors).toBeUndefined();
    expect(body.data.register.accessToken).toBeTruthy();
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        role: 'CUSTOMER',
        email: 'user@example.com',
        passwordHash: expect.not.stringContaining(profile.password),
      }),
    });
    const forged = await query(
      'mutation($input: RegisterInput!) { register(input: $input) { accessToken } }',
      '',
      { input: { ...profile, role: 'ADMIN' } },
    );
    expect(forged.body.errors).toBeDefined();
  });
  it('accepts a valid password and issues an account-bound token', async () => {
    const passwordHash = await hashPassword('correct-password-123');
    prisma.user.findUnique.mockResolvedValueOnce({
      id: 'customer-user',
      passwordHash,
    });
    const { body } = await query(
      'mutation { login(input: { email: "user@example.com", password: "correct-password-123" }) { accessToken } }',
      '',
    );
    expect(body.errors).toBeUndefined();
    const jwt = new JwtService({ secret: process.env.JWT_SECRET });
    expect(
      jwt.verify(body.data.login.accessToken, {
        issuer: 'store-api',
        audience: 'store-clients',
      }).sub,
    ).toBe('customer-user');
  });
  it('returns generic login failures', async () => {
    const { body } = await query(
      'mutation { login(input: { email: "unknown@example.com", password: "incorrect" }) { accessToken } }',
      '',
    );
    expect(body.errors[0].message).toBe('Invalid email or password.');
  });
  it('rejects expired and forged tokens', async () => {
    const jwt = new JwtService({ secret: process.env.JWT_SECRET });
    const expired = jwt.sign(
      { sub: 'customer-user' },
      { expiresIn: -1, issuer: 'store-api', audience: 'store-clients' },
    );
    for (const invalid of [expired, `${token}bad`])
      expect(
        (await query('{ me { customerId } }', invalid)).body.errors[0]
          .extensions.code,
      ).toBe('UNAUTHENTICATED');
  });
  it('throttles repeated login attempts', async () => {
    let last: any;
    for (let i = 0; i < 5; i++)
      last = await query(
        'mutation { login(input: { email: "unknown@example.com", password: "incorrect" }) { accessToken } }',
        '',
      );
    expect(last.body.errors[0].message).toContain('Too Many Requests');
  });
});
