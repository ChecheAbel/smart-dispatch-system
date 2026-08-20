import type {
  GeofencingNotificationEvent,
  InvoiceNotificationEvent,
  NotificationChannel,
  NotificationModule,
  NotificationTemplateRecipient,
  PasswordResetNotificationEvent,
  RideRequestNotificationEvent,
  UserRegistrationNotificationEvent,
  VehicleGeofenceStatus,
} from "@smart-dispatch/types";
import { findRideRequestById } from "../models/ride-request.model";
import { findInvoiceById } from "../models/invoice.model";
import { findUserByEmail, findUserByIdWithRoles } from "../models/user.model";
import { findVehicleById } from "../models/vehicle.model";
import { getRideRequestSettings } from "../models/app-setting.model";
import {
  findNotificationTemplateById,
  listEnabledNotificationTemplates,
} from "../models/notification-template.model";
import { queueNotificationDeliveryLog } from "../models/notification-delivery-log.model";
import {
  renderNotificationTemplate,
  validateNotificationTemplatePlaceholders,
} from "./notification-template.service";
import { sendEmailMessage, EmailConfigurationError, EmailDeliveryError } from "./email.service";
import { sendAfroSmsMessage, SmsConfigurationError, SmsDeliveryError } from "./sms.service";
import {
  broadcastPushNotification,
  isPushNotificationConfigured,
  toPushTarget,
  PushNotificationConfigurationError,
  PushNotificationDeliveryError,
} from "./push-notification.service";

type TemplateContext = Record<string, string>;

function formatPersonName(parts: {
  firstName: string;
  middleName: string | null;
  lastName: string;
}) {
  return [parts.firstName, parts.middleName, parts.lastName].filter(Boolean).join(" ");
}

