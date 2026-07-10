import type {
  NotificationModule,
  NotificationTemplateRecipient,
  RideRequestNotificationEvent,
  UserRegistrationNotificationEvent,
} from "@smart-dispatch/types";
import { findRideRequestById } from "../models/ride-request.model";
import { findUserByIdWithRoles } from "../models/user.model";
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

function buildSampleContextForModule(module: NotificationModule): TemplateContext {
  switch (module) {
    case "user_registrations":
      return buildUserRegistrationSampleContext();
    case "insurance":
      return buildInsuranceSampleContext();
    case "inspection":
      return buildInspectionSampleContext();
    default:
      return buildRideRequestSampleContext();
  }
}

function buildRideRequestContext(
  rideRequest: NonNullable<Awaited<ReturnType<typeof findRideRequestById>>>,
): TemplateContext {
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

function resolveRideRequestContact(
  rideRequest: NonNullable<Awaited<ReturnType<typeof findRideRequestById>>>,
  recipient: NotificationTemplateRecipient,
  channel: "email" | "sms",
) {
  const user =
    recipient === "driver" ? rideRequest.assignedDriver : rideRequest.requester;

  if (!user) {
    return null;
  }

  return channel === "email" ? user.email?.trim() || null : user.mobileNumber?.trim() || null;
}

function resolveUserRegistrationContact(
  user: NonNullable<Awaited<ReturnType<typeof findUserByIdWithRoles>>>,
  channel: "email" | "sms",
) {
  return channel === "email" ? user.email?.trim() || null : user.mobileNumber?.trim() || null;
}

function moduleToEntityType(module: NotificationModule) {
  switch (module) {
    case "ride_requests":
      return "ride_request";
    case "user_registrations":
      return "user";
    case "insurance":
    case "inspection":
      return "vehicle";
  }
}

function logDeliveryAttempt(input: {
  status: "sent" | "skipped" | "failed";
  template: {
    id: string;
    module: string;
    event: string;
    channel: "email" | "sms";
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
) {
  const templates = await listEnabledNotificationTemplates(module, event);

  if (templates.length === 0) {
    return;
  }

  for (const template of templates) {
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

  await dispatchTemplates("ride_requests", event, rideRequestId, context, (template) =>
    resolveRideRequestContact(rideRequest, template.recipient, template.channel),
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

  await dispatchTemplates("user_registrations", event, userId, context, (template) =>
    resolveUserRegistrationContact(user, template.channel),
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
      template.channel === "email"
        ? "A test email address is required."
        : "A test phone number is required.",
    );
  }

  const context = buildSampleContextForModule(template.module as NotificationModule);

  const renderedBody = renderNotificationTemplate(template.body, context);
  const renderedSubject =
    template.channel === "email"
      ? renderNotificationTemplate(template.subject ?? "", context).trim()
      : null;

  try {
    await deliverTemplate(template, context, contact);
    logDeliveryAttempt({
      status: "sent",
      template,
      entityId: template.id,
      recipientContact: contact,
      subject: renderedSubject,
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
      subject: renderedSubject,
      bodyPreview: renderedBody,
      errorMessage: message,
      isTest: true,
    });
    throw error;
  }
}

export function validateNotificationTemplateInput(input: {
  module: NotificationModule;
  channel: "email" | "sms";
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

    if (input.channel === "email") {
      const subject = input.subject?.trim() ?? "";
      if (!subject) {
        return "Email subject is required when email notifications are enabled.";
      }

      if (subject.length > 255) {
        return "Email subject must be 255 characters or fewer.";
      }
    }
  }

  if (input.body !== undefined && input.body.trim().length > 2000) {
    return "Message body must be 2000 characters or fewer.";
  }

  if (input.subject !== undefined && input.subject && input.subject.trim().length > 255) {
    return "Email subject must be 255 characters or fewer.";
  }

  return null;
}

export {
  EmailConfigurationError,
  EmailDeliveryError,
  SmsConfigurationError,
  SmsDeliveryError,
};
