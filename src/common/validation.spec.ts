import { ValidationPipe } from '@nestjs/common';
import { parseMoney } from './decimal.scalar';
import { UpdateOrderInput } from '../orders/dto/update-order.input';
import { PaginationArgs } from './pagination.args';
const pipe = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
});
it('preserves omitted fields in partial order updates', async () => {
  const input = await pipe.transform(
    { orderId: 'b2f8dc4f-c533-4cef-8d2f-9a73ce69bb11' },
    { type: 'body', metatype: UpdateOrderInput },
  );
  expect(input.comments).toBeUndefined();
  expect(input.orderItems).toBeUndefined();
});
it('rejects client-controlled order totals and payment flags', async () => {
  await expect(
    pipe.transform(
      {
        orderId: 'b2f8dc4f-c533-4cef-8d2f-9a73ce69bb11',
        paid: true,
        total: '0.01',
      },
      { type: 'body', metatype: UpdateOrderInput },
    ),
  ).rejects.toThrow();
});
it('limits list sizes and rejects null item replacement', async () => {
  await expect(
    pipe.transform({ take: 101 }, { type: 'body', metatype: PaginationArgs }),
  ).rejects.toThrow();
  await expect(
    pipe.transform(
      { orderId: 'b2f8dc4f-c533-4cef-8d2f-9a73ce69bb11', orderItems: null },
      { type: 'body', metatype: UpdateOrderInput },
    ),
  ).rejects.toThrow();
});
it('accepts exact cents and rejects float inputs, excess precision and oversized money', () => {
  expect(parseMoney('19.95')).toBe('19.95');
  expect(parseMoney('0.1')).toBe('0.10');
  for (const invalid of [19.95, '-1', '1.001', '100000000.00', 'NaN'])
    expect(() => parseMoney(invalid)).toThrow();
});
