import type { NotificationModule } from "@smart-dispatch/types";
import { NOTIFICATION_TEMPLATE_PLACEHOLDERS } from "@smart-dispatch/types";

export function renderNotificationTemplate(
  template: string,
  variables: Record<string, string | number | null | undefined>,
) {
  return template.replace(/\{([a-z_]+)\}/g, (match, key: string) => {
    const value = variables[key];
    if (value === null || value === undefined || value === "") {
      return "—";
    }

    return String(value);
  });
}

export function extractNotificationTemplatePlaceholders(text: string): string[] {
  const matches = text.matchAll(/\{([a-z_]+)\}/g);
  return [...new Set([...matches].map((match) => match[1]))];
}

export function validateNotificationTemplatePlaceholders(
  module: NotificationModule,
  fields: { subject?: string | null; body?: string },
): string | null {
  const allowed = new Set(NOTIFICATION_TEMPLATE_PLACEHOLDERS[module]);
  const used = [
    ...extractNotificationTemplatePlaceholders(fields.body ?? ""),
    ...(fields.subject ? extractNotificationTemplatePlaceholders(fields.subject) : []),
  ];
  const invalid = used.filter((key) => !allowed.has(key));

  if (invalid.length === 0) {
    return null;
  }

  return `Unknown placeholder(s): ${invalid.map((key) => `{${key}}`).join(", ")}. Use only supported placeholders for this module.`;
}
