import type { NotificationConfiguration as DbNotificationConfiguration } from "../generated/prisma";
import {
  findNotificationConfigurationByChannel,
  parseNotificationSettings,
  settingsHaveCredentials,
} from "../models/notification.model";

export const AFROSMS_PROVIDER = "afrosms";
export const AFROSMS_DEFAULT_API_URL = "https://api.afromessage.com/api/send";
export const SMS_TEST_MESSAGE = "Smart Dispatch test message. SMS configuration is working.";

export type AfroSmsConfig = {
  provider: typeof AFROSMS_PROVIDER;
  isEnabled: boolean;
  sender: string;
  fromId: string;
  apiUrl: string;
  authToken: string;
};

export class SmsConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SmsConfigurationError";
  }
}

export class SmsDeliveryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SmsDeliveryError";
  }
}

function getAuthToken(settings: Record<string, unknown>) {
  const token = settings.auth_token;
  return typeof token === "string" ? token.trim() : "";
}

function getFromId(settings: Record<string, unknown>) {
  const fromId = settings.from_id;
  return typeof fromId === "string" ? fromId.trim() : "";
}

function getApiUrl(settings: Record<string, unknown>) {
  const apiUrl = settings.api_url;
  if (typeof apiUrl === "string" && apiUrl.trim()) {
    return apiUrl.trim();
  }

  return AFROSMS_DEFAULT_API_URL;
}

export function resolveAfroSmsConfig(record: DbNotificationConfiguration): AfroSmsConfig {
  const settings = parseNotificationSettings(record.settings);

  return {
    provider: AFROSMS_PROVIDER,
    isEnabled: record.isEnabled,
    sender: record.senderId?.trim() ?? "",
    fromId: getFromId(settings),
    apiUrl: getApiUrl(settings),
    authToken: getAuthToken(settings),
  };
}

export async function getAfroSmsConfig() {
  const record = await findNotificationConfigurationByChannel("sms");
  if (!record) {
    throw new SmsConfigurationError("SMS configuration was not found.");
  }

  return resolveAfroSmsConfig(record);
}

function assertAfroSmsCredentials(config: AfroSmsConfig) {
  if (config.provider !== AFROSMS_PROVIDER) {
    throw new SmsConfigurationError("Only AfroSMS is supported for SMS delivery.");
  }

  if (!config.fromId) {
    throw new SmsConfigurationError("AfroSMS identifier (from) is required.");
  }

  if (!config.sender) {
    throw new SmsConfigurationError("AfroSMS sender name is required.");
  }

  if (!config.authToken) {
    throw new SmsConfigurationError("AfroSMS API token is required.");
  }
}

export function assertAfroSmsReady(config: AfroSmsConfig) {
  if (!config.isEnabled) {
    throw new SmsConfigurationError("SMS delivery is disabled.");
  }

  assertAfroSmsCredentials(config);
}

async function deliverAfroSms(config: AfroSmsConfig, input: { to: string; message: string }) {
  const to = input.to.trim();
  const message = input.message.trim();

  if (!to) {
    throw new SmsDeliveryError("Recipient phone number is required.");
  }

  if (!message) {
    throw new SmsDeliveryError("SMS message body is required.");
  }

  const url = new URL(config.apiUrl);
  url.searchParams.set("from", config.fromId);
  url.searchParams.set("sender", config.sender);
  url.searchParams.set("to", to);
  url.searchParams.set("message", message);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${config.authToken}`,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new SmsDeliveryError(
      body.trim() || `AfroSMS request failed with status ${response.status}.`,
    );
  }

  return {
    provider: config.provider,
    to,
    message,
  };
}

export async function sendAfroSmsMessage(input: { to: string; message: string }) {
  const config = await getAfroSmsConfig();
  assertAfroSmsReady(config);
  return deliverAfroSms(config, input);
}

export async function sendAfroSmsTestMessage(input: { to: string }) {
  const config = await getAfroSmsConfig();
  assertAfroSmsCredentials(config);
  return deliverAfroSms(config, { to: input.to, message: SMS_TEST_MESSAGE });
}

export function afroSmsHasCredentials(settings: Record<string, unknown>) {
  return settingsHaveCredentials(settings);
}
