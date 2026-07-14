import type {
  NotificationChannel,
  NotificationModule,
  NotificationTemplateRecipient,
} from "@smart-dispatch/types";
import type {
  NotificationChannel as DbNotificationChannel,
  NotificationModule as DbNotificationModule,
  NotificationTemplateRecipient as DbNotificationTemplateRecipient,
} from "../generated/prisma";
import { prisma } from "../db/prisma";

export type NotificationTemplateSeed = {
  module: NotificationModule;
  event: string;
  channel: NotificationChannel;
  recipient: NotificationTemplateRecipient;
  subject?: string | null;
  body: string;
};

export type UpdateNotificationTemplateInput = {
  isEnabled?: boolean;
  subject?: string | null;
  body?: string;
};

const RIDE_REQUEST_RULES: NotificationTemplateSeed[] = [
  {
    module: "ride_requests",
    event: "created",
    channel: "email",
    recipient: "requester",
    subject: "Ride request received",
    body: "Hello {requester_name}, we received your ride request from {pickup} to {dropoff}. You can cancel within {cancel_deadline_minutes} minutes.",
  },
  {
    module: "ride_requests",
    event: "created",
    channel: "sms",
    recipient: "requester",
    body: "Smart Dispatch: your ride request from {pickup} to {dropoff} was received. Cancel within {cancel_deadline_minutes} minutes.",
  },
  {
    module: "ride_requests",
    event: "confirmed",
    channel: "email",
    recipient: "requester",
    subject: "Ride request approved",
    body: "Hello {requester_name}, your ride request from {pickup} to {dropoff} has been approved.",
  },
  {
    module: "ride_requests",
    event: "confirmed",
    channel: "sms",
    recipient: "requester",
    body: "Smart Dispatch: your ride request from {pickup} to {dropoff} was approved.",
  },
  {
    module: "ride_requests",
    event: "rejected",
    channel: "email",
    recipient: "requester",
    subject: "Ride request declined",
    body: "Hello {requester_name}, your ride request from {pickup} to {dropoff} was declined. Reason: {rejection_reason}",
  },
  {
    module: "ride_requests",
    event: "rejected",
    channel: "sms",
    recipient: "requester",
    body: "Smart Dispatch: your ride request was declined. Reason: {rejection_reason}",
  },
  {
    module: "ride_requests",
    event: "assigned",
    channel: "email",
    recipient: "requester",
    subject: "Vehicle assigned to your ride",
    body: "Hello {requester_name}, vehicle {vehicle_plate} with driver {driver_name} has been assigned to your trip from {pickup} to {dropoff}.",
  },
  {
    module: "ride_requests",
    event: "assigned",
    channel: "sms",
    recipient: "requester",
    body: "Smart Dispatch: {vehicle_plate} / {driver_name} assigned to your trip from {pickup} to {dropoff}.",
  },
  {
    module: "ride_requests",
    event: "assigned",
    channel: "email",
    recipient: "driver",
    subject: "New ride assignment",
    body: "Hello {driver_name}, you have been assigned to a ride for {requester_name} from {pickup} to {dropoff} in vehicle {vehicle_plate}.",
  },
  {
    module: "ride_requests",
    event: "assigned",
    channel: "sms",
    recipient: "driver",
    body: "Smart Dispatch: new assignment for {requester_name}. {pickup} to {dropoff}. Vehicle {vehicle_plate}.",
  },
  {
    module: "ride_requests",
    event: "started",
    channel: "email",
    recipient: "requester",
    subject: "Your trip has started",
    body: "Hello {requester_name}, your trip from {pickup} to {dropoff} with {driver_name} has started.",
  },
  {
    module: "ride_requests",
    event: "started",
    channel: "sms",
    recipient: "requester",
    body: "Smart Dispatch: your trip with {driver_name} has started.",
  },
  {
    module: "ride_requests",
    event: "started",
    channel: "email",
    recipient: "driver",
    subject: "Trip started",
    body: "Hello {driver_name}, the trip for {requester_name} from {pickup} to {dropoff} is now in progress.",
  },
  {
    module: "ride_requests",
    event: "started",
    channel: "sms",
    recipient: "driver",
    body: "Smart Dispatch: trip for {requester_name} started. {pickup} to {dropoff}.",
  },
  {
    module: "ride_requests",
    event: "completed",
    channel: "email",
    recipient: "requester",
    subject: "Trip completed",
    body: "Hello {requester_name}, your trip from {pickup} to {dropoff} has been completed. Thank you for riding with us.",
  },
  {
    module: "ride_requests",
    event: "completed",
    channel: "sms",
    recipient: "requester",
    body: "Smart Dispatch: your trip from {pickup} to {dropoff} is complete.",
  },
  {
    module: "ride_requests",
    event: "completed",
    channel: "email",
    recipient: "driver",
    subject: "Trip completed",
    body: "Hello {driver_name}, the trip for {requester_name} from {pickup} to {dropoff} has been completed.",
  },
  {
    module: "ride_requests",
    event: "completed",
    channel: "sms",
    recipient: "driver",
    body: "Smart Dispatch: trip for {requester_name} is complete.",
  },
  {
    module: "ride_requests",
    event: "cancelled",
    channel: "email",
    recipient: "requester",
    subject: "Ride request cancelled",
    body: "Hello {requester_name}, your ride request from {pickup} to {dropoff} has been cancelled before {cancel_deadline_at}.",
  },
  {
    module: "ride_requests",
    event: "cancelled",
    channel: "sms",
    recipient: "requester",
    body: "Smart Dispatch: your ride request from {pickup} to {dropoff} was cancelled before {cancel_deadline_at}.",
  },
];

