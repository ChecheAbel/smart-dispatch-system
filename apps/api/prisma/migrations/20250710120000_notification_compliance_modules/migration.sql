-- Add fleet compliance notification modules and recipient.
ALTER TYPE "notification_module" ADD VALUE 'insurance';
ALTER TYPE "notification_module" ADD VALUE 'inspection';
ALTER TYPE "notification_template_recipient" ADD VALUE 'fleet_manager';
