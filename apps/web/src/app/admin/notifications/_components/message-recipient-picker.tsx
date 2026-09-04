"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import {
  CarFront,
  Check,
  Headphones,
  Loader2,
  Mail,
  Phone,
  Search,
  User as UserIcon,
  Users,
  X,
} from "lucide-react";
import type { RoleSlug, User } from "@smart-dispatch/types";
import { AdminField, AdminFormSection } from "@/components/shared/admin-form-field";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { adminSearchInputClass } from "@/lib/admin-theme";
import type { PushAudience } from "@/lib/notification-api";
import { fetchUsers } from "@/lib/user-api";
import { cn } from "@/lib/utils";
import { formatMessage } from "@/translations";

export type MessageRecipientMode = "group" | "people";

export type MessageRecipientPickerCopy = {
  sections: {
    recipients: {
      title: string;
      description: string;
    };
  };
  audience: {
    drivers: string;
    driversHint: string;
    customers: string;
    customersHint: string;
    dispatchers: string;
    dispatchersHint: string;
  };
  form: {
    userSearch: string;
    userSearchHint: string;
    userSearchPlaceholder: string;
    searching: string;
    noResults: string;
    selectedCount: string;
    clearRecipients: string;
    clearSearch: string;
    addUser: string;
    removeUser: string;
    roleLabels: Record<RoleSlug, string>;
    modeGroup: string;
    modePeople: string;
  };
};

type MessageRecipientPickerProps = {
  copy: MessageRecipientPickerCopy;
  canWrite: boolean;
  step?: number;
  audience: PushAudience | null;
  selectedUsers: User[];
  error?: string;
  onAudienceChange: (audience: PushAudience | null) => void;
  onSelectedUsersChange: (users: User[]) => void;
};

function formatUserName(user: User) {
  return [user.first_name, user.middle_name, user.last_name].filter(Boolean).join(" ");
}