const COMPLIANCE_EVENT_RULES = (
  module: "insurance" | "inspection",
  labels: {
    dueSoonSubject: string;
    dueSoonBodyEmail: string;
    dueSoonBodySms: string;
    expiredSubject: string;
    expiredBodyEmail: string;
    expiredBodySms: string;
  },
): NotificationTemplateSeed[] => [
  {
    module,
    event: "due_soon",
    channel: "email",
    recipient: "fleet_manager",
    subject: labels.dueSoonSubject,
    body: labels.dueSoonBodyEmail,
  },
  {
    module,
    event: "due_soon",
    channel: "sms",
    recipient: "fleet_manager",
    body: labels.dueSoonBodySms,
  },
  {
    module,
    event: "expired",
    channel: "email",
    recipient: "fleet_manager",
    subject: labels.expiredSubject,
    body: labels.expiredBodyEmail,
  },
  {
    module,
    event: "expired",
    channel: "sms",
    recipient: "fleet_manager",
    body: labels.expiredBodySms,
  },
];

const INSURANCE_RULES = COMPLIANCE_EVENT_RULES("insurance", {
  dueSoonSubject: "Insurance expiring soon: {vehicle_plate}",
  dueSoonBodyEmail:
    "Fleet alert: vehicle {vehicle_plate} ({vehicle_type} / {vehicle_class}) insurance with {insurance_provider} expires on {insurance_expires_at}. Policy {insurance_policy_number}. {days_until_expiry} days remaining. Driver: {assigned_driver_name}.",
  dueSoonBodySms:
    "Smart Dispatch: {vehicle_plate} insurance expires {insurance_expires_at} ({days_until_expiry} days). Policy {insurance_policy_number}.",
  expiredSubject: "Insurance expired: {vehicle_plate}",
  expiredBodyEmail:
    "Fleet alert: vehicle {vehicle_plate} ({vehicle_type} / {vehicle_class}) insurance with {insurance_provider} expired on {insurance_expires_at}. Policy {insurance_policy_number}. {days_overdue} days overdue. Driver: {assigned_driver_name}.",
  expiredBodySms:
    "Smart Dispatch: {vehicle_plate} insurance expired {insurance_expires_at} ({days_overdue} days overdue). Policy {insurance_policy_number}.",
});

const INSPECTION_RULES = COMPLIANCE_EVENT_RULES("inspection", {
  dueSoonSubject: "Inspection due soon: {vehicle_plate}",
  dueSoonBodyEmail:
    "Fleet alert: vehicle {vehicle_plate} ({vehicle_type} / {vehicle_class}) inspection at {inspection_center} expires on {inspection_expires_at}. Certificate {inspection_certificate_number}. {days_until_expiry} days remaining. Driver: {assigned_driver_name}.",
  dueSoonBodySms:
    "Smart Dispatch: {vehicle_plate} inspection expires {inspection_expires_at} ({days_until_expiry} days). Cert {inspection_certificate_number}.",
  expiredSubject: "Inspection expired: {vehicle_plate}",
  expiredBodyEmail:
    "Fleet alert: vehicle {vehicle_plate} ({vehicle_type} / {vehicle_class}) inspection at {inspection_center} expired on {inspection_expires_at}. Certificate {inspection_certificate_number}. {days_overdue} days overdue. Driver: {assigned_driver_name}.",
  expiredBodySms:
    "Smart Dispatch: {vehicle_plate} inspection expired {inspection_expires_at} ({days_overdue} days overdue). Cert {inspection_certificate_number}.",
});

