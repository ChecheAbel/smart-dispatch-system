CREATE TYPE "invoice_payment_method" AS ENUM ('telebirr', 'cbe_birr', 'manual');

ALTER TABLE "invoices"
ADD COLUMN "payment_method" "invoice_payment_method";
