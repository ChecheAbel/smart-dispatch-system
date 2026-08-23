-- Allow dynamic payment gateway method ids on invoices.
ALTER TABLE "invoices"
  ALTER COLUMN "payment_method" TYPE VARCHAR(50)
  USING ("payment_method"::text);

DROP TYPE IF EXISTS "invoice_payment_method";
