type InvoiceAmountFields = {
  status: string;
  total_amount: number;
  penalty_amount: number;
  amount_due: number;
};

export function invoiceListedAmount(invoice: InvoiceAmountFields) {
  if (invoice.status === "issued") return invoice.amount_due;
  if (invoice.status === "paid") return invoice.total_amount + invoice.penalty_amount;
  return invoice.total_amount;
}
