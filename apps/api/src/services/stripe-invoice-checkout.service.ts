import Stripe from "stripe";
import type { CustomerPaymentMethodId, PaymentGatewayMethod } from "@smart-dispatch/types";
import {
  getPaymentGatewayFieldValue,
  isStripeCheckoutMethod,
  isPaymentGatewayMethodReady,
} from "../config/customer-payment-options";
import { toCustomerInvoices } from "../mappers/customer-billing.mapper";
import { getPaymentGatewaySettings } from "../models/app-setting.model";
import {
  findInvoiceForRequester,
  findInvoicesForRequester,
} from "../models/invoice.model";
import {
  computeLatePaymentPenalty,
  resolveLatePaymentPolicy,
} from "./invoice-penalty.service";
import { fulfillIssuedInvoicesAsPaid } from "./invoice-generation.service";

const ZERO_DECIMAL_CURRENCIES = new Set([
  "bif",
  "clp",
  "djf",
  "gnf",
  "jpy",
  "kmf",
  "krw",
  "mga",
  "pyg",
  "rwf",
  "ugx",
  "vnd",
  "vuv",
  "xaf",
  "xof",
  "xpf",
]);

function appOrigin() {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

function safeAppPath(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  const path = value.trim();
  if (!path.startsWith("/dashboard")) return fallback;
  if (path.includes("://") || path.includes("\\") || path.includes("..")) return fallback;
  return path;
}

function toStripeUnitAmount(amount: number, currency: string) {
  const code = currency.trim().toLowerCase();
  if (ZERO_DECIMAL_CURRENCIES.has(code)) {
    return Math.round(amount);
  }
  return Math.round(amount * 100);
}

function invoiceAmountDue(
  invoice: NonNullable<Awaited<ReturnType<typeof findInvoiceForRequester>>>,
) {
  const policy = resolveLatePaymentPolicy({
    latePaymentType: invoice.latePaymentType,
    latePaymentFee: invoice.latePaymentFee,
    contract: invoice.contract,
  });
  return computeLatePaymentPenalty({
    status: invoice.status,
    dueAt: invoice.dueAt,
    totalAmount: Number(invoice.totalAmount),
    latePaymentType: policy.type,
    latePaymentFee: policy.fee,
    storedPenaltyAmount: Number(invoice.penaltyAmount),
  }).amountDue;
}

function configuredStripeMethod(methodId: string) {
  const method = getPaymentGatewaySettings().methods.find(
    (item) => item.id === methodId && item.enabled,
  );
  if (!method || !isStripeCheckoutMethod(method) || !isPaymentGatewayMethodReady(method)) {
    throw new Error("STRIPE_NOT_CONFIGURED");
  }
  return method;
}

function stripeClient(method: PaymentGatewayMethod) {
  const secretKey = getPaymentGatewayFieldValue(method, "secret_key");
  if (!secretKey?.startsWith("sk_")) {
    throw new Error("STRIPE_NOT_CONFIGURED");
  }
  return new Stripe(secretKey);
}

function parseInvoiceIds(raw: string | undefined) {
  return (raw ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

export async function createStripeInvoiceCheckoutSession(input: {
  invoiceIds: string[];
  paymentMethodId: CustomerPaymentMethodId;
  requesterUserId: string;
  customerEmail?: string | null;
  successPath?: unknown;
  cancelPath?: unknown;
  locale?: string | null;
}) {
  const uniqueIds = [...new Set(input.invoiceIds.map((id) => id.trim()).filter(Boolean))];
  if (uniqueIds.length === 0) {
    throw new Error("INVOICE_IDS_REQUIRED");
  }

  const method = configuredStripeMethod(input.paymentMethodId);
  const invoices = await findInvoicesForRequester(uniqueIds, input.requesterUserId);
  if (invoices.length !== uniqueIds.length) {
    throw new Error("INVOICE_NOT_FOUND");
  }
  if (invoices.some((invoice) => invoice.status !== "issued")) {
    throw new Error("INVOICE_NOT_ISSUED");
  }

  const currencies = new Set(invoices.map((invoice) => invoice.currency.trim().toUpperCase()));
  if (currencies.size > 1) {
    throw new Error("INVOICE_CURRENCY_MISMATCH");
  }

  const currency = [...currencies][0] ?? "USD";
  const amountDue = invoices.reduce((sum, invoice) => sum + invoiceAmountDue(invoice), 0);
  const unitAmount = toStripeUnitAmount(amountDue, currency);
  if (!Number.isFinite(unitAmount) || unitAmount < 1) {
    throw new Error("STRIPE_AMOUNT_INVALID");
  }

  const fallbackPath =
    uniqueIds.length === 1
      ? `/dashboard/my-invoices/${uniqueIds[0]}`
      : "/dashboard/my-invoices";
  const successPath = safeAppPath(input.successPath, fallbackPath);
  const cancelPath = safeAppPath(input.cancelPath, fallbackPath);
  const origin = appOrigin();
  const references = invoices.map((invoice) => invoice.referenceNumber).join(", ");

  const session = await stripeClient(method).checkout.sessions.create({
    mode: "payment",
    customer_email: input.customerEmail?.trim() || undefined,
    locale: input.locale === "am" ? "auto" : undefined,
    success_url: `${origin}${successPath}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}${cancelPath}?checkout=cancel`,
    client_reference_id: uniqueIds[0],
    metadata: {
      invoice_ids: uniqueIds.join(","),
      payment_method_id: method.id,
      user_id: input.requesterUserId,
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: currency.toLowerCase(),
          unit_amount: unitAmount,
          product_data: {
            name:
              uniqueIds.length === 1
                ? `Invoice ${invoices[0]?.referenceNumber ?? ""}`.trim()
                : `Invoices (${uniqueIds.length})`,
            description: `Payment for ${references}`,
          },
        },
      },
    ],
  });

  if (!session.url) {
    throw new Error("STRIPE_CHECKOUT_FAILED");
  }

  return { checkout_url: session.url, session_id: session.id };
}

async function fulfillStripeSession(
  session: Stripe.Checkout.Session,
  expectedUserId?: string,
) {
  if (session.payment_status !== "paid" && session.status !== "complete") {
    throw new Error("STRIPE_SESSION_UNPAID");
  }

  const userId = session.metadata?.user_id?.trim();
  if (expectedUserId && userId !== expectedUserId) {
    throw new Error("STRIPE_SESSION_MISMATCH");
  }

  const invoiceIds = parseInvoiceIds(session.metadata?.invoice_ids);
  const paymentMethodId = session.metadata?.payment_method_id?.trim();
  if (invoiceIds.length === 0 || !paymentMethodId) {
    throw new Error("STRIPE_SESSION_INVALID");
  }

  await fulfillIssuedInvoicesAsPaid(invoiceIds, paymentMethodId);
  return { invoiceIds, userId };
}

export async function completeStripeInvoiceCheckoutSession(input: {
  sessionId: string;
  requesterUserId: string;
  locale?: string;
}) {
  const sessionId = input.sessionId.trim();
  if (!sessionId) {
    throw new Error("STRIPE_SESSION_INVALID");
  }

  const stripeMethods = getPaymentGatewaySettings().methods.filter(
    (method) => isStripeCheckoutMethod(method) && getPaymentGatewayFieldValue(method, "secret_key"),
  );
  if (stripeMethods.length === 0) {
    throw new Error("STRIPE_NOT_CONFIGURED");
  }

  let session: Stripe.Checkout.Session | null = null;
  let lastError: unknown;
  for (const method of stripeMethods) {
    try {
      session = await stripeClient(method).checkout.sessions.retrieve(sessionId);
      break;
    } catch (error) {
      lastError = error;
    }
  }

  if (!session) {
    throw lastError instanceof Error ? lastError : new Error("STRIPE_SESSION_INVALID");
  }

  const fulfilled = await fulfillStripeSession(session, input.requesterUserId);
  const invoices = await findInvoicesForRequester(fulfilled.invoiceIds, input.requesterUserId);
  return toCustomerInvoices(invoices, { locale: input.locale });
}

export async function handleStripeWebhook(rawBody: Buffer, signature: string | undefined) {
  if (!signature) {
    throw new Error("STRIPE_WEBHOOK_INVALID");
  }

  const stripeMethods = getPaymentGatewaySettings().methods.filter(
    (method) => isStripeCheckoutMethod(method),
  );
  if (stripeMethods.length === 0) {
    throw new Error("STRIPE_NOT_CONFIGURED");
  }

  let event: Stripe.Event | null = null;
  for (const method of stripeMethods) {
    const webhookSecret = getPaymentGatewayFieldValue(method, "webhook_secret");
    const secretKey = getPaymentGatewayFieldValue(method, "secret_key");
    if (!webhookSecret || !secretKey) continue;
    try {
      event = stripeClient(method).webhooks.constructEvent(rawBody, signature, webhookSecret);
      break;
    } catch {
      event = null;
    }
  }

  if (!event) {
    throw new Error("STRIPE_WEBHOOK_INVALID");
  }

  if (
    event.type !== "checkout.session.completed" &&
    event.type !== "checkout.session.async_payment_succeeded"
  ) {
    return { received: true, ignored: true };
  }

  const session = event.data.object as Stripe.Checkout.Session;
  await fulfillStripeSession(session);
  return { received: true };
}
