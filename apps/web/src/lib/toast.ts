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
