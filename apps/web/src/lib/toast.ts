import { toast as sonnerToast } from "sonner";

export type ToastMessage = {
  title: string;
  description?: string;
};

export function showSuccessToast({ title, description }: ToastMessage) {
  sonnerToast.success(title, { description });
}

export function showErrorToast({ title, description }: ToastMessage) {
  sonnerToast.error(title, { description });
}

export function showNotificationToast({
  title,
  description,
  actionUrl,
  actionLabel = "View",
}: ToastMessage & {
  actionUrl?: string | null;
  actionLabel?: string;
}) {
  sonnerToast(title, {
    description,
    action: actionUrl
      ? {
          label: actionLabel,
          onClick: () => {
            if (typeof window !== "undefined") {
              window.location.href = actionUrl;
            }
          },
        }
      : undefined,
  });
}
