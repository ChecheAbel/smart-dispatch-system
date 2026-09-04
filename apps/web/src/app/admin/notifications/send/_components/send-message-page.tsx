"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Loader2,
  Mail,
  MessageSquare,
  Send,
  Smartphone,
} from "lucide-react";
import type { User } from "@smart-dispatch/types";
import { useAuth, useLocale } from "@/components/shared/providers";
import { PageAccessDenied } from "@/components/shared/page-access-denied";
import {
  AdminFormSection,
  AdminTextareaField,
  AdminTextField,
} from "@/components/shared/admin-form-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  adminCardClass,
  adminHeadingClass,
  adminIconBoxClass,
  adminPrimaryButtonClass,
} from "@/lib/admin-theme";
import { PERMISSIONS } from "@/lib/permissions";
import {
  fetchNotificationConfiguration,
  fetchPushStatus,
  sendOutboundMessage,
  type ChannelSendCounts,
  type OutboundChannel,
  type PushAudience,
} from "@/lib/notification-api";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { formatMessage, getAdminNotificationsSendMessages } from "@/translations";
import { MessageRecipientPicker } from "../../_components/message-recipient-picker";

type FieldErrors = Partial<Record<"channels" | "recipients" | "title" | "message", string>>;
type ChannelReadiness = "loading" | "ready" | "unavailable";

const TITLE_MAX = 80;
const MESSAGE_MAX = 500;

const CHANNEL_ICONS = {
  email: Mail,
  sms: MessageSquare,
  push: Smartphone,
} as const;

const CHANNEL_SETUP_HREF: Record<OutboundChannel, string> = {
  email: "/admin/notifications?tab=email",
  sms: "/admin/notifications?tab=sms",
  push: "/admin/notifications?tab=push",
};

function formatChannelResults(
  results: Partial<Record<OutboundChannel, ChannelSendCounts>>,
  labels: Record<OutboundChannel, string>,
  copy: {
    sent: string;
    skipped: string;
    failed: string;
  },
) {
  return (["email", "sms", "push"] as const)
    .flatMap((channel) => {
      const counts = results[channel];
      if (!counts) {
        return [];
      }

      const parts = [formatMessage(copy.sent, { count: counts.sent })];
      if (counts.skipped > 0) {
        parts.push(formatMessage(copy.skipped, { count: counts.skipped }));
      }
      if (counts.failed > 0) {
        parts.push(formatMessage(copy.failed, { count: counts.failed }));
      }

      return [`${labels[channel]}: ${parts.join(", ")}`];
    })
    .join(" · ");
}