function userInitials(user: User) {
  const first = user.first_name.trim().charAt(0);
  const last = user.last_name.trim().charAt(0);
  const initials = `${first}${last}`.toUpperCase();
  return initials || user.email.slice(0, 2).toUpperCase() || "?";
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function HighlightMatch({ text, query }: { text: string; query: string }) {
  const needle = query.trim();
  if (!needle) {
    return <>{text}</>;
  }

  const parts = text.split(new RegExp(`(${escapeRegExp(needle)})`, "gi"));

  return (
    <>
      {parts.map((part, index) =>
        part.toLowerCase() === needle.toLowerCase() ? (
          <mark
            key={`${part}-${index}`}
            className="rounded-[2px] bg-[#C9B87A]/45 text-inherit dark:bg-[#C9B87A]/30"
          >
            {part}
          </mark>
        ) : (
          <span key={`${part}-${index}`}>{part}</span>
        ),
      )}
    </>
  );
}

export function MessageRecipientPicker({
  copy,
  canWrite,
  step = 2,
  audience,
  selectedUsers,
  error,
  onAudienceChange,
  onSelectedUsersChange,
}: MessageRecipientPickerProps) {
  const listboxId = useId();
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<MessageRecipientMode>(
    selectedUsers.length > 0 ? "people" : "group",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const audienceOptions = [
    {
      id: "drivers" as const,
      label: copy.audience.drivers,
      description: copy.audience.driversHint,
      icon: CarFront,
    },
    {
      id: "customers" as const,
      label: copy.audience.customers,
      description: copy.audience.customersHint,
      icon: Users,
    },
    {
      id: "dispatchers" as const,
      label: copy.audience.dispatchers,
      description: copy.audience.dispatchersHint,
      icon: Headphones,
    },
  ];

  const trimmedQuery = searchQuery.trim();
  const showSearchPanel = searchOpen && trimmedQuery.length >= 2;

  useEffect(() => {
    if (selectedUsers.length > 0) {
      setMode("people");
      return;
    }

    if (audience) {
      setMode("group");
    }
  }, [audience, selectedUsers.length]);

  useEffect(() => {
    if (mode !== "people" || trimmedQuery.length < 2) {
      setSearchResults([]);
      setSearching(false);
      setActiveIndex(0);
      return;
    }

    let cancelled = false;
    setSearching(true);

    const timer = window.setTimeout(async () => {
      try {
        const result = await fetchUsers({ search: trimmedQuery, page: 1, limit: 8 });
        if (cancelled) {
          return;
        }

        const nextResults = result.data.filter(
          (user) => !selectedUsers.some((selected) => selected.id === user.id),
        );
        setSearchResults(nextResults);
        setActiveIndex(0);
      } catch {
        if (!cancelled) {
          setSearchResults([]);
        }
      } finally {
        if (!cancelled) {
          setSearching(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [mode, trimmedQuery, selectedUsers]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!searchContainerRef.current?.contains(event.target as Node)) {
        setSearchOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  function selectMode(nextMode: MessageRecipientMode) {
    setMode(nextMode);
    setSearchQuery("");
    setSearchResults([]);
    setSearchOpen(false);

    if (nextMode === "group") {
      onSelectedUsersChange([]);
      return;
    }

    onAudienceChange(null);
  }

  function selectAudience(nextAudience: PushAudience) {
    onAudienceChange(audience === nextAudience ? null : nextAudience);
  }

  function addUser(user: User) {
    onAudienceChange(null);
    onSelectedUsersChange(
      selectedUsers.some((entry) => entry.id === user.id)
        ? selectedUsers
        : [...selectedUsers, user],
    );
    setSearchQuery("");
    setSearchResults([]);
    setSearchOpen(false);
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
    }

    if (!showSearchPanel) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) =>
        searchResults.length === 0 ? 0 : (current + 1) % searchResults.length,
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) =>
        searchResults.length === 0
          ? 0
          : (current - 1 + searchResults.length) % searchResults.length,
      );
      return;
    }

    if (event.key === "Enter") {
      const activeUser = searchResults[activeIndex];
      if (activeUser) {
        addUser(activeUser);
      }
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setSearchOpen(false);
    }
  }

  return (
    <AdminFormSection
      id="send-recipients"
      step={step}
      title={copy.sections.recipients.title}
      description={copy.sections.recipients.description}
      icon={Users}
    >
      <div className="space-y-4">
        {/* Recipient Mode Segmented Switcher */}
        <div className="inline-flex w-full rounded-xl border border-slate-200/80 bg-slate-100/70 p-1 dark:border-border dark:bg-muted/30">
          {(
            [
              { id: "group", label: copy.form.modeGroup, icon: Users },
              { id: "people", label: copy.form.modePeople, icon: UserIcon },
            ] as const
          ).map((option) => {
            const Icon = option.icon;
            const isActive = mode === option.id;

            return (
              <button
                key={option.id}
                type="button"
                disabled={!canWrite}
                aria-pressed={isActive}
                onClick={() => selectMode(option.id)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition-all",
                  isActive
                    ? "bg-white text-slate-900 shadow-xs dark:bg-card dark:text-foreground"
                    : "text-slate-600 hover:text-slate-900 dark:text-muted-foreground dark:hover:text-foreground",
                  !canWrite && "cursor-not-allowed opacity-60",
                )}
              >
                <Icon className="size-3.5" />
                {option.label}
              </button>
            );
          })}
        </div>

        {mode === "group" ? (
          <div className="grid gap-3 sm:grid-cols-3">
            {audienceOptions.map((option) => {
              const Icon = option.icon;
              const isActive = audience === option.id;

              return (
                <button
                  key={option.id}
                  type="button"
                  disabled={!canWrite}
                  aria-pressed={isActive}
                  onClick={() => selectAudience(option.id)}
                  className={cn(
                    "group relative flex flex-col justify-between rounded-xl border p-4 text-left transition-all",
                    isActive
                      ? "border-[#1C3A34]/30 bg-white shadow-[inset_3px_0_0_0_#C9B87A] dark:border-[var(--brand-accent)]/45 dark:bg-[#1d242d]"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70 dark:border-border dark:bg-muted/20 dark:hover:border-border/80 dark:hover:bg-muted/30",
                    !canWrite && "cursor-not-allowed opacity-60",
                  )}
                >
                  <div className="flex items-start justify-between gap-2 pb-3">
                    <div
                      className={cn(
                        "flex size-9 items-center justify-center rounded-lg transition-colors",
                        isActive
                          ? "bg-[#1C3A34] text-white dark:bg-[var(--brand-accent)] dark:text-[#10211d]"
                          : "bg-[#1C3A34]/[0.08] text-[#1C3A34] group-hover:bg-[#1C3A34]/[0.12] dark:bg-[var(--brand-accent)]/12 dark:text-[var(--brand-accent)]",
                      )}
                    >
                      <Icon className="size-4" />
                    </div>
                    {isActive ? (
                      <span className="flex size-5 items-center justify-center rounded-full bg-[#1C3A34] text-white dark:bg-[var(--brand-accent)] dark:text-[#10211d]">
                        <Check className="size-3" />
                      </span>
                    ) : null}
                  </div>

                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-foreground">
                      {option.label}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500 line-clamp-2 dark:text-muted-foreground">
                      {option.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-4">
            <AdminField
              label={copy.form.userSearch}
              htmlFor="outbound-user-search"
              hint={error ? undefined : copy.form.userSearchHint}
              error={error}
            >
              <div ref={searchContainerRef} className="relative">
                <Search
                  className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400 dark:text-muted-foreground"
                  aria-hidden
                />
                <Input
                  id="outbound-user-search"
                  role="combobox"
                  aria-expanded={showSearchPanel}
                  aria-controls={listboxId}
                  aria-autocomplete="list"
                  aria-activedescendant={
                    showSearchPanel && searchResults[activeIndex]
                      ? `${listboxId}-${searchResults[activeIndex].id}`
                      : undefined
                  }
                  autoComplete="off"
                  value={searchQuery}
                  disabled={!canWrite}
                  placeholder={copy.form.userSearchPlaceholder}
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                    setSearchOpen(true);
                  }}
                  onFocus={() => setSearchOpen(true)}
                  onKeyDown={handleSearchKeyDown}
                  className={cn(
                    adminSearchInputClass,
                    "pr-10",
                    error &&
                      "border-red-300 bg-red-50/60 focus-visible:border-red-400 focus-visible:ring-red-200/60 dark:border-red-400/40 dark:bg-red-950/25",
                    !canWrite && "bg-slate-50 text-slate-500 dark:bg-muted/35 dark:text-muted-foreground",
                  )}
                />
                {searching ? (
                  <Loader2 className="absolute top-1/2 right-3.5 size-4 -translate-y-1/2 animate-spin text-slate-400" />
                ) : searchQuery ? (
                  <button
                    type="button"
                    className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-foreground"
                    aria-label={copy.form.clearSearch}
                    onClick={() => {
                      setSearchQuery("");
                      setSearchResults([]);
                      setSearchOpen(false);
                    }}
                  >
                    <X className="size-3.5" />
                  </button>
                ) : null}

                {showSearchPanel ? (
                  <div
                    id={listboxId}
                    role="listbox"
                    className="absolute z-20 mt-1.5 w-full overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-lg dark:border-border dark:bg-popover"
                  >
                    {searching && searchResults.length === 0 ? (
                      <div className="space-y-2 px-3 py-3">
                        <p className="px-1 text-xs text-slate-500">{copy.form.searching}</p>
                        <Skeleton className="h-12 w-full rounded-lg" />
                        <Skeleton className="h-12 w-full rounded-lg" />
                      </div>
                    ) : searchResults.length === 0 ? (
                      <p className="px-4 py-6 text-center text-sm text-slate-500">
                        {formatMessage(copy.form.noResults, { query: trimmedQuery })}
                      </p>
                    ) : (
                      <ul className="max-h-72 overflow-y-auto py-1">
                        {searchResults.map((user, index) => {
                          const name = formatUserName(user) || user.email;
                          const isActive = index === activeIndex;

                          return (
                            <li key={user.id}>
                              <button
                                id={`${listboxId}-${user.id}`}
                                type="button"
                                role="option"
                                aria-selected={isActive}
                                aria-label={formatMessage(copy.form.addUser, { name })}
                                className={cn(
                                  "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors",
                                  isActive
                                    ? "bg-[#1C3A34]/[0.06] dark:bg-[#C9B87A]/12"
                                    : "hover:bg-slate-50 dark:hover:bg-white/[0.04]",
                                )}
                                onMouseEnter={() => setActiveIndex(index)}
                                onClick={() => addUser(user)}
                              >
                                <Avatar className="bg-[#1C3A34]/8 dark:bg-[#C9B87A]/15">
                                  <AvatarFallback className="bg-[#1C3A34]/10 text-[11px] font-bold text-[#1C3A34] dark:bg-[#C9B87A]/20 dark:text-[#d8c77f]">
                                    {userInitials(user)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-sm font-semibold text-slate-900 dark:text-foreground">
                                    <HighlightMatch text={name} query={trimmedQuery} />
                                  </span>
                                  <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-slate-500">
                                    <Mail className="size-3 shrink-0" aria-hidden />
                                    <span className="truncate">
                                      <HighlightMatch text={user.email} query={trimmedQuery} />
                                    </span>
                                  </span>
                                </span>
                                {user.roles[0] ? (
                                  <span className="shrink-0 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-slate-500 uppercase dark:border-border dark:bg-transparent">
                                    {copy.form.roleLabels[user.roles[0]]}
                                  </span>
                                ) : null}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                ) : null}
              </div>
            </AdminField>

            {selectedUsers.length > 0 ? (
              <div className="overflow-hidden rounded-xl border border-slate-200/80 dark:border-border">
                <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 bg-[#f8fafb] px-3 py-2 dark:border-border dark:bg-[#11161d]">
                  <p className="text-xs font-semibold text-slate-600 dark:text-muted-foreground">
                    {formatMessage(copy.form.selectedCount, { count: selectedUsers.length })}
                  </p>
                  <button
                    type="button"
                    className="text-xs font-semibold text-slate-500 hover:text-[#1C3A34] dark:hover:text-[#d8c77f]"
                    onClick={() => onSelectedUsersChange([])}
                  >
                    {copy.form.clearRecipients}
                  </button>
                </div>
                <ul className="max-h-64 divide-y divide-slate-100 overflow-y-auto dark:divide-border">
                  {selectedUsers.map((user) => {
                    const name = formatUserName(user) || user.email;

                    return (
                      <li key={user.id} className="flex items-center gap-3 px-3 py-2.5">
                        <Avatar className="bg-[#1C3A34]/8 dark:bg-[#C9B87A]/15">
                          <AvatarFallback className="bg-[#1C3A34]/10 text-[11px] font-bold text-[#1C3A34] dark:bg-[#C9B87A]/20 dark:text-[#d8c77f]">
                            {userInitials(user)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-900 dark:text-foreground">
                            {name}
                          </p>
                          <p className="flex min-w-0 items-center gap-1.5 truncate text-xs text-slate-500">
                            <Mail className="size-3 shrink-0" aria-hidden />
                            <span className="truncate">{user.email}</span>
                          </p>
                          {user.mobile_number ? (
                            <p className="flex min-w-0 items-center gap-1.5 truncate text-xs text-slate-500">
                              <Phone className="size-3 shrink-0" aria-hidden />
                              <span className="truncate">{user.mobile_number}</span>
                            </p>
                          ) : null}
                        </div>
                        {user.roles[0] ? (
                          <span className="hidden shrink-0 rounded-md border border-slate-200 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-slate-500 uppercase sm:inline dark:border-border">
                            {copy.form.roleLabels[user.roles[0]]}
                          </span>
                        ) : null}
                        <button
                          type="button"
                          className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-foreground"
                          aria-label={copy.form.removeUser}
                          onClick={() =>
                            onSelectedUsersChange(selectedUsers.filter((entry) => entry.id !== user.id))
                          }
                        >
                          <X className="size-4" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}
          </div>
        )}

        {error && mode === "group" ? (
          <p className="text-xs text-red-600 dark:text-red-300">{error}</p>
        ) : null}
      </div>
    </AdminFormSection>
  );
}
