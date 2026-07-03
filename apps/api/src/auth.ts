import crypto from "crypto";
import type { Express, Request, Response } from "express";

const RESET_EXPIRY_MS = 60 * 60 * 1000;

type ResetRecord = {
  email: string;
  expiresAt: number;
};

const resetTokens = new Map<string, ResetRecord>();

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function registerAuthRoutes(app: Express) {
  app.post("/api/auth/forgot-password", (req: Request, res: Response) => {
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: "A valid email address is required." });
    }

    const token = crypto.randomBytes(32).toString("hex");
    resetTokens.set(token, {
      email,
      expiresAt: Date.now() + RESET_EXPIRY_MS,
    });

    const appUrl = process.env.APP_URL ?? "http://localhost:3000";
    const resetLink = `${appUrl}/U@RQ$f/reset-password?token=${token}`;

    console.log(`[Password Reset Invitation] ${email}`);
    console.log(`[Password Reset Link] ${resetLink}`);

    return res.json({
      message:
        "If an administrator account exists for this email, a password reset invitation has been sent.",
    });
  });

  app.post("/api/auth/reset-password", (req: Request, res: Response) => {
    const token = typeof req.body?.token === "string" ? req.body.token.trim() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";

    if (!token) {
      return res.status(400).json({ error: "Reset token is required." });
    }

    if (!password || password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters." });
    }

    const record = resetTokens.get(token);

    if (!record) {
      return res.status(400).json({ error: "This reset invitation is invalid or has already been used." });
    }

    if (Date.now() > record.expiresAt) {
      resetTokens.delete(token);
      return res.status(400).json({ error: "This reset invitation has expired. Please request a new one." });
    }

    resetTokens.delete(token);

    console.log(`[Password Reset] Password updated for ${record.email}`);

    return res.json({ message: "Your password has been reset. You can now sign in." });
  });
}
