import {
  GraphQLError,
  Kind,
  SelectionSetNode,
  ValidationContext,
  ValidationRule,
} from 'graphql';

export const queryBudgetRule: ValidationRule = (context: ValidationContext) => {
  return {
    OperationDefinition(node) {
      // Let development tools discover the schema; production disables introspection.
      if (
        process.env.NODE_ENV !== 'production' &&
        node.selectionSet.selections.every(
          (selection) =>
            selection.kind === Kind.FIELD &&
            selection.name.value.startsWith('__'),
        )
      )
        return;
      let fields = 0;
      let cost = 0;
      let exceeded = false;
      function visit(
        set: SelectionSetNode,
        depth: number,
        path: Set<string>,
        multiplier = 1,
      ) {
        if (depth > 8) {
          exceeded = true;
          return;
        }
        for (const selection of set.selections) {
          if (exceeded) return;
          if (selection.kind === Kind.FIELD) {
            cost += multiplier;
            if (++fields > 100 || cost > 50000) {
              exceeded = true;
              return;
            }
            const list = [
              'customers',
              'products',
              'orders',
              'orderItems',
            ].includes(selection.name.value);
            const take = selection.arguments?.find(
              (arg) => arg.name.value === 'take',
            )?.value;
            const size =
              take?.kind === Kind.INT
                ? Math.min(100, Math.max(1, Number(take.value)))
                : take
                  ? 100
                  : 20;
            if (selection.selectionSet)
              visit(
                selection.selectionSet,
                depth + 1,
                path,
                multiplier * (list ? size : 1),
              );
          } else if (selection.kind === Kind.INLINE_FRAGMENT) {
            visit(selection.selectionSet, depth, path, multiplier);
          } else {
            const name = selection.name.value;
            const fragment = context.getFragment(name);
            if (fragment && !path.has(name))
              visit(
                fragment.selectionSet,
                depth,
                new Set([...path, name]),
                multiplier,
              );
          }
        }
      }
      visit(node.selectionSet, 1, new Set());
      if (exceeded)
        context.reportError(
          new GraphQLError(
            'Query exceeds maximum depth (8) field budget (100), or estimated result cost (50000).',
          ),
        );
    },
  };
};
