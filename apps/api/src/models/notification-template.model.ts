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

function withPushChannel(rules: NotificationTemplateSeed[]): NotificationTemplateSeed[] {
  const pushTemplates = rules
    .filter((rule) => rule.channel === "email")
    .map((emailRule) => {
      const smsRule = rules.find(
        (rule) =>
          rule.channel === "sms" &&
          rule.event === emailRule.event &&
          rule.recipient === emailRule.recipient,
      );

      return {
        module: emailRule.module,
        event: emailRule.event,
        channel: "push" as const,
        recipient: emailRule.recipient,
        subject: emailRule.subject ?? "Smart Dispatch",
        body: smsRule?.body ?? emailRule.body,
      };
    });

  return [...rules, ...pushTemplates];
}

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
    event: "rerouted",
    channel: "email",
    recipient: "requester",
    subject: "Your trip was rerouted",
    body: "Hello {requester_name}, your trip from {pickup} to {dropoff} was rerouted to vehicle {vehicle_plate} with driver {driver_name} after a disruption.",
  },
  {
    module: "ride_requests",
    event: "rerouted",
    channel: "sms",
    recipient: "requester",
    body: "Smart Dispatch: your trip was rerouted to {vehicle_plate} / {driver_name}. {pickup} to {dropoff}.",
  },
  {
    module: "ride_requests",
    event: "rerouted",
    channel: "email",
    recipient: "driver",
    subject: "Trip rerouted to you",
    body: "Hello {driver_name}, a trip for {requester_name} from {pickup} to {dropoff} was rerouted to you in vehicle {vehicle_plate}.",
  },
  {
    module: "ride_requests",
    event: "rerouted",
    channel: "sms",
    recipient: "driver",
    body: "Smart Dispatch: trip rerouted to you for {requester_name}. {pickup} to {dropoff}. Vehicle {vehicle_plate}.",
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
    body: "Hello {requester_name}, your ride request from {pickup} to {dropoff} has been cancelled. Reason: {rejection_reason}",
  },
  {
    module: "ride_requests",
    event: "cancelled",
    channel: "sms",
    recipient: "requester",
    body: "Smart Dispatch: your ride request from {pickup} to {dropoff} was cancelled. Reason: {rejection_reason}",
  },
  {
    module: "ride_requests",
    event: "reminder",
    channel: "email",
    recipient: "requester",
    subject: "Upcoming ride reminder",
    body: "Hello {requester_name}, this is a reminder that your ride from {pickup} to {dropoff} is scheduled for {scheduled_at} (within {reminder_hours} hours).",
  },
  {
    module: "ride_requests",
    event: "reminder",
    channel: "sms",
    recipient: "requester",
    body: "Smart Dispatch reminder: your ride from {pickup} to {dropoff} is at {scheduled_at}.",
  },
  {
    module: "ride_requests",
    event: "escalated",
    channel: "email",
    recipient: "dispatcher",
    subject: "Dispatch escalation: {requester_name}",
    body: "Hello dispatcher, trip {reference} for {requester_name} from {pickup} to {dropoff} needs attention. Reason: {escalation_reason}. Waiting {wait_minutes} minutes. Scheduled: {scheduled_at}.",
  },
  {
    module: "ride_requests",
    event: "escalated",
    channel: "sms",
    recipient: "dispatcher",
    body: "Smart Dispatch: trip {reference} for {requester_name} ({pickup} → {dropoff}) needs attention ({escalation_reason}). Waited {wait_minutes} min.",
  },
  {
    module: "ride_requests",
    event: "escalated_supervisor",
    channel: "email",
    recipient: "supervisor",
    subject: "Supervisor escalation: {requester_name}",
    body: "Hello, trip {reference} for {requester_name} from {pickup} to {dropoff} is still unresolved after dispatcher escalation. Reason: {escalation_reason}. Waiting {wait_minutes} minutes. Scheduled: {scheduled_at}.",
  },
  {
    module: "ride_requests",
    event: "escalated_supervisor",
    channel: "sms",
    recipient: "supervisor",
    body: "Smart Dispatch supervisor: trip {reference} for {requester_name} is still unresolved ({escalation_reason}, {wait_minutes} min).",
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

const PASSWORD_RESET_RULES: NotificationTemplateSeed[] = [
  {
    module: "password_reset",
    event: "email_requested",
    channel: "email",
    recipient: "account_holder",
    subject: "Password reset request",
    body: "Hello {user_name}, use this link to reset your Smart Dispatch password: {reset_link}. This link expires in {expires_minutes} minutes.",
  },
  {
    module: "password_reset",
    event: "sms_requested",
    channel: "sms",
    recipient: "account_holder",
    body: "Smart Dispatch: your password reset code is {reset_code}. It expires in {expires_minutes} minutes.",
  },
];

const GEOFENCING_RULES: NotificationTemplateSeed[] = [
  {
    module: "geofencing",
    event: "violation",
    channel: "email",
    recipient: "driver",
    subject: "Geofence alert: {vehicle_plate}",
    body: "Hello {driver_name}, vehicle {vehicle_plate} triggered a geofence alert for {geofence_name} ({geofence_kind}). Status: {violation_type}. Location: {latitude}, {longitude}. Ref: {reference}.",
  },
  {
    module: "geofencing",
    event: "violation",
    channel: "sms",
    recipient: "driver",
    body: "Smart Dispatch: {vehicle_plate} geofence alert - {geofence_name} ({violation_type}).",
  },
];

const DEFAULT_TEMPLATES = [
  ...withPushChannel(RIDE_REQUEST_RULES),
  ...withPushChannel(USER_REGISTRATION_RULES),
  ...withPushChannel(INSURANCE_RULES),
  ...withPushChannel(INSPECTION_RULES),
  ...withPushChannel(INVOICE_RULES),
  ...PASSWORD_RESET_RULES,
  ...withPushChannel(GEOFENCING_RULES),
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
