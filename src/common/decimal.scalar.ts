import { GraphQLError, GraphQLScalarType, Kind } from 'graphql';
import { Prisma } from '@prisma/client';

export function parseMoney(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{1,8}(\.\d{1,2})?$/.test(value)) {
    throw new GraphQLError(
      'Money must be a non-negative decimal string with at most eight integer digits and two decimal places.',
    );
  }
  return new Prisma.Decimal(value).toFixed(2);
}

export const DecimalScalar = new GraphQLScalarType({
  name: 'Decimal',
  description:
    'Exact monetary amount encoded as a decimal string, for example "19.95".',
  serialize(value) {
    return new Prisma.Decimal(String(value)).toFixed(2);
  },
  parseValue: parseMoney,
  parseLiteral(node) {
    if (node.kind !== Kind.STRING)
      throw new GraphQLError('Money must be a decimal string.');
    return parseMoney(node.value);
  },
});
