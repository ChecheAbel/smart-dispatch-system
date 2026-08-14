import { queueNotificationDeliveryLog } from "../models/notification-delivery-log.model";
import { listDrivers, listUsers, listUsersByIds } from "../models/user.model";
import {
  assertEmailReady,
  getEmailConfig,
  sendEmailMessage,
} from "./email.service";
import {
  assertAfroSmsReady,
  getAfroSmsConfig,
  sendAfroSmsMessage,
} from "./sms.service";
import {
  broadcastPushNotification,
  isPushNotificationConfigured,
  toPushTarget,
  PushNotificationConfigurationError,
} from "./push-notification.service";

export const OUTBOUND_CHANNELS = ["email", "sms", "push"] as const;
export type OutboundChannel = (typeof OUTBOUND_CHANNELS)[number];

export const OUTBOUND_AUDIENCES = ["drivers", "customers", "dispatchers"] as const;
export type OutboundAudience = (typeof OUTBOUND_AUDIENCES)[number];

export type OutboundRecipient = {
  id: string;
  email: string;
  mobileNumber: string;
};

export type ChannelSendCounts = {
  sent: number;
  skipped: number;
  failed: number;
};

export class OutboundMessageError extends Error {
  constructor(
    message: string,
    public statusCode = 400,
  ) {
    super(message);
    this.name = "OutboundMessageError";
  }
}

const MAX_RECIPIENTS = 500;
const EVENT = "admin.broadcast";

function isOutboundChannel(value: string): value is OutboundChannel {
  return (OUTBOUND_CHANNELS as readonly string[]).includes(value);
}

function isOutboundAudience(value: string): value is OutboundAudience {
  return (OUTBOUND_AUDIENCES as readonly string[]).includes(value);
}

export function parseOutboundChannels(values: string[]): OutboundChannel[] {
  const unique: OutboundChannel[] = [];

  for (const value of values) {
    if (!isOutboundChannel(value)) {
      throw new OutboundMessageError("Each channel must be email, SMS, or push.");
    }

    if (!unique.includes(value)) {
      unique.push(value);
    }
  }

  return unique;
}

export function parseOutboundAudience(value: string | null | undefined): OutboundAudience | null {
  if (!value) {
    return null;
  }

  if (!isOutboundAudience(value)) {
    throw new OutboundMessageError("Audience must be drivers, customers, or dispatchers.");
  }

  return value;
}

function toRecipient(user: { id: string; email: string; mobileNumber: string }): OutboundRecipient {
  return {
    id: user.id,
    email: user.email,
    mobileNumber: user.mobileNumber,
  };
}

export async function resolveOutboundRecipients(input: {
  userIds: string[];
  audience?: string | null;
}): Promise<OutboundRecipient[]> {
  const uniqueIds = [...new Set(input.userIds.filter(Boolean))];

  if (uniqueIds.length > 0) {
    const users = await listUsersByIds(uniqueIds);
    return users.map(toRecipient);
  }

  if (input.audience === "drivers") {
    const drivers = await listDrivers({ take: MAX_RECIPIENTS });
    return drivers.map(toRecipient);
  }

  if (input.audience === "customers" || input.audience === "dispatchers") {
    const users = await listUsers(
      {
        roleSlug: input.audience === "customers" ? "user" : "dispatcher",
        accountStatus: "active",
        accountActivation: "activated",
      },
      { skip: 0, take: MAX_RECIPIENTS },
    );
    return users.map(toRecipient);
  }

  return [];
}

async function assertChannelsReady(channels: OutboundChannel[]) {
  if (channels.includes("email")) {
    const config = await getEmailConfig();
    assertEmailReady(config);
  }

  if (channels.includes("sms")) {
    const config = await getAfroSmsConfig();
    assertAfroSmsReady(config);
  }

  if (channels.includes("push") && !isPushNotificationConfigured()) {
    throw new PushNotificationConfigurationError(
      "Push notifications are not configured. Set NOTIFICATION_BROADCAST_URL and NOTIFICATION_APPLICATION_ID.",
    );
  }
}

function emptyCounts(): ChannelSendCounts {
  return { sent: 0, skipped: 0, failed: 0 };
}

async function sendEmails(input: {
  recipients: OutboundRecipient[];
  title: string;
  message: string;
}): Promise<ChannelSendCounts> {
  const counts = emptyCounts();

  for (const recipient of input.recipients) {
    const to = recipient.email.trim();
    if (!to) {
      counts.skipped += 1;
      queueNotificationDeliveryLog({
        status: "skipped",
        module: "system",
        event: EVENT,
        channel: "email",
        recipient: "requester",
        entityType: "user",
        entityId: recipient.id,
        subject: input.title,
        bodyPreview: input.message,
        errorMessage: "Recipient email is missing.",
        isTest: false,
      });
      continue;
    }

    try {
      await sendEmailMessage({ to, subject: input.title, body: input.message });
      counts.sent += 1;
      queueNotificationDeliveryLog({
        status: "sent",
        module: "system",
        event: EVENT,
        channel: "email",
        recipient: "requester",
        entityType: "user",
        entityId: recipient.id,
        recipientContact: to,
        subject: input.title,
        bodyPreview: input.message,
        isTest: false,
      });
    } catch (error) {
      counts.failed += 1;
      queueNotificationDeliveryLog({
        status: "failed",
        module: "system",
        event: EVENT,
        channel: "email",
        recipient: "requester",
        entityType: "user",
        entityId: recipient.id,
        recipientContact: to,
        subject: input.title,
        bodyPreview: input.message,
        errorMessage: error instanceof Error ? error.message : "Email delivery failed.",
        isTest: false,
      });
    }
  }

  return counts;
}

