-- Record how each client payment was received. The column is nullable only so
-- existing payments are not incorrectly labelled as cash; all new payments
-- require a method in application validation.
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'BANK_DEPOSIT');

ALTER TABLE "client_payments"
ADD COLUMN "paymentMethod" "PaymentMethod";
