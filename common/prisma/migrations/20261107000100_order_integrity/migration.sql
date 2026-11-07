BEGIN;
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'CUSTOMER');

-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "shippingDate" DROP NOT NULL;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "unitPrice" DECIMAL(10,2);
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "OrderItem" WHERE "unitPrice" IS NULL) THEN
    RAISE EXCEPTION 'Legacy items require reconciled unitPrice, totals and reserved inventory; see README before migrating';
  END IF;
END $$;
ALTER TABLE "OrderItem" ALTER COLUMN "unitPrice" SET NOT NULL;

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'CUSTOMER',
    "customerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_customerId_key" ON "User"("customerId");

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("productId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("customerId") ON DELETE SET NULL ON UPDATE CASCADE;


ALTER TABLE "Product" ADD CONSTRAINT "Product_nonnegative" CHECK ("quantityInStock" >= 0 AND "buyPrice" >= 0 AND "msrp" >= 0);
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_valid_amounts" CHECK ("quantity" > 0 AND "unitPrice" >= 0);
ALTER TABLE "Order" ADD CONSTRAINT "Order_nonnegative_total" CHECK ("total" >= 0);

CREATE INDEX "Order_orderDate_orderId_idx" ON "Order"("orderDate", "orderId");
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

COMMIT;