export function SendMessagePage() {
  const { locale } = useLocale();
  const { hasPermission } = useAuth();
  const copy = getAdminNotificationsSendMessages(locale);
  const canRead = hasPermission(PERMISSIONS.notifications.read);
  const canWrite = hasPermission(PERMISSIONS.notifications.write);

  const [channels, setChannels] = useState<OutboundChannel[]>([]);
  const [audience, setAudience] = useState<PushAudience | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [sending, setSending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [readiness, setReadiness] = useState<Record<OutboundChannel, ChannelReadiness>>({
    email: "loading",
    sms: "loading",
    push: "loading",
  });

  const needsTitle = channels.includes("email") || channels.includes("push");
  const selectedAudienceLabel =
    audience === "drivers"
      ? copy.audience.drivers
      : audience === "customers"
        ? copy.audience.customers
        : audience === "dispatchers"
          ? copy.audience.dispatchers
          : null;
  const recipientSummary = selectedAudienceLabel
    ? selectedAudienceLabel
    : selectedUsers.length > 0
      ? formatMessage(copy.form.sendToPeople, { count: selectedUsers.length })
      : null;
  const channelLabels = {
    email: copy.channels.email.title,
    sms: copy.channels.sms.title,
    push: copy.channels.push.title,
  };
  const selectedChannelLabels = channels.map((channel) => channelLabels[channel]);
  const reviewSummary =
    selectedChannelLabels.length > 0 && recipientSummary
      ? formatMessage(copy.form.reviewSummary, {
          channels: selectedChannelLabels.join(", "),
          recipients: recipientSummary,
        })
      : copy.form.reviewEmpty;

  const channelOptions: Array<{
    id: OutboundChannel;
    title: string;
    description: string;
  }> = [
    {
      id: "email",
      title: copy.channels.email.title,
      description: copy.channels.email.description,
    },
    {
      id: "sms",
      title: copy.channels.sms.title,
      description: copy.channels.sms.description,
    },
    {
      id: "push",
      title: copy.channels.push.title,
      description: copy.channels.push.description,
    },
  ];

  useEffect(() => {
    let cancelled = false;

    async function loadReadiness() {
      const [email, sms, push] = await Promise.all([
        fetchNotificationConfiguration("email")
          .then((config) => (config.is_enabled && config.has_credentials ? "ready" : "unavailable"))
          .catch((): ChannelReadiness => "unavailable"),
        fetchNotificationConfiguration("sms")
          .then((config) => (config.is_enabled && config.has_credentials ? "ready" : "unavailable"))
          .catch((): ChannelReadiness => "unavailable"),
        fetchPushStatus()
          .then((status) => (status.configured ? "ready" : "unavailable"))
          .catch((): ChannelReadiness => "unavailable"),
      ]);

      if (!cancelled) {
        setReadiness({ email, sms, push });
      }
    }

    void loadReadiness();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!canRead) {
    return <PageAccessDenied copy={copy.accessDenied} />;
  }

  function toggleChannel(channel: OutboundChannel) {
    if (readiness[channel] !== "ready") {
      return;
    }

    setChannels((current) =>
      current.includes(channel)
        ? current.filter((item) => item !== channel)
        : [...current, channel],
    );
    setFieldErrors((current) => ({ ...current, channels: undefined, title: undefined }));
  }

  function validateForm(): FieldErrors {
    const errors: FieldErrors = {};

    if (channels.length === 0) {
      errors.channels = copy.validation.channelsRequired;
    }

    if (!audience && selectedUsers.length === 0) {
      errors.recipients = copy.validation.recipientsRequired;
    }

    if (needsTitle && !title.trim()) {
      errors.title = copy.validation.titleRequired;
    }

    if (!message.trim()) {
      errors.message = copy.validation.messageRequired;
    }

    return errors;
  }

  function scrollToFirstError(errors: FieldErrors) {
    const targetId = errors.channels
      ? "send-channels"
      : errors.recipients
        ? "send-recipients"
        : "send-message";
    document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const errors = validateForm();
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      showErrorToast({
        title: copy.validation.title,
        description: copy.validation.description,
      });
      scrollToFirstError(errors);
      return;
    }

    if (!canWrite) {
      return;
    }

    setConfirmOpen(true);
  }

  async function sendMessage() {
    setSending(true);

    try {
      const result = await sendOutboundMessage({
        channels,
        message: message.trim(),
        ...(needsTitle ? { title: title.trim() } : {}),
        ...(audience ? { audience } : { user_ids: selectedUsers.map((user) => user.id) }),
      });

      const breakdown = formatChannelResults(result.results, channelLabels, copy.results);

      showSuccessToast({
        title: copy.toast.sendSuccess.title,
        description: breakdown || copy.toast.sendSuccess.description.replace("{count}", String(result.recipient_count)),
      });

      setConfirmOpen(false);
      setAudience(null);
      setSelectedUsers([]);
      setTitle("");
      setMessage("");
    } catch (err) {
      showErrorToast({
        title: copy.toast.sendFailed.title,
        description: err instanceof Error ? err.message : copy.toast.sendFailed.description,
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Top Breadcrumb / Back Link */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/notifications"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-muted-foreground dark:hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          Back to notification channels
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <AdminFormSection
          id="send-channels"
          step={1}
          title={copy.channels.title}
          description={copy.channels.description}
        >
          <div className="grid gap-3 sm:grid-cols-3">
            {channelOptions.map((channel) => {
              const Icon = CHANNEL_ICONS[channel.id];
              const isActive = channels.includes(channel.id);
              const status = readiness[channel.id];
              const isReady = status === "ready";

              return (
                <div
                  key={channel.id}
                  className={cn(
                    "group relative overflow-hidden rounded-xl border transition-all",
                    isActive
                      ? "border-[#1C3A34]/30 bg-white shadow-[inset_3px_0_0_0_#C9B87A] dark:border-[var(--brand-accent)]/45 dark:bg-[#1d242d]"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70 dark:border-border dark:bg-muted/20 dark:hover:border-border/80",
                  )}
                >
                  <button
                    type="button"
                    disabled={!canWrite || !isReady}
                    aria-pressed={isActive}
                    onClick={() => toggleChannel(channel.id)}
                    className={cn(
                      "flex w-full items-start gap-3.5 p-4 text-left",
                      (!canWrite || !isReady) && "cursor-not-allowed opacity-70",
                    )}
                  >
                    <div
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors",
                        isActive
                          ? "bg-[#1C3A34] text-white dark:bg-[var(--brand-accent)] dark:text-[#10211d]"
                          : "bg-[#1C3A34]/[0.08] text-[#1C3A34] group-hover:bg-[#1C3A34]/[0.12] dark:bg-[var(--brand-accent)]/12 dark:text-[var(--brand-accent)]",
                      )}
                    >
                      <Icon className="size-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="block text-sm font-bold text-slate-900 dark:text-foreground">
                          {channel.title}
                        </span>
                        {isActive ? (
                          <span className="flex size-4.5 items-center justify-center rounded-full bg-[#1C3A34] text-white dark:bg-[var(--brand-accent)] dark:text-[#10211d]">
                            <Check className="size-3" aria-hidden />
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-1 flex items-center gap-1.5">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                            status === "loading"
                              ? "bg-slate-100 text-slate-600 dark:bg-muted dark:text-slate-300"
                              : isReady
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                                : "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
                          )}
                        >
                          <span
                            className={cn(
                              "size-1 rounded-full",
                              isReady ? "bg-emerald-500" : "bg-amber-500",
                            )}
                          />
                          {status === "loading"
                            ? copy.channels.checking
                            : isReady
                              ? copy.channels.ready
                              : copy.channels.unavailable}
                        </span>
                      </div>
                    </div>
                  </button>

                  {status === "unavailable" ? (
                    <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-2 dark:border-border dark:bg-muted/30">
                      <Link
                        href={CHANNEL_SETUP_HREF[channel.id]}
                        className="text-xs font-semibold text-[#1C3A34] hover:underline dark:text-[var(--brand-accent)]"
                      >
                        {copy.channels.setup} →
                      </Link>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
          {fieldErrors.channels ? (
            <p className="text-xs text-red-600 dark:text-red-300">{fieldErrors.channels}</p>
          ) : null}
        </AdminFormSection>

        <MessageRecipientPicker
          copy={copy}
          canWrite={canWrite}
          audience={audience}
          selectedUsers={selectedUsers}
          error={fieldErrors.recipients}
          onAudienceChange={(next) => {
            setAudience(next);
            setFieldErrors((current) => ({ ...current, recipients: undefined }));
          }}
          onSelectedUsersChange={(users) => {
            setSelectedUsers(users);
            setFieldErrors((current) => ({ ...current, recipients: undefined }));
          }}
        />

        <AdminFormSection
          id="send-message"
          step={3}
          title={copy.sections.message.title}
          description={copy.sections.message.description}
        >
          <div className="space-y-4">
            {needsTitle ? (
              <AdminTextField
                id="outbound-title"
                label={copy.form.titleLabel}
                hint={formatMessage(copy.form.characterCount, {
                  current: title.length,
                  max: TITLE_MAX,
                })}
                placeholder={copy.form.titlePlaceholder}
                value={title}
                maxLength={TITLE_MAX}
                disabled={!canWrite}
                error={fieldErrors.title}
                onChange={(event) => {
                  setTitle(event.target.value);
                  setFieldErrors((current) => ({ ...current, title: undefined }));
                }}
              />
            ) : null}
            <AdminTextareaField
              id="outbound-message"
              label={copy.form.messageLabel}
              hint={formatMessage(copy.form.characterCount, {
                current: message.length,
                max: MESSAGE_MAX,
              })}
              placeholder={copy.form.messagePlaceholder}
              value={message}
              maxLength={MESSAGE_MAX}
              rows={6}
              disabled={!canWrite}
              error={fieldErrors.message}
              onChange={(event) => {
                setMessage(event.target.value);
                setFieldErrors((current) => ({ ...current, message: undefined }));
              }}
            />
          </div>
        </AdminFormSection>

        <div
          className={cn(
            adminCardClass,
            "sticky bottom-4 z-10 flex flex-col gap-3 rounded-2xl border p-4 shadow-lg sm:flex-row sm:items-center sm:justify-between sm:px-6",
          )}
        >
          <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
            <span className="font-semibold text-slate-900 dark:text-foreground">Summary:</span>
            <span>{reviewSummary ?? "Select channels and recipients to continue"}</span>
          </div>
          <Button
            type="submit"
            disabled={!canWrite || sending || channels.length === 0 || (!audience && selectedUsers.length === 0)}
            className={cn(adminPrimaryButtonClass, "w-full sm:w-auto")}
          >
            {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            {sending ? copy.form.sending : copy.form.review}
          </Button>
        </div>
      </form>

      <Dialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!sending) {
            setConfirmOpen(open);
          }
        }}
      >
        <DialogContent showCloseButton={!sending} className="gap-0 overflow-hidden p-0 sm:max-w-md">
          <div className="border-b border-slate-100 px-5 py-4 dark:border-border">
            <DialogTitle className={cn("text-base font-semibold", adminHeadingClass)}>
              {copy.confirm.title}
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm leading-relaxed text-slate-500">
              {copy.confirm.description}
            </DialogDescription>
          </div>

          <div className="space-y-3 px-5 py-4">
            <div>
              <p className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                {copy.confirm.via}
              </p>
              <p className="mt-0.5 text-sm font-medium text-slate-800 dark:text-foreground">
                {selectedChannelLabels.join(", ")}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                {copy.confirm.to}
              </p>
              <p className="mt-0.5 text-sm font-medium text-slate-800 dark:text-foreground">
                {recipientSummary}
              </p>
              {audience ? (
                <p className="mt-1 text-xs text-slate-500">{copy.confirm.groupWarning}</p>
              ) : null}
            </div>
            {title.trim() ? (
              <div>
                <p className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                  {copy.form.titleLabel}
                </p>
                <p className="mt-0.5 text-sm font-medium text-slate-800 dark:text-foreground">{title.trim()}</p>
              </div>
            ) : null}
            <div>
              <p className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                {copy.confirm.message}
              </p>
              <p className="mt-0.5 line-clamp-4 text-sm leading-relaxed text-slate-600 dark:text-muted-foreground">
                {message.trim()}
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 border-t border-slate-100 bg-[#f8fafb] px-5 py-4 sm:justify-end dark:border-border dark:bg-muted/20">
            <Button
              type="button"
              variant="outline"
              disabled={sending}
              onClick={() => setConfirmOpen(false)}
            >
              {copy.confirm.cancel}
            </Button>
            <Button
              type="button"
              disabled={sending}
              className={adminPrimaryButtonClass}
              onClick={() => void sendMessage()}
            >
              {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              {sending ? copy.form.sending : copy.confirm.send}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
