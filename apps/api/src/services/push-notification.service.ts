import dns from "node:dns";

dns.setDefaultResultOrder("ipv4first");

export type PushPersistence = "temporary" | "permanent";
export type PushChannel = "websocket" | "fcm";
export type PushDevicePlatform = "android" | "ios";

export const PUSH_TEST_TITLE = "Smart Dispatch test";
export const PUSH_TEST_MESSAGE =
  "Smart Dispatch test message. Push notification configuration is working.";

export type BroadcastPushResult = {
  delivered?: number;
  push?: {
    enabled: boolean;
    requested: number;
    success: number;
    failure: number;
    invalidTokensDeactivated: number;
  };
};

export type BroadcastPushInput = {
  targets: string[];
  title: string;
  message: string;
  data?: Record<string, string>;
  persistence?: PushPersistence;
  channels?: PushChannel[];
};

export type RegisterDeviceTokenInput = {
  clientId: string;
  token: string;
  platform: PushDevicePlatform;
};

export type RegisteredDeviceToken = {
  id: string;
  clientId: string;
  platform: PushDevicePlatform;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export class PushNotificationConfigurationError extends Error {
  constructor(message = "Push notifications are not configured.") {
    super(message);
    this.name = "PushNotificationConfigurationError";
  }
}

export class PushNotificationDeliveryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PushNotificationDeliveryError";
  }
}

export function toPushTarget(userId: string) {
  return `user-${userId}`;
}

function getBroadcastBaseUrl() {
  return process.env.NOTIFICATION_BROADCAST_URL?.trim().replace(/\/+$/, "") ?? "";
}

function getApplicationId() {
  return process.env.NOTIFICATION_APPLICATION_ID?.trim() ?? "";
}

function getNotificationServiceHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const apiKey = process.env.NOTIFICATION_BROADCAST_API_KEY?.trim();
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  return headers;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function stringifyData(data: Record<string, string> | undefined) {
  if (!data) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [key, String(value)]),
  );
}

function getNotificationServiceErrorMessage(payload: unknown, fallback: string) {
  const record = asRecord(payload);
  if (!record) {
    return fallback;
  }

  if (typeof record.error === "string" && record.error.trim()) {
    return record.error;
  }

  const error = asRecord(record.error);
  const code = typeof error?.code === "string" ? error.code : "";
  const message = typeof error?.message === "string" ? error.message.trim() : "";

  if (code === "DEVICE_TOKEN_NOT_FOUND") {
    return "No registered device was found for this user. Open the mobile app so the device can register a push token, then try again.";
  }

  if (code === "FCM_RATE_LIMIT_EXCEEDED") {
    return "Too many push notifications were sent. Wait a moment and try again.";
  }

  if (code === "P2021") {
    return "The push service could not complete delivery because a required table is missing on that service. Retry using the test broadcast endpoint, or apply migrations on the notification service.";
  }

  if (
    code === "INTERNAL_SERVER_ERROR" ||
    /^internal server error\.?$/i.test(message) ||
    /an internal server error occurred/i.test(message)
  ) {
    return "The push service failed to deliver this notification. Confirm the recipient has a registered device and that FCM is configured for this application.";
  }

  if (message) {
    return message;
  }

  return fallback;
}

async function postNotificationService<T>(
  path: string,
  body: Record<string, unknown>,
  query?: Record<string, string>,
): Promise<T> {
  const baseUrl = getBroadcastBaseUrl();
  const applicationId = getApplicationId();

  if (!baseUrl || !applicationId) {
    throw new PushNotificationConfigurationError(
      "Set NOTIFICATION_BROADCAST_URL and NOTIFICATION_APPLICATION_ID to enable push notifications.",
    );
  }

  const url = new URL(`${baseUrl}${path}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    url.searchParams.set(key, value);
  }

  const requestInit = {
    method: "POST",
    headers: getNotificationServiceHeaders(),
    body: JSON.stringify(body),
  } satisfies RequestInit;

  let response: Response | undefined;
  let lastFailure = "Unknown network error.";

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      response = await fetch(url, {
        ...requestInit,
        signal: AbortSignal.timeout(20_000),
      });
      break;
    } catch (error) {
      lastFailure = error instanceof Error ? error.message : "Unknown network error.";
      console.error(
        `[Push] Failed to reach ${url.toString()} (attempt ${attempt}/3): ${lastFailure}`,
      );

      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
      }
    }
  }

  if (!response) {
    throw new PushNotificationDeliveryError(
      `Could not reach the push notification service (${lastFailure}). Check NOTIFICATION_BROADCAST_URL.`,
    );
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok || (payload && typeof payload === "object" && "success" in payload && payload.success === false)) {
    console.error(`[Push] ${path} failed (${response.status}):`, payload ?? response.statusText);
    throw new PushNotificationDeliveryError(
      getNotificationServiceErrorMessage(
        payload,
        `Notification service request failed (${response.status}).`,
      ),
    );
  }

  if (payload && typeof payload === "object" && "data" in payload) {
    return payload.data as T;
  }

  return payload as T;
}

function getDefaultChannels(): PushChannel[] {
  const raw = process.env.NOTIFICATION_BROADCAST_CHANNELS?.trim();
  if (!raw) {
    return ["fcm"];
  }

  const channels = raw
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter((value): value is PushChannel => value === "websocket" || value === "fcm");

  return channels.length > 0 ? channels : ["fcm"];
}

export function isPushNotificationConfigured() {
  return Boolean(getBroadcastBaseUrl() && getApplicationId());
}

export function describePushDelivery(delivery: BroadcastPushResult) {
  const push = delivery.push;

  if (!push) {
    return null;
  }

  if (push.requested === 0) {
    return "No registered device was found for the selected recipient(s). Open the mobile app so the device can register a push token, then try again.";
  }

  if (push.success === 0 && push.failure > 0) {
    return "The push service could not deliver to any registered devices. The device tokens may be invalid or FCM may not be configured for this application.";
  }

  return null;
}

export async function broadcastPushNotification(input: BroadcastPushInput) {
  const applicationId = getApplicationId();

  if (!getBroadcastBaseUrl() || !applicationId) {
    throw new PushNotificationConfigurationError(
      "Set NOTIFICATION_BROADCAST_URL and NOTIFICATION_APPLICATION_ID to enable push notifications.",
    );
  }

  if (input.targets.length === 0) {
    throw new PushNotificationDeliveryError("At least one push target is required.");
  }

  return postNotificationService<BroadcastPushResult>("/api/v1/notifications/broadcast", {
    applicationId,
    title: input.title,
    message: input.message,
    persistence: "temporary",
    targets: input.targets,
    channels: input.channels ?? getDefaultChannels(),
    data: stringifyData(input.data),
  });
}

export async function registerDeviceToken(input: RegisterDeviceTokenInput) {
  const applicationId = getApplicationId();

  if (!getBroadcastBaseUrl() || !applicationId) {
    throw new PushNotificationConfigurationError(
      "Set NOTIFICATION_BROADCAST_URL and NOTIFICATION_APPLICATION_ID to enable push notifications.",
    );
  }

  if (!input.clientId.trim()) {
    throw new PushNotificationDeliveryError("clientId is required.");
  }

  if (!input.token.trim()) {
    throw new PushNotificationDeliveryError("token is required.");
  }

  return postNotificationService<RegisteredDeviceToken>("/api/v1/devices/tokens", {
    clientId: input.clientId.trim(),
    token: input.token.trim(),
    platform: input.platform,
    applicationId,
  });
}