const USER_REGISTRATION_RULES: NotificationTemplateSeed[] = [
  {
    module: "user_registrations",
    event: "submitted",
    channel: "email",
    recipient: "applicant",
    subject: "Registration received",
    body: "Hello {applicant_name}, we received your registration application. We will review your details and notify you once your account is activated.",
  },
  {
    module: "user_registrations",
    event: "submitted",
    channel: "sms",
    recipient: "applicant",
    body: "Smart Dispatch: your registration application was received and is under review.",
  },
  {
    module: "user_registrations",
    event: "approved",
    channel: "email",
    recipient: "applicant",
    subject: "Account approved",
    body: "Hello {applicant_name}, your Smart Dispatch account has been approved. You can now sign in and start booking rides.",
  },
  {
    module: "user_registrations",
    event: "approved",
    channel: "sms",
    recipient: "applicant",
    body: "Smart Dispatch: your account has been approved. You can now sign in.",
  },
  {
    module: "user_registrations",
    event: "rejected",
    channel: "email",
    recipient: "applicant",
    subject: "Registration declined",
    body: "Hello {applicant_name}, your registration application was declined. Reason: {rejection_reason}",
  },
  {
    module: "user_registrations",
    event: "rejected",
    channel: "sms",
    recipient: "applicant",
    body: "Smart Dispatch: your registration was declined. Reason: {rejection_reason}",
  },
];

const INVOICE_RULES: NotificationTemplateSeed[] = [
  {
    module: "invoices",
    event: "generated",
    channel: "email",
    recipient: "requester",
    subject: "Invoice {invoice_reference} issued",
    body: "Hello {customer_name}, invoice {invoice_reference} for contract {contract_title} ({contract_reference}) covering {period_start} to {period_end} has been issued. Total: {total_amount} {currency}. Payment due by {due_at}.",
  },
  {
    module: "invoices",
    event: "generated",
    channel: "sms",
    recipient: "requester",
    body: "Smart Dispatch: invoice {invoice_reference} for {total_amount} {currency} is due by {due_at}.",
  },
  {
    module: "invoices",
    event: "due_soon",
    channel: "email",
    recipient: "requester",
    subject: "Payment due soon: {invoice_reference}",
    body: "Hello {customer_name}, invoice {invoice_reference} for {total_amount} {currency} is due on {due_at} ({days_until_due} days remaining). Contract: {contract_title}.",
  },
  {
    module: "invoices",
    event: "due_soon",
    channel: "sms",
    recipient: "requester",
    body: "Smart Dispatch: invoice {invoice_reference} ({total_amount} {currency}) is due in {days_until_due} days ({due_at}).",
  },
  {
    module: "invoices",
    event: "overdue",
    channel: "email",
    recipient: "requester",
    subject: "Overdue invoice: {invoice_reference}",
    body: "Hello {customer_name}, invoice {invoice_reference} for {total_amount} {currency} was due on {due_at} and is now {days_overdue} days overdue. Contract: {contract_title}.",
  },
  {
    module: "invoices",
    event: "overdue",
    channel: "sms",
    recipient: "requester",
    body: "Smart Dispatch: invoice {invoice_reference} is {days_overdue} days overdue. Amount {total_amount} {currency}.",
  },
];

const DEFAULT_TEMPLATES = [
  ...RIDE_REQUEST_RULES,
  ...USER_REGISTRATION_RULES,
  ...INSURANCE_RULES,
  ...INSPECTION_RULES,
  ...INVOICE_RULES,
];

export async function ensureNotificationTemplates() {
  for (const template of DEFAULT_TEMPLATES) {
    await prisma.notificationTemplate.upsert({
      where: {
        module_event_channel_recipient: {
          module: template.module as DbNotificationModule,
          event: template.event,
          channel: template.channel as DbNotificationChannel,
          recipient: template.recipient as DbNotificationTemplateRecipient,
        },
      },
      create: {
        module: template.module as DbNotificationModule,
        event: template.event,
        channel: template.channel as DbNotificationChannel,
        recipient: template.recipient as DbNotificationTemplateRecipient,
        isEnabled: false,
        subject: template.subject ?? null,
        body: template.body,
      },
      update: {},
    });
  }
}

export async function listNotificationTemplates(module?: NotificationModule) {
  return prisma.notificationTemplate.findMany({
    where: module ? { module: module as DbNotificationModule } : undefined,
    orderBy: [{ module: "asc" }, { event: "asc" }, { recipient: "asc" }, { channel: "asc" }],
  });
}

export async function findNotificationTemplateById(id: string) {
  return prisma.notificationTemplate.findUnique({
    where: { id },
  });
}

export async function updateNotificationTemplate(id: string, input: UpdateNotificationTemplateInput) {
  return prisma.notificationTemplate.update({
    where: { id },
    data: {
      ...(input.isEnabled !== undefined ? { isEnabled: input.isEnabled } : {}),
      ...(input.subject !== undefined ? { subject: input.subject } : {}),
      ...(input.body !== undefined ? { body: input.body } : {}),
    },
  });
}

export async function listEnabledNotificationTemplates(module: NotificationModule, event: string) {
  return prisma.notificationTemplate.findMany({
    where: {
      module: module as DbNotificationModule,
      event,
      isEnabled: true,
    },
    orderBy: [{ recipient: "asc" }, { channel: "asc" }],
  });
}
