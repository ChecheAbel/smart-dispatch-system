-- Staff recipients for dispatch escalation notifications.
ALTER TYPE "notification_template_recipient" ADD VALUE 'dispatcher';
ALTER TYPE "notification_template_recipient" ADD VALUE 'supervisor';