async function sendSmsMessages(input: {
  recipients: OutboundRecipient[];
  title: string;
  message: string;
}): Promise<ChannelSendCounts> {
  const counts = emptyCounts();

  for (const recipient of input.recipients) {
    const to = recipient.mobileNumber.trim();
    if (!to) {
      counts.skipped += 1;
      queueNotificationDeliveryLog({
        status: "skipped",
        module: "system",
        event: EVENT,
        channel: "sms",
        recipient: "requester",
        entityType: "user",
        entityId: recipient.id,
        subject: input.title || null,
        bodyPreview: input.message,
        errorMessage: "Recipient phone number is missing.",
        isTest: false,
      });
      continue;
    }

    try {
      await sendAfroSmsMessage({ to, message: input.message });
      counts.sent += 1;
      queueNotificationDeliveryLog({
        status: "sent",
        module: "system",
        event: EVENT,
        channel: "sms",
        recipient: "requester",
        entityType: "user",
        entityId: recipient.id,
        recipientContact: to,
        subject: input.title || null,
        bodyPreview: input.message,
        isTest: false,
      });
    } catch (error) {
      counts.failed += 1;
      queueNotificationDeliveryLog({
        status: "failed",
        module: "system",
        event: EVENT,
        channel: "sms",
        recipient: "requester",
        entityType: "user",
        entityId: recipient.id,
        recipientContact: to,
        subject: input.title || null,
        bodyPreview: input.message,
        errorMessage: error instanceof Error ? error.message : "SMS delivery failed.",
        isTest: false,
      });
    }
  }

  return counts;
}

async function sendPushMessages(input: {
  recipients: OutboundRecipient[];
  title: string;
  message: string;
}): Promise<ChannelSendCounts> {
  const counts = emptyCounts();
  const targets = input.recipients.map((recipient) => toPushTarget(recipient.id));

  try {
    await broadcastPushNotification({
      targets,
      title: input.title,
      message: input.message,
      persistence: "temporary",
      channels: ["websocket", "fcm"],
      data: { source: "admin.broadcast", type: "admin.broadcast" },
    });

    counts.sent = input.recipients.length;
    queueNotificationDeliveryLog({
      status: "sent",
      module: "system",
      event: EVENT,
      channel: "push",
      recipient: "requester",
      entityType: "user",
      recipientContact: `${input.recipients.length} user target(s)`,
      subject: input.title,
      bodyPreview: input.message,
      isTest: false,
    });
  } catch (error) {
    counts.failed = input.recipients.length;
    queueNotificationDeliveryLog({
      status: "failed",
      module: "system",
      event: EVENT,
      channel: "push",
      recipient: "requester",
      entityType: "user",
      recipientContact: `${input.recipients.length} user target(s)`,
      subject: input.title,
      bodyPreview: input.message,
      errorMessage: error instanceof Error ? error.message : "Push delivery failed.",
      isTest: false,
    });
  }

  return counts;
}

export async function sendAdminOutboundMessage(input: {
  channels: OutboundChannel[];
  audience?: string | null;
  userIds: string[];
  title: string;
  message: string;
}) {
  if (input.channels.length === 0) {
    throw new OutboundMessageError("Select at least one channel.");
  }

  const recipients = await resolveOutboundRecipients({
    userIds: input.userIds,
    audience: input.audience,
  });

  if (recipients.length === 0) {
    throw new OutboundMessageError("Select at least one recipient or audience.");
  }

  if (recipients.length > MAX_RECIPIENTS) {
    throw new OutboundMessageError(`A broadcast can include at most ${MAX_RECIPIENTS} recipients.`);
  }

  await assertChannelsReady(input.channels);

  const results: Partial<Record<OutboundChannel, ChannelSendCounts>> = {};

  if (input.channels.includes("email")) {
    results.email = await sendEmails({
      recipients,
      title: input.title,
      message: input.message,
    });
  }

  if (input.channels.includes("sms")) {
    results.sms = await sendSmsMessages({
      recipients,
      title: input.title,
      message: input.message,
    });
  }

  if (input.channels.includes("push")) {
    results.push = await sendPushMessages({
      recipients,
      title: input.title,
      message: input.message,
    });
  }

  const totalSent = Object.values(results).reduce((sum, counts) => sum + (counts?.sent ?? 0), 0);
  if (totalSent === 0) {
    throw new OutboundMessageError("Message could not be delivered to any recipient.");
  }

  return {
    recipientCount: recipients.length,
    results,
  };
}
