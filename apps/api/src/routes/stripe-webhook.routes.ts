import express, { type Express, type Request, type Response } from "express";
import { handleStripeWebhook } from "../services/stripe-invoice-checkout.service";
import { sendError, sendSuccess } from "../utils/response";

export function registerStripeWebhookRoutes(app: Express) {
  app.post(
    "/api/webhooks/stripe",
    express.raw({ type: "application/json" }),
    async (req: Request, res: Response) => {
      try {
        const signature = req.headers["stripe-signature"];
        const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body ?? "");
        const result = await handleStripeWebhook(
          rawBody,
          typeof signature === "string" ? signature : undefined,
        );
        return sendSuccess(res, result);
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (message === "STRIPE_WEBHOOK_INVALID" || message === "STRIPE_NOT_CONFIGURED") {
          return sendError(res, "Invalid Stripe webhook.", 400);
        }
        return sendError(res, "Could not process Stripe webhook.", 400);
      }
    },
  );
}
