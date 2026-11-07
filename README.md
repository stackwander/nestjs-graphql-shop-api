# 🛒 NestJS Shop GraphQL API — Accounts, Customers, Products & Orders

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)

[![Node.js](https://img.shields.io/badge/Node.js-24.9%2B-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-12-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com/)
[![Apollo Server](https://img.shields.io/badge/Apollo_Server-5-311C87?logo=apollographql&logoColor=white)](https://www.apollographql.com/docs/apollo-server/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16%2B-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)

A TypeScript commerce backend for **customer accounts, customer profiles, products, inventory, and orders**.
Built with **NestJS, Apollo GraphQL, Prisma, and PostgreSQL**, it demonstrates feature-based modules,
code-first GraphQL contracts, customer ownership checks, and transactional inventory protection. Application can serve as a boiler plate for graphql apis and can be further extended with AI to save tokens.

The application includes customer registration and login, administrator permissions, exact decimal
money, server-calculated order totals, and cancellation that preserves order history.

> **Application boundary:** customers can access their own profile and orders; administrators manage
> catalog data, customer records, and payment confirmations. This is an application foundation:
> email verification, password recovery, payment-provider integration, and order expiration remain
> production follow-ups. See [Production Notes & Remaining Work](#-production-notes--remaining-work).

---

## 📐 Architecture & Flow

The application is a **modular monolith**: one deployable Node.js application, organized into
account, customer, product, and order features, sharing one PostgreSQL database. Orders and
inventory can therefore change within a single database transaction.

The feature folders provide a partial vertical-slice organization. Within each feature,
resolvers, services, input DTOs, and GraphQL object types keep separate responsibilities.

```mermaid
flowchart TD
    Client[Customer or administrator client]
    GraphQL[Express and Apollo /graphql]
    Guards[JWT authentication, roles and rate limiting]
    Validation[GraphQL contract and DTO validation]
    Resolvers[Feature resolvers]
    Services[Services and ownership rules]
    Prisma[Shared Prisma client and transactions]
    DB[(PostgreSQL)]
    Output[GraphQL field resolution and serialization]
    Errors[Safe database error translation]

    Client --> GraphQL --> Guards --> Validation --> Resolvers
    Resolvers --> Services --> Prisma --> DB
    DB --> Prisma --> Services --> Resolvers --> Output --> Client
    Prisma -. database failures .-> Errors --> Client
```

The diagram summarizes responsibilities; GraphQL document validation also happens before resolver
execution. Public registration and login bypass the authentication requirement, but remain rate-limited.

### Responsibilities by layer

| Layer                     | Responsibility                                                                 | Where to look                                                                          |
| :------------------------ | :----------------------------------------------------------------------------- | :------------------------------------------------------------------------------------- |
| **Bootstrap**             | Load configuration, create the app, enable validation and shutdown hooks       | [main.ts](src/main.ts), [configure-app.ts](src/common/configure-app.ts)                |
| **Composition**           | Connect feature modules, GraphQL, guards, and filters                          | [app.module.ts](src/app.module.ts)                                                     |
| **Authentication**        | Register accounts, hash passwords, issue tokens, and enforce roles             | [auth/](src/auth/)                                                                     |
| **Resolvers**             | Expose queries, mutations, and relationship fields                             | `src/*/*.resolver.ts`                                                                  |
| **Input DTOs**            | Define permitted fields and runtime validation                                 | `src/*/dto/`, [auth.inputs.ts](src/auth/auth.inputs.ts)                                |
| **Services**              | Apply ownership and business rules; coordinate database writes                 | [orders.service.ts](src/orders/orders.service.ts)                                      |
| **GraphQL object types**  | Define the output schema; these classes are not Prisma table mappings          | `src/*/entities/`                                                                      |
| **Persistence**           | Define tables, relationships, indexes, and versioned SQL changes               | [schema.prisma](common/prisma/schema.prisma), [migrations/](common/prisma/migrations/) |
| **Shared infrastructure** | Manage Prisma lifecycle, pagination, money, query budgets, and database errors | [database/](src/database/), [common/](src/common/)                                     |

Resolvers delegate business operations to services. NestJS dependency injection supplies one shared
Prisma service, which tests can replace with a mock.

### Data model

```mermaid
erDiagram
    USER o|--o| CUSTOMER : has_profile
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ ORDER_ITEM : contains
    PRODUCT ||--o{ ORDER_ITEM : referenced_by

    USER {
        string id PK
        string email UK
        string passwordHash
        enum role
        string customerId FK,UK
    }
    CUSTOMER {
        string customerId PK
        string customerName
        string cemail UK
    }
    PRODUCT {
        string productId PK
        string productName
        int quantityInStock
        decimal buyPrice
        decimal msrp
    }
    ORDER {
        string orderId PK
        string customerId FK
        string status
        boolean paid
        decimal total
        datetime shippingDate
    }
    ORDER_ITEM {
        string orderItemId PK
        string orderId FK
        string productId FK
        string productName
        int quantity
        decimal unitPrice
    }
```

Public registration creates a user and customer profile together. Administrators can exist without
a customer profile, and administrator-created profiles can exist without a login account. IDs use
UUID values stored as strings. The service requires 1–100 distinct products per order; foreign keys
protect referenced products and customers.

---

## ✨ Key Features

- **🧩 Feature modules** — Account, customer, product, and order features with small resolvers and explicit services.
- **🔒 Customer accounts** — Salted scrypt password hashes, short-lived JWTs, administrator roles, and ownership checks.
- **📜 Code-first GraphQL** — Decorated TypeScript classes generate the schema, including nested relationship fields.
- **✅ Runtime validation** — Nested input validation, UUID checks, bounded pagination, and unknown-field rejection.
- **📦 Inventory protection** — Conditional stock decrements and serializable order transactions with bounded conflict retries.
- **💰 Exact money** — Decimal strings at the API boundary, PostgreSQL decimal columns, and server-owned totals.
- **🧾 Retained order history** — Idempotent cancellation releases inventory once while retaining the order and its items.
- **🛡️ Query protection** — Depth, field-count, estimated result-cost, and per-operation rate limits; HTTP batching is disabled.
- **🧪 Automated verification** — Unit tests, HTTP GraphQL tests, and a separate PostgreSQL integration test command.

---

## 📂 Repository Structure

The application lives in the inner `backend_nest_p7/` directory of the supplied workspace.
Run the commands below from the directory containing this README and `package.json`.

```text
backend_nest_p7/
├── src/
│   ├── main.ts                      # Application entry point
│   ├── app.module.ts                # Root composition and GraphQL configuration
│   ├── schema.gql                   # Generated development GraphQL contract
│   ├── auth/                        # Registration, login, passwords, JWTs and roles
│   ├── customers/                   # Profiles, ownership and customer relationships
│   ├── products/                    # Product catalog, prices and available inventory
│   ├── orders/                      # Transactional orders, items and cancellation
│   ├── common/                      # Validation, decimal scalar, query limits and errors
│   └── database/                    # Shared Prisma service and lifecycle hooks
├── common/prisma/
│   ├── schema.prisma                # Persistence model and client generator
│   └── migrations/                  # Baseline and order-integrity migrations
├── scripts/
│   ├── create-admin.ts              # Explicit administrator account provisioning
│   └── test-database.ts             # Isolated PostgreSQL integration checks
├── test/
│   ├── app.e2e-spec.ts              # HTTP GraphQL tests with mocked persistence
│   └── jest-e2e.json                # API test configuration
├── .env.example                     # Environment variable template
├── .nvmrc                           # Node 24 development version
├── package.json                     # Dependencies and development commands
└── README.md                        # Architecture and operating guide
```

Unit tests live beside their source files as `*.spec.ts`. Docker deployment files, a CI workflow,
and load-test scripts are not currently included.

---

## 🧠 Architecture Concepts

### Transactions: one operation, one outcome

Order creation validates the customer, reserves stock, records line items, and stores the calculated
total inside a Prisma transaction. A failure rolls back every database change in that operation.
Updates and cancellation use the same transaction boundary.

```mermaid
sequenceDiagram
    participant C as Authenticated client
    participant S as Orders service
    participant D as PostgreSQL transaction
    C->>S: createOrder(product IDs and quantities)
    S->>S: Enforce customer ownership
    S->>D: Begin serializable transaction
    S->>D: Verify customer and load products
    S->>D: Decrement stock only where stock is sufficient
    alt All reservations succeed
        S->>D: Save item snapshots and calculated total
        D-->>S: Commit
        S-->>C: Order with PENDING status
    else A reservation or write fails
        D-->>S: Roll back all changes
        S-->>C: GraphQL error
    end
```

### Concurrency protection and retries

Stock reservations use a conditional update: decrement only when `quantityInStock >= requestedQuantity`.
Serializable isolation coordinates competing order changes. Prisma `P2034` write conflicts are retried
for up to **three total transaction attempts**; product adjustments run in sorted ID order to reduce
deadlock risk. Exhausted retries return a conflict.

These are internal transaction retries. **Order creation has no client idempotency key**: submitting
`createOrder` again can create another order and reserve stock again. Reconcile an uncertain outcome
before resubmitting, and add persisted request idempotency before relying on automatic client retries.

### Exact money and historical prices

The `Decimal` GraphQL scalar accepts and returns **decimal strings**, for example `"19.95"`.
Prisma decimal arithmetic and PostgreSQL `DECIMAL(10,2)` columns avoid floating-point calculations.

```text
order.total = sum(item.unitPrice × item.quantity)
```

Product `msrp` supplies the selling price; `buyPrice` is the internal purchase cost and is hidden
from customer accounts. Prices and order totals are nonnegative and at most `99,999,999.99`.
Line quantities range from 1 to 1,000,000.

New line items store the product name and price. Replacing an order's items retains the stored unit
price for products already present in that order; newly added products use the current MSRP.
Replacement recreates item IDs and refreshes product names from the catalog. Omitting `orderItems`
leaves the existing items and total unchanged; an empty or null replacement is rejected.

Amounts use one deployment-defined currency. Taxes, discounts, shipping charges, and currency
conversion are outside the current calculation.

### DTOs, GraphQL types, and persistence models

Input DTOs describe what clients may submit. GraphQL object types describe what clients may select.
The Prisma schema describes what PostgreSQL stores. These contracts serve different purposes.

Clients submit product IDs and quantities; the server determines item IDs, price snapshots, totals,
initial status, and payment state. TypeScript supplies compile-time checks, while `ValidationPipe`
and GraphQL input validation check requests at runtime.

### Order lifecycle and cancellation

```mermaid
stateDiagram-v2
    [*] --> PENDING: Create and reserve stock
    PENDING --> PAID: Administrator confirms payment
    PAID --> PENDING: Administrator clears payment confirmation
    PENDING --> CANCELLED: Cancel and release stock
    CANCELLED --> CANCELLED: Repeat cancellation without releasing stock again
```

Paid and cancelled orders cannot be edited. An administrator can clear payment confirmation, but
any real refund must be handled outside this API before cancellation. Cancelled orders cannot be
paid or reopened. There is no implemented shipping/fulfilment state machine.

`cancelOrder` retains the order and its items. The deprecated `removeOrder` mutation delegates to
cancellation; it does not physically delete the order. Normal queries continue to return cancelled
orders. Shipping date is nullable and does not itself establish a shipping status.

---

## 🚀 Getting Started

### Prerequisites

- **Node.js 24.9+ or 26**, within the `>=24.9 <27` package engine range, and npm.
- **PostgreSQL 16+** with a reachable application database.
- A random JWT signing secret of at least 32 bytes.

### Configure the environment

From this README's directory, copy the template in PowerShell:

```powershell
Copy-Item .env.example .env
```

On Linux or macOS, use `cp .env.example .env`. Set `DATABASE_URL` to your application database.
Generate a JWT secret and put the result in `JWT_SECRET`:

```sh
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Keep `.env` private. The application loads a local `.env` file; values already supplied in the
process environment take precedence. Prisma CLI commands also load the project environment file.

### Install, migrate, and start

For a **new empty database**:

```sh
npm ci
npm run db:generate
npm run db:migrate
npm run start:dev
```

For an existing database, follow [Migrations & Existing Databases](#-migrations--existing-databases)
first. `db:migrate` applies committed migrations; `db:dev` is for authoring migrations during development.

The GraphQL endpoint is **`http://localhost:3000/graphql`** at the default port. In development,
opening it in a browser displays GraphiQL. The generated contract is [src/schema.gql](src/schema.gql).
Production builds generate their schema in memory and disable GraphiQL and introspection.

### Provision an administrator

Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in your shell, then run:

```sh
npm run admin:create
```

The password must contain 12–128 characters. The script creates an administrator account without
a customer profile; it never promotes an existing customer account. Clear provisioning credentials
from your shell afterwards. Use the normal `login` mutation to obtain its access token.

Customers create their own account and profile with `register`.

---

## 🔑 Configuration & Access

| Variable            | Required?          | Default | Purpose                                                 |
| :------------------ | :----------------- | :------ | :------------------------------------------------------ |
| `DATABASE_URL`      | Yes                | None    | Prisma PostgreSQL connection URL                        |
| `JWT_SECRET`        | Yes                | None    | JWT signing secret; startup requires at least 32 bytes  |
| `PORT`              | No                 | `3000`  | HTTP listening port                                     |
| `NODE_ENV`          | No                 | Unset   | Set `production` to disable GraphiQL and introspection  |
| `ADMIN_EMAIL`       | For provisioning   | None    | Login email used by `admin:create`                      |
| `ADMIN_PASSWORD`    | For provisioning   | None    | Initial administrator password, 12–128 characters       |
| `TEST_DATABASE_URL` | For database tests | None    | Isolated PostgreSQL database whose name contains `test` |

### Account permissions

| Caller            | Allowed operations                                                                                     |
| :---------------- | :----------------------------------------------------------------------------------------------------- |
| **Anonymous**     | `register` and `login`; development schema discovery is available when introspection is enabled        |
| **Customer**      | Product reads, `me`, own-profile reads/updates, and own-order creation, reads, edits, and cancellation |
| **Administrator** | Catalog management, customer lists and management, all orders, and `setOrderPaid`                      |

Send protected GraphQL requests with:

```http
Content-Type: application/json
Authorization: Bearer <accessToken>
```

Tokens expire after **15 minutes** and validate HS256, a fixed issuer, and a fixed audience.
The authentication guard loads the account from the database for each protected resolver execution,
so account deletion and role changes take effect without waiting for token expiry.

Public registration creates only `CUSTOMER` accounts. Passwords use salted asynchronous scrypt
hashes with `N=2^17`, `r=8`, and `p=1`; hashes and credentials are not GraphQL output fields.

Registration normalizes `cemail` to lowercase and uses it as the login email. Later edits to profile
`cemail` change the contact address, **not the account's login email**. An administrator without a
customer profile should use customer queries rather than `me`.

---

## 🛍️ GraphQL API Reference & Examples

Send each operation separately to `/graphql`, using JSON `{ "query": "...", "variables": {} }`
over HTTP or the development GraphiQL editor. Replace example IDs with returned resource UUIDs,
and add the authorization header after registering or logging in.

### Register and log in

```graphql
mutation RegisterCustomer {
  register(
    input: {
      customerName: "Alex Morgan"
      cemail: "alex@example.com"
      phone: "+14155552671"
      address: "10 Market Street"
      city: "San Francisco"
      postalCode: "94105"
      country: "US"
      password: "replace-with-your-own-password"
    }
  ) {
    accessToken
  }
}
```

```graphql
mutation Login {
  login(
    input: {
      email: "alex@example.com"
      password: "replace-with-your-own-password"
    }
  ) {
    accessToken
  }
}
```

### Create a product — administrator

```graphql
mutation CreateProduct {
  createProduct(
    createProductInput: {
      productName: "Notebook"
      productvendor: "Example Supplies"
      productDescription: "A5 lined notebook"
      quantityInStock: 50
      buyPrice: "3.25"
      msrp: "7.95"
    }
  ) {
    productId
    productName
    msrp
    quantityInStock
  }
}
```

### Read the catalog, profile, and orders — customer

```graphql
query MyShop {
  me {
    customerId
    customerName
    cemail
  }
  products(take: 20, skip: 0) {
    productId
    productName
    msrp
    quantityInStock
  }
  orders(take: 20, skip: 0) {
    orderId
    status
    paid
    total
    orderItems(take: 100) {
      productId
      productName
      quantity
      unitPrice
    }
  }
}
```

Root and nested list fields accept `take` (default 20, range 1–100) and `skip`
(default 0, range 0–100,000), with deterministic sorting. Customer order queries are scoped to the
logged-in profile. These bounds do not provide a total count or cursor-based pagination.

### Place an order

```graphql
mutation PlaceOrder($productId: String!) {
  createOrder(
    createOrderInput: {
      comments: "Leave at reception"
      orderItems: [{ productId: $productId, quantity: 2 }]
    }
  ) {
    orderId
    status
    paid
    total
    orderItems(take: 100) {
      productId
      quantity
      unitPrice
    }
  }
}
```

Set the `productId` variable to a real catalog UUID. Customers may omit `customerId`; the server
uses their profile. Administrators placing an order must supply a customer ID. Customers cannot
supply another customer's ID. Neither role supplies totals, names, prices, status, or payment state
through this input. Two units priced at `"7.95"` produce a total of `"15.90"`.

### Update an order

```graphql
mutation UpdateOrder($orderId: String!, $productId: String!) {
  updateOrder(
    updateOrderInput: {
      orderId: $orderId
      comments: "Collect at the front desk"
      orderItems: [{ productId: $productId, quantity: 3 }]
    }
  ) {
    orderId
    comments
    total
    orderItems(take: 100) {
      productId
      quantity
      unitPrice
    }
  }
}
```

The submitted list replaces **all** order items. For a metadata-only update, omit `orderItems`.
Customer reassignment is not part of the update contract. Only unpaid, non-cancelled orders can change.

### Confirm payment or cancel

```graphql
mutation ConfirmPayment($orderId: String!) {
  setOrderPaid(id: $orderId, paid: true) {
    orderId
    status
    paid
  }
}
```

`setOrderPaid` requires an administrator and records a manual confirmation; it does not charge a card.

```graphql
mutation CancelOrder($orderId: String!) {
  cancelOrder(id: $orderId) {
    orderId
    status
    paid
  }
}
```

Customers can cancel their own unpaid orders; administrators can cancel any unpaid order. Paid
orders require payment confirmation to be cleared after the external refund process. Repeating
cancellation does not release stock twice.

The full query, mutation, and input reference is the generated [GraphQL schema](src/schema.gql).

---

## 🧪 Testing & Verification

### Local checks

```sh
npm run typecheck
npm run build
npm run lint
npm test -- --runInBand
npm run test:e2e -- --runInBand
npm audit --omit=dev
```

Jest 30 uses Node's native CommonJS/ESM interoperability and the experimental VM-modules flag
provided by the npm scripts. Node 24.9+ is required for this test configuration.

| Check                      | What it verifies                                                                                                                                                      |
| :------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Unit tests**             | Exact totals, stock guards, ownership, item replacement, partial updates, cancellation, conflict retries, validation, and query budgets                               |
| **HTTP GraphQL tests**     | Schema serialization, nested relationships, registration, login, roles, ownership, expired/forged tokens, rate limits, and safe errors using a mocked Prisma provider |
| **PostgreSQL integration** | Real migrations, competing reservations, rollback, exact persisted prices, ownership, cancellation, foreign keys, and nonnegative stock constraints                   |

At the November 7, 2026 verification, **25 unit tests and 13 HTTP GraphQL tests passed**, together
with PostgreSQL integration checks, compilation, lint, type checking, and a built-server smoke check.
These are recorded results, not a guarantee about subsequent edits.

### PostgreSQL integration tests

Provision a dedicated empty database, such as `store_test`. In PowerShell:

```powershell
$env:TEST_DATABASE_URL = 'postgresql://postgres:your-test-password@localhost:5432/store_test?schema=public'
npm run test:db
```

On Linux or macOS:

```sh
TEST_DATABASE_URL='postgresql://postgres:your-test-password@localhost:5432/store_test?schema=public' npm run test:db
```

The script applies migrations only to the explicitly supplied test URL, creates unique fixtures,
and cleans up its own rows. The database name must contain `test`. Use a dedicated test database;
do not point this command at application or production data.

---

## 🗃️ Migrations & Existing Databases

Prisma uses [common/prisma/schema.prisma](common/prisma/schema.prisma) through the package's
`prisma.schema` setting. The committed migrations are:

| Migration                        | Purpose                                                                                                                 |
| :------------------------------- | :---------------------------------------------------------------------------------------------------------------------- |
| `20261107000000_baseline`        | Original customer, product, order, and order-item schema                                                                |
| `20261107000100_order_integrity` | User accounts, price snapshots, product references, nullable shipping dates, amount constraints, and additional indexes |

### Fresh database

Run `npm run db:migrate` to apply both migrations. Run `npm run db:generate` after changing the
Prisma schema or reinstalling dependencies when generation has not already run.

### Original tutorial database

1. Back up the database and verify restoration before making schema or data changes.
2. Verify that the existing schema matches the baseline SQL. If it does, mark that migration applied:

   ```sh
   npx prisma migrate resolve --applied 20261107000000_baseline
   ```

3. For legacy items, add a nullable `OrderItem.unitPrice DECIMAL(10,2)` column and reconcile its
   values from actual purchase records. Reconcile order totals, statuses, payment flags, product
   references, and available inventory as well. Do not infer historical prices from current MSRP.
4. Reconcile reservations for legacy active orders: the original API did not reserve inventory,
   while the new update/cancellation paths return previously reserved stock. Already-cancelled
   legacy orders must have their inventory released and their status reconciled to `CANCELLED`.
5. Deliberately provision account links for existing profiles. Public registration creates a new
   profile and cannot claim an existing profile by its contact email.
6. Apply `npm run db:migrate`, regenerate the client, and validate row counts, totals, references,
   account access, and inventory before cutover.

The integrity migration runs in a SQL transaction. It stops if legacy price snapshots are missing,
references are orphaned, or amounts violate the new constraints. After correcting a failed migration's
cause, use `prisma migrate resolve --rolled-back 20261107000100_order_integrity` as appropriate
before retrying. Do not reset a populated database to bypass a migration failure.

---

## 🚢 Production Notes & Remaining Work

For a native production run, install dependencies and generate the Prisma client, apply reviewed
migrations as a release step, build with `npm run build`, then run `npm run start:prod` with the
required environment variables and `NODE_ENV=production`.

- **Transport and secrets** — Use HTTPS at the ingress and protect database credentials and the JWT
  secret. Configure PostgreSQL TLS as required by the database deployment. Never commit secrets.
- **Authentication lifecycle** — Add email verification, password recovery, explicit session/token
  revocation, and account lifecycle operations before a public customer rollout.
- **Rate limits and proxies** — Limits are per process, per IP, and operation handler: 60/minute
  normally, 5/minute for registration/login. Configure trusted proxies deliberately and use shared
  throttle storage or ingress limits when running multiple replicas.
- **GraphQL limits** — Maximum depth 8, field budget 100, and estimated result-cost budget 50,000.
  Development introspection is exempt from the custom budget; production introspection is disabled.
  HTTP operation batching is explicitly disabled. Add request-scoped relationship batching before
  high-volume use; the current pagination bounds do not eliminate N+1 queries.
- **Inventory reservations** — Unpaid orders retain stock until cancelled. Add an expiration policy
  for abandoned orders, and persisted request idempotency for safe client-side order retries.
- **Payments and fulfilment** — Payment confirmation is manual. Implement the selected payment provider,
  refund reconciliation, fulfilment rules, and any required taxes, discounts, or shipping calculations.
- **Operations** — Shutdown hooks are enabled. Dedicated readiness/liveness endpoints, structured
  request tracing, actor audit events, CI, deployment containers, and load tests remain to be added.
  Establish backups, restore exercises, monitoring, and database pool sizing for the deployment.
- **Dependency checks** — Use the committed lockfile. The November 7, 2026 production audit reported
  zero known vulnerabilities; the full audit reported 25 low/moderate development-tool findings
  and no high/critical findings. Recheck regularly and review upgrade suggestions before applying them.

---

## 🧯 GraphQL Errors & Troubleshooting

GraphQL responses may contain an `errors` array even when HTTP status is `200`. Inspect that array,
its messages, and extensions; do not treat the HTTP status alone as proof of success. Errors may also
contain partial `data`, depending on the selected fields and their nullability.

| Symptom                                          | Meaning                                                                           | What to check                                                     |
| :----------------------------------------------- | :-------------------------------------------------------------------------------- | :---------------------------------------------------------------- |
| `UNAUTHENTICATED`                                | Missing, expired, forged, or otherwise invalid token; account may no longer exist | Obtain a fresh login token and send `Authorization: Bearer ...`   |
| `FORBIDDEN`                                      | Wrong role or another customer's profile was requested                            | Use the appropriate account and its own resource IDs              |
| Validation error                                 | Invalid fields, UUIDs, quantities, pagination, or input types                     | Match the generated schema and DTO rules; send money as strings   |
| `Record not found.`                              | Resource does not exist or an order is outside the caller's scope                 | Resource ID and account ownership                                 |
| Insufficient stock or concurrent-change conflict | Inventory is unavailable or transaction retries were exhausted                    | Refresh stock; reconcile uncertain order creation before retrying |
| Paid/cancelled order conflict                    | The lifecycle disallows the requested change                                      | Check payment confirmation and cancellation state                 |
| Too many requests                                | Per-operation throttle limit exceeded                                             | Reduce the request rate and wait for the limit window             |
| Query budget error                               | Query exceeds depth, field, or estimated result cost                              | Select fewer fields, reduce page sizes, or split the query        |
| Startup rejects `JWT_SECRET`                     | Secret is missing or shorter than 32 bytes                                        | Environment loading and configured signing secret                 |
| Migration finds existing tables                  | Original schema has not been baselined                                            | Follow the existing-database migration procedure                  |
| Migration rejects legacy items                   | Historical prices or data integrity need reconciliation                           | Price snapshots, order totals, references, and inventory          |
| `me` fails for an administrator                  | The administrator has no customer profile                                         | Use administrator customer queries                                |
| GraphiQL/introspection unavailable               | Production mode disables developer schema exploration                             | Use the generated schema or a development environment             |

Known database exceptions are translated to safe application messages. Unexpected database failures
return generic errors; raw SQL and driver details are not intended as public API responses.

---

## 📄 License

Licensed under the **Apache License, Version 2.0**. See [LICENSE](LICENSE) for the
full terms. Third-party dependencies retain their respective licenses.

## ⚠️ Disclaimer

This project is an educational and reference implementation, provided **AS IS**.
Tests and security controls do not guarantee production readiness or suitability
for a particular deployment. Payment confirmations do not process payments or refunds.

Review the [full disclaimer](DISCLAIMER.md) and
[production notes](#-production-notes--remaining-work) before using real customer
data or inventory. The disclaimer does not modify the Apache License 2.0 terms.
