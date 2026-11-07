import { buildSchema, getIntrospectionQuery, parse, validate } from 'graphql';
import { queryBudgetRule } from './query-budget.rule';
const schema = buildSchema(
  'type Query { orders(take: Int): [Order!]! } type Order { customer: Customer!, orderId: ID! } type Customer { orders(take: Int): [Order!]! }',
);
it('allows schema discovery for development tools', () => {
  expect(
    validate(schema, parse(getIntrospectionQuery()), [queryBudgetRule]),
  ).toEqual([]);
});
it('expands fragments and rejects excessive nested list result costs', () => {
  const doc = parse(
    'query { orders(take: 100) { customer { ...Profile } } } fragment Profile on Customer { orders(take: 100) { customer { orders(take: 100) { orderId } } } }',
  );
  expect(validate(schema, doc, [queryBudgetRule])[0].message).toContain(
    'estimated result cost',
  );
});
it('allows bounded ordinary queries', () => {
  expect(
    validate(
      schema,
      parse(
        '{ orders(take: 10) { orderId customer { orders(take: 10) { orderId } } } }',
      ),
      [queryBudgetRule],
    ),
  ).toEqual([]);
});
