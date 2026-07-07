import nodemailer from "nodemailer";
import type { NotificationConfiguration as DbNotificationConfiguration } from "../generated/prisma";
import {
  findNotificationConfigurationByChannel,
  parseNotificationSettings,
  settingsHaveCredentials,
} from "../models/notification.model";

export class EmailConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmailConfigurationError";
  }
}

export class EmailDeliveryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmailDeliveryError";
  }
}

type EmailConfig = {
  isEnabled: boolean;
  provider: string;
  fromEmail: string;
  fromName: string;
  replyTo: string | null;
  settings: Record<string, unknown>;
};

function resolveEmailConfig(record: DbNotificationConfiguration): EmailConfig {
  return {
    isEnabled: record.isEnabled,
    provider: record.provider?.trim() || "smtp",
    fromEmail: record.fromEmail?.trim() ?? "",
    fromName: record.fromName?.trim() ?? "",
    replyTo: record.replyTo?.trim() || null,
    settings: parseNotificationSettings(record.settings),
  };
}

export async function getEmailConfig() {
  const record = await findNotificationConfigurationByChannel("email");
  if (!record) {
    throw new EmailConfigurationError("Email configuration was not found.");
  }

  return resolveEmailConfig(record);
}

function assertEmailReady(config: EmailConfig) {
  if (!config.isEnabled) {
    throw new EmailConfigurationError("Email delivery is disabled.");
  }

  if (!config.fromEmail) {
    throw new EmailConfigurationError("Sender email is required.");
  }

  if (!config.fromName) {
    throw new EmailConfigurationError("Sender name is required.");
  }

  if (config.provider === "smtp") {
    const host = String(config.settings.smtp_host ?? "").trim();
    const port = Number(config.settings.smtp_port ?? 0);
    const username = String(config.settings.smtp_username ?? "").trim();
    const password = String(config.settings.smtp_password ?? "").trim();

    if (!host || !port || !username || !password) {
      throw new EmailConfigurationError("SMTP credentials are incomplete.");
    }

    return;
  }

  if (config.provider === "sendgrid" || config.provider === "mailgun") {
    const apiKey = String(config.settings.api_key ?? "").trim();
    if (!apiKey) {
      throw new EmailConfigurationError("API key is required for the selected email provider.");
    }
  }
}

async function sendViaSmtp(config: EmailConfig, input: { to: string; subject: string; body: string }) {
  const host = String(config.settings.smtp_host ?? "").trim();
  const port = Number(config.settings.smtp_port ?? 587);
  const username = String(config.settings.smtp_username ?? "").trim();
  const password = String(config.settings.smtp_password ?? "").trim();

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user: username, pass: password },
  });

  await transporter.sendMail({
    from: `"${config.fromName}" <${config.fromEmail}>`,
    to: input.to,
    subject: input.subject,
    text: input.body,
    ...(config.replyTo ? { replyTo: config.replyTo } : {}),
  });
}

async function sendViaSendGrid(
  config: EmailConfig,
  input: { to: string; subject: string; body: string },
) {
  const apiKey = String(config.settings.api_key ?? "").trim();
  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: input.to }] }],
      from: { email: config.fromEmail, name: config.fromName },
      subject: input.subject,
      content: [{ type: "text/plain", value: input.body }],
      ...(config.replyTo ? { reply_to: { email: config.replyTo } } : {}),
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new EmailDeliveryError(body.trim() || `SendGrid request failed with status ${response.status}.`);
  }
}

async function sendViaMailgun(
  config: EmailConfig,
  input: { to: string; subject: string; body: string },
) {
  const apiKey = String(config.settings.api_key ?? "").trim();
  const domain = String(config.settings.mailgun_domain ?? "").trim();

  if (!domain) {
    throw new EmailConfigurationError("Mailgun domain is required in email settings.");
  }

  const body = new URLSearchParams({
    from: `"${config.fromName}" <${config.fromEmail}>`,
    to: input.to,
    subject: input.subject,
    text: input.body,
  });

  if (config.replyTo) {
    body.set("h:Reply-To", config.replyTo);
  }

  const response = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) {
    const responseBody = await response.text();
    throw new EmailDeliveryError(
      responseBody.trim() || `Mailgun request failed with status ${response.status}.`,
    );
  }
}

export async function sendEmailMessage(input: { to: string; subject: string; body: string }) {
  const record = await findNotificationConfigurationByChannel("email");
  if (!record) {
    throw new EmailConfigurationError("Email configuration was not found.");
  }

  const config = resolveEmailConfig(record);
  assertEmailReady(config);

  const to = input.to.trim();
  const subject = input.subject.trim();
  const body = input.body.trim();

  if (!to) {
    throw new EmailDeliveryError("Recipient email is required.");
  }

  if (!subject) {
    throw new EmailDeliveryError("Email subject is required.");
  }

  if (!body) {
    throw new EmailDeliveryError("Email body is required.");
  }

  switch (config.provider) {
    case "sendgrid":
      await sendViaSendGrid(config, { to, subject, body });
      break;
    case "mailgun":
      await sendViaMailgun(config, { to, subject, body });
      break;
    case "smtp":
    default:
      await sendViaSmtp(config, { to, subject, body });
      break;
  }

  return { provider: config.provider, to, subject };
}

export function emailHasCredentials(settings: Record<string, unknown>) {
  return settingsHaveCredentials(settings);
}