function formatScheduledAt(value: Date | null) {
  if (!value) {
    return "—";
  }

  return value.toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatSegment(segment?: string | null) {
  if (!segment) {
    return "—";
  }

  return segment.replace(/_/g, " ");
}

function buildRideRequestSampleContext(): TemplateContext {
  return {
    requester_name: "Jane Doe",
    driver_name: "Driver Smith",
    pickup: "Bole International Airport",
    dropoff: "Sheraton Addis",
    scheduled_at: "15 Jul 2026, 14:30",
    passengers: "2",
    vehicle_plate: "AA-1-53421",
    rejection_reason: "No vehicles available for the requested time.",
    status: "confirmed",
    reference: "A1B2C3D4",
    cancel_deadline_minutes: "15",
    cancel_deadline_at: "15 Jul 2026, 14:45",
    reminder_hours: "2",
  };
}

function buildUserRegistrationSampleContext(): TemplateContext {
  return {
    applicant_name: "Jane Doe",
    applicant_email: "jane@example.com",
    applicant_mobile: "+251911234567",
    segment: "business",
    organization_name: "Acme Trading PLC",
    rejection_reason: "Supporting documents could not be verified.",
    reference: "A1B2C3D4",
  };
}

function buildInsuranceSampleContext(): TemplateContext {
  return {
    vehicle_plate: "AA-1-53421",
    vehicle_type: "Sedan",
    vehicle_class: "Standard",
    assigned_driver_name: "Driver Smith",
    insurance_provider: "Nyala Insurance",
    insurance_policy_number: "POL-2026-001",
    insurance_expires_at: "15 Aug 2026",
    days_until_expiry: "14",
    days_overdue: "7",
    reference: "A1B2C3D4",
  };
}

function buildInspectionSampleContext(): TemplateContext {
  return {
    vehicle_plate: "AA-1-53421",
    vehicle_type: "Sedan",
    vehicle_class: "Standard",
    assigned_driver_name: "Driver Smith",
    inspection_center: "Addis Ababa Vehicle Inspection",
    inspection_certificate_number: "INS-45821",
    inspection_performed_at: "15 Jan 2026",
    inspection_expires_at: "15 Jan 2027",
    days_until_expiry: "14",
    days_overdue: "7",
    reference: "A1B2C3D4",
  };
}

function buildInvoiceSampleContext(): TemplateContext {
  return {
    invoice_reference: "INV-2026-0001",
    contract_reference: "CTR-2026-0001",
    contract_title: "Ministry shuttle agreement",
    customer_name: "Jane Doe",
    organization_name: "Acme Trading PLC",
    billing_contact_name: "Finance Team",
    period_start: "1 Jul 2026",
    period_end: "31 Jul 2026",
    total_amount: "12,450.00",
    currency: "ETB",
    due_at: "14 Aug 2026",
    days_until_due: "3",
    days_overdue: "5",
    payment_terms_days: "14",
    reference: "INV-2026-0001",
  };
}

function buildPasswordResetSampleContext(): TemplateContext {
  return {
    user_name: "Jane Doe",
    user_email: "jane@example.com",
    user_mobile: "+251911234567",
    reset_link: "https://example.com/U@RQ$f/reset-password?token=sample-token",
    reset_code: "123456",
    expires_minutes: "10",
    reference: "A1B2C3D4",
  };
}

function buildGeofencingSampleContext(): TemplateContext {
  return {
    driver_name: "Driver Smith",
    vehicle_plate: "AA-1-53421",
    geofence_name: "Addis operating zone",
    geofence_kind: "allowed",
    violation_type: "outside_allowed",
    latitude: "9.03000",
    longitude: "38.74000",
    reference: "A1B2C3D4",
  };
}

function buildSampleContextForModule(module: NotificationModule): TemplateContext {
  switch (module) {
    case "user_registrations":
      return buildUserRegistrationSampleContext();
    case "insurance":
      return buildInsuranceSampleContext();
    case "inspection":
      return buildInspectionSampleContext();
    case "invoices":
      return buildInvoiceSampleContext();
    case "password_reset":
      return buildPasswordResetSampleContext();
    case "geofencing":
      return buildGeofencingSampleContext();
    default:
      return buildRideRequestSampleContext();
  }
}

function formatDateOnly(value: Date | null | undefined) {
  if (!value) {
    return "—";
  }

  return value.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatMoneyAmount(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) {
    return "—";
  }

  return value.toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function daysUntil(date: Date | null | undefined, from: Date = new Date()) {
  if (!date) {
    return "—";
  }

  const diffMs = date.getTime() - from.getTime();
  return String(Math.max(0, Math.ceil(diffMs / 86_400_000)));
}

function daysOverdue(date: Date | null | undefined, from: Date = new Date()) {
  if (!date) {
    return "—";
  }

  const diffMs = from.getTime() - date.getTime();
  return String(Math.max(0, Math.ceil(diffMs / 86_400_000)));
}

function buildRideRequestContext(
  rideRequest: NonNullable<Awaited<ReturnType<typeof findRideRequestById>>>,
): TemplateContext {
  const settings = getRideRequestSettings();
  const cancelDeadlineMinutes = settings.ride_request_cancel_grace_minutes;
  const cancelDeadlineAt = new Date(
    rideRequest.createdAt.getTime() + cancelDeadlineMinutes * 60 * 1000,
  );

  return {
    requester_name: rideRequest.requester
      ? formatPersonName(rideRequest.requester)
      : "—",
    driver_name: rideRequest.assignedDriver
      ? formatPersonName(rideRequest.assignedDriver)
      : "—",
    pickup: rideRequest.pickupAddress,
    dropoff: rideRequest.dropoffAddress,
    scheduled_at: formatScheduledAt(rideRequest.scheduledAt),
    passengers: String(rideRequest.passengerCount),
    vehicle_plate: rideRequest.assignedVehicle?.plateNumber ?? "—",
    rejection_reason: rideRequest.rejectionReason ?? "—",
    status: rideRequest.status,
    reference: rideRequest.id.slice(0, 8).toUpperCase(),
    cancel_deadline_minutes: String(cancelDeadlineMinutes),
    cancel_deadline_at: formatScheduledAt(cancelDeadlineAt),
    reminder_hours: String(settings.ride_request_reminder_hours),
  };
}

function buildUserRegistrationContext(
  user: NonNullable<Awaited<ReturnType<typeof findUserByIdWithRoles>>>,
  rejectionReason?: string | null,
): TemplateContext {
  return {
    applicant_name: formatPersonName(user),
    applicant_email: user.email,
    applicant_mobile: user.mobileNumber,
    segment: formatSegment(user.requesterProfile?.segment),
    organization_name: user.requesterProfile?.organizationName ?? "—",
    rejection_reason: rejectionReason?.trim() || user.accountBlockReason || "—",
    reference: user.id.slice(0, 8).toUpperCase(),
  };
}

function buildPasswordResetContext(
  user: NonNullable<Awaited<ReturnType<typeof findUserByIdWithRoles>>>,
  input: {
    resetLink?: string;
    resetCode?: string;
    expiresMinutes: number;
  },
): TemplateContext {
  return {
    user_name: formatPersonName(user),
    user_email: user.email,
    user_mobile: user.mobileNumber ?? "—",
    reset_link: input.resetLink ?? "—",
    reset_code: input.resetCode ?? "—",
    expires_minutes: String(input.expiresMinutes),
    reference: user.id.slice(0, 8).toUpperCase(),
  };
}

function buildInvoiceContext(
  invoice: NonNullable<Awaited<ReturnType<typeof findInvoiceById>>>,
): TemplateContext {
  const profile = invoice.requester.requesterProfile;

  return {
    invoice_reference: invoice.referenceNumber,
    contract_reference: invoice.contract.referenceNumber,
    contract_title: invoice.contract.title,
    customer_name: formatPersonName(invoice.requester),
    organization_name: profile?.organizationName ?? "—",
    billing_contact_name: profile?.billingContactName ?? "—",
    period_start: formatDateOnly(invoice.periodStart),
    period_end: formatDateOnly(invoice.periodEnd),
    total_amount: formatMoneyAmount(Number(invoice.totalAmount)),
    currency: invoice.currency,
    due_at: formatDateOnly(invoice.dueAt),
    days_until_due: daysUntil(invoice.dueAt),
    days_overdue: daysOverdue(invoice.dueAt),
    payment_terms_days:
      invoice.paymentTermsDays != null ? String(invoice.paymentTermsDays) : "—",
    reference: invoice.referenceNumber,
  };
}

function resolveRideRequestContact(
  rideRequest: NonNullable<Awaited<ReturnType<typeof findRideRequestById>>>,
  recipient: NotificationTemplateRecipient,
  channel: NotificationChannel,
) {
  const user =
    recipient === "driver" ? rideRequest.assignedDriver : rideRequest.requester;

  if (!user) {
    return null;
  }

  return channel === "sms" ? user.mobileNumber?.trim() || null : user.email?.trim() || null;
}

function resolveUserRegistrationContact(
  user: NonNullable<Awaited<ReturnType<typeof findUserByIdWithRoles>>>,
  channel: NotificationChannel,
) {
  return channel === "sms" ? user.mobileNumber?.trim() || null : user.email?.trim() || null;
}

function resolvePasswordResetContact(
  user: NonNullable<Awaited<ReturnType<typeof findUserByIdWithRoles>>>,
  channel: NotificationChannel,
) {
  return resolveUserRegistrationContact(user, channel);
}

function resolveRideRequestUserId(
  rideRequest: NonNullable<Awaited<ReturnType<typeof findRideRequestById>>>,
  recipient: NotificationTemplateRecipient,
) {
  if (recipient === "driver") {
    return rideRequest.assignedDriverUserId;
  }

  if (recipient === "requester") {
    return rideRequest.requesterUserId;
  }

  return null;
}

function resolveUserRegistrationUserId(
  user: NonNullable<Awaited<ReturnType<typeof findUserByIdWithRoles>>>,
  recipient: NotificationTemplateRecipient,
) {
  if (recipient === "applicant") {
    return user.id;
  }

  return null;
}

function resolvePasswordResetUserId(
  user: NonNullable<Awaited<ReturnType<typeof findUserByIdWithRoles>>>,
  recipient: NotificationTemplateRecipient,
) {
  if (recipient === "applicant") {
    return user.id;
  }

  return null;
}

function resolveInvoiceUserId(
  invoice: NonNullable<Awaited<ReturnType<typeof findInvoiceById>>>,
  recipient: NotificationTemplateRecipient,
) {
  if (recipient === "requester" || recipient === "account_holder") {
    return invoice.requesterUserId;
  }

  return null;
}

function formatPushTitle(module: NotificationModule, event: string) {
  const label = `${module}.${event}`.replace(/_/g, " ");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

async function dispatchPushNotifications(
  module: NotificationModule,
  event: string,
  entityId: string,
  context: TemplateContext,
  templates: Awaited<ReturnType<typeof listEnabledNotificationTemplates>>,
  resolveUserId: (
    template: Awaited<ReturnType<typeof listEnabledNotificationTemplates>>[number],
  ) => string | null,
) {
  if (!isPushNotificationConfigured() || templates.length === 0) {
    return;
  }

  const seenUserIds = new Set<string>();

  for (const template of templates) {
    if (template.channel !== "push") {
      continue;
    }

    const userId = resolveUserId(template);
    const renderedSubject = renderNotificationTemplate(template.subject ?? "", context).trim();
    const message = renderNotificationTemplate(template.body, context).trim();
    const title = renderedSubject || formatPushTitle(module, event);
    const pushTarget = userId ? toPushTarget(userId) : null;

    if (!userId || seenUserIds.has(userId)) {
      if (!userId) {
        logPushDeliveryAttempt({
          status: "skipped",
          module,
          event,
          recipient: template.recipient,
          entityId,
          entityType: moduleToEntityType(module),
          templateId: template.id,
          subject: title,
          bodyPreview: message,
          errorMessage: "Recipient user ID is missing.",
        });
      }
      continue;
    }

    seenUserIds.add(userId);

    if (!message) {
      logPushDeliveryAttempt({
        status: "skipped",
        module,
        event,
        recipient: template.recipient,
        entityId,
        entityType: moduleToEntityType(module),
        templateId: template.id,
        recipientContact: pushTarget,
        subject: title,
        errorMessage: "Push message body is empty.",
      });
      continue;
    }

    try {
      await broadcastPushNotification({
        targets: [pushTarget!],
        title,
        message,
        channels: ["fcm"],
        data: {
          type: `${module}.${event}`,
          module,
          event,
          entityId,
          recipient: template.recipient,
        },
      });
      logPushDeliveryAttempt({
        status: "sent",
        module,
        event,
        recipient: template.recipient,
        entityId,
        entityType: moduleToEntityType(module),
        templateId: template.id,
        recipientContact: pushTarget,
        subject: title,
        bodyPreview: message,
      });
      console.log(
        `[Push] Sent ${module}/${event}/${template.recipient} to user ${userId}.`,
      );
    } catch (error) {
      const messageText =
        error instanceof PushNotificationConfigurationError ||
        error instanceof PushNotificationDeliveryError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Unknown push notification error.";
      logPushDeliveryAttempt({
        status: "failed",
        module,
        event,
        recipient: template.recipient,
        entityId,
        entityType: moduleToEntityType(module),
        templateId: template.id,
        recipientContact: pushTarget,
        subject: title,
        bodyPreview: message,
        errorMessage: messageText,
      });
      console.error(
        `[Push] Failed ${module}/${event}/${template.recipient} for ${entityId}: ${messageText}`,
      );
    }
  }
}

function resolveInvoiceContact(
  invoice: NonNullable<Awaited<ReturnType<typeof findInvoiceById>>>,
  recipient: NotificationTemplateRecipient,
  channel: NotificationChannel,
) {
  if (recipient !== "requester") {
    return null;
  }

  const profile = invoice.requester.requesterProfile;

  if (channel === "sms") {
    return invoice.requester.mobileNumber?.trim() || null;
  }

  return profile?.billingContactEmail?.trim() || invoice.requester.email?.trim() || null;
}

function moduleToEntityType(module: NotificationModule) {
  switch (module) {
    case "ride_requests":
      return "ride_request";
    case "user_registrations":
      return "user";
    case "insurance":
    case "inspection":
    case "geofencing":
      return "vehicle";
    case "invoices":
      return "invoice";
    case "password_reset":
      return "user";
    case "system":
      return "system";
  }
}

function logDeliveryAttempt(input: {
  status: "sent" | "skipped" | "failed";
  template: {
    id: string;
    module: string;
    event: string;
    channel: NotificationChannel;
    recipient: NotificationTemplateRecipient;
  };
  entityId: string;
  recipientContact?: string | null;
  subject?: string | null;
  bodyPreview?: string | null;
  errorMessage?: string | null;
  isTest?: boolean;
}) {
  queueNotificationDeliveryLog({
    status: input.status,
    module: input.template.module as NotificationModule,
    event: input.template.event,
    channel: input.template.channel,
    recipient: input.template.recipient,
    templateId: input.template.id,
    entityType: input.isTest ? "test" : moduleToEntityType(input.template.module as NotificationModule),
    entityId: input.isTest ? null : input.entityId,
    recipientContact: input.recipientContact,
    subject: input.subject,
    bodyPreview: input.bodyPreview,
    errorMessage: input.errorMessage,
    isTest: input.isTest ?? false,
  });
}

function logPushDeliveryAttempt(input: {
  status: "sent" | "skipped" | "failed";
  module: NotificationModule;
  event: string;
  recipient: NotificationTemplateRecipient;
  entityId?: string | null;
  entityType?: string | null;
  templateId?: string | null;
  recipientContact?: string | null;
  subject?: string | null;
  bodyPreview?: string | null;
  errorMessage?: string | null;
  isTest?: boolean;
}) {
  queueNotificationDeliveryLog({
    status: input.status,
    module: input.module,
    event: input.event,
    channel: "push",
    recipient: input.recipient,
    templateId: input.templateId ?? null,
    entityType: input.entityType ?? null,
    entityId: input.entityId ?? null,
    recipientContact: input.recipientContact,
    subject: input.subject,
    bodyPreview: input.bodyPreview,
    errorMessage: input.errorMessage,
    isTest: input.isTest ?? false,
  });
}

async function deliverTemplate(
  template: Awaited<ReturnType<typeof listEnabledNotificationTemplates>>[number],
  context: TemplateContext,
  contactOverride?: string,
) {
  const renderedBody = renderNotificationTemplate(template.body, context);

  if (template.channel === "email") {
    const to = contactOverride?.trim();
    if (!to) {
      throw new EmailDeliveryError("Recipient email is required.");
    }

    const subject = renderNotificationTemplate(template.subject ?? "", context).trim();
    if (!subject) {
      throw new EmailDeliveryError("Email subject is required.");
    }

    return sendEmailMessage({ to, subject, body: renderedBody });
  }

  if (template.channel === "push") {
    throw new PushNotificationDeliveryError("Push templates are delivered through FCM, not email or SMS.");
  }

  const to = contactOverride?.trim();
  if (!to) {
    throw new SmsDeliveryError("Recipient phone number is required.");
  }

  return sendAfroSmsMessage({ to, message: renderedBody });
}

async function dispatchTemplates(
  module: NotificationModule,
  event: string,
  entityId: string,
  context: TemplateContext,
  resolveContact: (
    template: Awaited<ReturnType<typeof listEnabledNotificationTemplates>>[number],
  ) => string | null,
  resolveUserId?: (
    template: Awaited<ReturnType<typeof listEnabledNotificationTemplates>>[number],
  ) => string | null,
) {
  const templates = await listEnabledNotificationTemplates(module, event);

  if (templates.length === 0) {
    return;
  }

  for (const template of templates) {
    if (template.channel === "push") {
      continue;
    }

    const renderedBody = renderNotificationTemplate(template.body, context);
    const renderedSubject =
      template.channel === "email"
        ? renderNotificationTemplate(template.subject ?? "", context).trim()
        : null;

    try {
      const contact = resolveContact(template);
      if (!contact) {
        console.warn(
          `[Notification] Skipped ${module}/${event}/${template.channel}/${template.recipient}: missing contact.`,
        );
        logDeliveryAttempt({
          status: "skipped",
          template,
          entityId,
          subject: renderedSubject,
          bodyPreview: renderedBody,
          errorMessage: "Recipient contact is missing.",
        });
        continue;
      }

      await deliverTemplate(template, context, contact);
      logDeliveryAttempt({
        status: "sent",
        template,
        entityId,
        recipientContact: contact,
        subject: renderedSubject,
        bodyPreview: renderedBody,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown notification error.";
      console.error(
        `[Notification] Failed ${module}/${event}/${template.channel}/${template.recipient} for ${entityId}: ${message}`,
      );
      logDeliveryAttempt({
        status: "failed",
        template,
        entityId,
        recipientContact: resolveContact(template),
        subject: renderedSubject,
        bodyPreview: renderedBody,
        errorMessage: message,
      });
    }
  }

  if (resolveUserId) {
    await dispatchPushNotifications(
      module,
      event,
      entityId,
      context,
      templates,
      resolveUserId,
    );
  }
}

export async function sendRideRequestNotifications(
  event: RideRequestNotificationEvent,
  rideRequestId: string,
) {
  const rideRequest = await findRideRequestById(rideRequestId);
  if (!rideRequest) {
    return;
  }

  const context = buildRideRequestContext(rideRequest);

  await dispatchTemplates(
    "ride_requests",
    event,
    rideRequestId,
    context,
    (template) => resolveRideRequestContact(rideRequest, template.recipient, template.channel),
    (template) => resolveRideRequestUserId(rideRequest, template.recipient),
  );
}

export async function sendUserRegistrationNotifications(
  event: UserRegistrationNotificationEvent,
  userId: string,
  options: { rejectionReason?: string | null } = {},
) {
  const user = await findUserByIdWithRoles(userId);
  if (!user) {
    return;
  }

  const context = buildUserRegistrationContext(user, options.rejectionReason);

  await dispatchTemplates(
    "user_registrations",
    event,
    userId,
    context,
    (template) => resolveUserRegistrationContact(user, template.channel),
    (template) => resolveUserRegistrationUserId(user, template.recipient),
  );
}

export async function sendPasswordResetNotifications(
  event: PasswordResetNotificationEvent,
  userId: string,
  input: {
    resetLink?: string;
    resetCode?: string;
    expiresMinutes: number;
  },
) {
  const user = await findUserByIdWithRoles(userId);
  if (!user) {
    return;
  }

  const context = buildPasswordResetContext(user, input);

  await dispatchTemplates(
    "password_reset",
    event,
    userId,
    context,
    (template) => resolvePasswordResetContact(user, template.channel),
    (template) => resolvePasswordResetUserId(user, template.recipient),
  );
}

export async function sendInvoiceNotifications(
  event: InvoiceNotificationEvent,
  invoiceId: string,
) {
  const invoice = await findInvoiceById(invoiceId);
  if (!invoice) {
    return;
  }

  const context = buildInvoiceContext(invoice);

  await dispatchTemplates(
    "invoices",
    event,
    invoiceId,
    context,
    (template) => resolveInvoiceContact(invoice, template.recipient, template.channel),
    (template) => resolveInvoiceUserId(invoice, template.recipient),
  );
}

export function queueRideRequestNotifications(
  event: RideRequestNotificationEvent,
  rideRequestId: string,
) {
  void sendRideRequestNotifications(event, rideRequestId);
}

export function queueUserRegistrationNotifications(
  event: UserRegistrationNotificationEvent,
  userId: string,
  options: { rejectionReason?: string | null } = {},
) {
  void sendUserRegistrationNotifications(event, userId, options);
}

export function queuePasswordResetNotifications(
  event: PasswordResetNotificationEvent,
  userId: string,
  input: {
    resetLink?: string;
    resetCode?: string;
    expiresMinutes: number;
  },
) {
  void sendPasswordResetNotifications(event, userId, input);
}

export function queueInvoiceNotifications(
  event: InvoiceNotificationEvent,
  invoiceId: string,
) {
  void sendInvoiceNotifications(event, invoiceId);
}

const GEOFENCE_VIOLATION_COOLDOWN_MS = 10 * 60 * 1000;

type GeofenceViolationMemory = {
  violating: boolean;
  lastNotifiedAt: number | null;
};

const geofenceViolationMemory = new Map<string, GeofenceViolationMemory>();

function isGeofenceViolating(status: VehicleGeofenceStatus) {
  return (
    (status.kind === "allowed" && !status.inside) ||
    (status.kind === "restricted" && status.inside)
  );
}

function geofenceViolationType(status: VehicleGeofenceStatus) {
  if (status.kind === "allowed" && !status.inside) {
    return "outside_allowed";
  }
  if (status.kind === "restricted" && status.inside) {
    return "inside_restricted";
  }
  return "ok";
}

function shouldNotifyGeofenceViolation(vehicleId: string, status: VehicleGeofenceStatus) {
  const key = `${vehicleId}:${status.id}`;
  const now = Date.now();
  const previous = geofenceViolationMemory.get(key);
  const currentlyViolating = isGeofenceViolating(status);

  if (!currentlyViolating) {
    geofenceViolationMemory.set(key, { violating: false, lastNotifiedAt: previous?.lastNotifiedAt ?? null });
    return false;
  }

  const enteredViolation = !previous?.violating;
  const cooldownElapsed =
    previous?.lastNotifiedAt == null ||
    now - previous.lastNotifiedAt >= GEOFENCE_VIOLATION_COOLDOWN_MS;

  const shouldNotify = enteredViolation && cooldownElapsed;

  geofenceViolationMemory.set(key, {
    violating: true,
    lastNotifiedAt: shouldNotify ? now : previous?.lastNotifiedAt ?? null,
  });

  return shouldNotify;
}

export async function sendGeofenceViolationNotifications(
  vehicleId: string,
  status: VehicleGeofenceStatus,
  options: {
    driverUserId?: string | null;
    latitude: number;
    longitude: number;
  },
) {
  const vehicle = await findVehicleById(vehicleId);
  if (!vehicle) {
    return;
  }

  let driver = vehicle.assignedDriver;
  if (!driver && options.driverUserId) {
    driver = await findUserByIdWithRoles(options.driverUserId);
  }

  const driverUserId = vehicle.assignedDriverUserId ?? options.driverUserId ?? null;
  if (!driverUserId) {
    return;
  }

  const context: TemplateContext = {
    driver_name: driver
      ? formatPersonName({
          firstName: driver.firstName,
          middleName: driver.middleName,
          lastName: driver.lastName,
        })
      : "Driver",
    vehicle_plate: vehicle.plateNumber,
    geofence_name: status.name,
    geofence_kind: status.kind,
    violation_type: geofenceViolationType(status),
    latitude: options.latitude.toFixed(5),
    longitude: options.longitude.toFixed(5),
    reference: vehicleId.slice(0, 8).toUpperCase(),
  };

  const event: GeofencingNotificationEvent = "violation";

  await dispatchTemplates(
    "geofencing",
    event,
    vehicleId,
    context,
    (template) => {
      if (template.recipient !== "driver" || !driver) {
        return null;
      }
      if (template.channel === "sms") {
        return driver.mobileNumber?.trim() || null;
      }
      return driver.email?.trim() || null;
    },
    (template) => (template.recipient === "driver" ? driverUserId : null),
  );
}

export function queueGeofenceViolationNotifications(
  vehicleId: string,
  statuses: VehicleGeofenceStatus[],
  options: {
    driverUserId?: string | null;
    latitude: number;
    longitude: number;
  },
) {
  for (const status of statuses) {
    if (!shouldNotifyGeofenceViolation(vehicleId, status)) {
      continue;
    }

    void sendGeofenceViolationNotifications(vehicleId, status, options);
  }
}

export async function sendNotificationTemplateTest(
  templateId: string,
  contactOverride?: string,
) {
  const template = await findNotificationTemplateById(templateId);
  if (!template) {
    throw new Error("Notification template not found.");
  }

  const contact = contactOverride?.trim();
  if (!contact) {
    throw new Error(
      template.channel === "email" || template.channel === "push"
        ? "A test email address is required."
        : "A test phone number is required.",
    );
  }

  const context = buildSampleContextForModule(template.module as NotificationModule);
  const renderedBody = renderNotificationTemplate(template.body, context);
  const renderedSubject = renderNotificationTemplate(template.subject ?? "", context).trim();

  if (template.channel === "push") {
    const user = await findUserByEmail(contact);
    if (!user) {
      throw new Error("No user was found with that email address.");
    }

    const title = renderedSubject || formatPushTitle(template.module as NotificationModule, template.event);

    try {
      await broadcastPushNotification({
        targets: [toPushTarget(user.id)],
        title,
        message: renderedBody,
        channels: ["fcm"],
        data: {
          type: `${template.module}.${template.event}`,
          module: template.module,
          event: template.event,
          entityId: template.id,
          recipient: template.recipient,
        },
      });
      logPushDeliveryAttempt({
        status: "sent",
        module: template.module as NotificationModule,
        event: template.event,
        recipient: template.recipient,
        entityId: template.id,
        entityType: "test",
        templateId: template.id,
        recipientContact: toPushTarget(user.id),
        subject: title,
        bodyPreview: renderedBody,
        isTest: true,
      });
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown notification error.";
      logPushDeliveryAttempt({
        status: "failed",
        module: template.module as NotificationModule,
        event: template.event,
        recipient: template.recipient,
        entityId: template.id,
        entityType: "test",
        templateId: template.id,
        recipientContact: toPushTarget(user.id),
        subject: title,
        bodyPreview: renderedBody,
        errorMessage: message,
        isTest: true,
      });
      throw error;
    }
  }

  const renderedEmailSubject =
    template.channel === "email" ? renderedSubject : null;

  try {
    await deliverTemplate(template, context, contact);
    logDeliveryAttempt({
      status: "sent",
      template,
      entityId: template.id,
      recipientContact: contact,
      subject: renderedEmailSubject,
      bodyPreview: renderedBody,
      isTest: true,
    });
    return;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown notification error.";
    logDeliveryAttempt({
      status: "failed",
      template,
      entityId: template.id,
      recipientContact: contact,
      subject: renderedEmailSubject,
      bodyPreview: renderedBody,
      errorMessage: message,
      isTest: true,
    });
    throw error;
  }
}

export function validateNotificationTemplateInput(input: {
  module: NotificationModule;
  channel: "email" | "sms" | "push";
  isEnabled?: boolean;
  subject?: string | null;
  body?: string;
}) {
  const placeholderError = validateNotificationTemplatePlaceholders(input.module, {
    subject: input.subject,
    body: input.body,
  });

  if (placeholderError) {
    return placeholderError;
  }

  if (input.isEnabled) {
    const body = input.body?.trim() ?? "";
    if (!body) {
      return "Message body is required when notifications are enabled.";
    }

    if (body.length > 2000) {
      return "Message body must be 2000 characters or fewer.";
    }

    if (input.channel === "email" || input.channel === "push") {
      const subject = input.subject?.trim() ?? "";
      if (!subject) {
        return input.channel === "push"
          ? "Push title is required when push notifications are enabled."
          : "Email subject is required when email notifications are enabled.";
      }

      if (subject.length > 255) {
        return "Title must be 255 characters or fewer.";
      }
    }
  }

  if (input.body !== undefined && input.body.trim().length > 2000) {
    return "Message body must be 2000 characters or fewer.";
  }

  if (input.subject !== undefined && input.subject && input.subject.trim().length > 255) {
    return "Title must be 255 characters or fewer.";
  }

  return null;
}

export {
  EmailConfigurationError,
  EmailDeliveryError,
  SmsConfigurationError,
  SmsDeliveryError,
  PushNotificationConfigurationError,
  PushNotificationDeliveryError,
};
