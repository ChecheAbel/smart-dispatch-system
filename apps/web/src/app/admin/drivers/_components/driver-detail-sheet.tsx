"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, IdCard, Loader2, Star, Truck, UserRound } from "lucide-react";
import type { User } from "@smart-dispatch/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { adminHeadingClass, adminIconBoxClass, adminPrimaryButtonClass } from "@/lib/admin-theme";
import { getDriverLicensePhotoUrl } from "@/lib/driver-license-photo";
import { fetchUserById } from "@/lib/user-api";
import { showErrorToast } from "@/lib/toast";
import { formatMessage, getAdminDriversMessages } from "@/translations";
import type { SupportedLocale } from "@/lib/locale";
import { cn } from "@/lib/utils";
import { formatAssignedVehicle, statusBadgeClass } from "./driver-helpers";
import { DriverRatingStars } from "./driver-rating";

function ProfileField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">{label}</p>
      <p className="text-sm leading-relaxed text-slate-700">{value?.trim() || "—"}</p>
    </div>
  );
}

type DriverDetailSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | null;
  locale: SupportedLocale;
};

export function DriverDetailSheet({
  open,
  onOpenChange,
  userId,
  locale,
}: DriverDetailSheetProps) {
  const copy = getAdminDriversMessages(locale);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !userId) {
      setUser(null);
      return;
    }

    let cancelled = false;

    async function loadUser() {
      if (!userId) return;

      setLoading(true);

      try {
        const loadedUser = await fetchUserById(userId);
        if (!cancelled) {
          setUser(loadedUser);
        }
      } catch {
        if (!cancelled) {
          setUser(null);
          showErrorToast(copy.toast.loadFailed);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadUser();

    return () => {
      cancelled = true;
    };
  }, [open, userId, copy.toast.loadFailed]);

  const licensePhotoUrl = getDriverLicensePhotoUrl(
    user?.driver?.license_photo_url,
    process.env.NEXT_PUBLIC_API_URL,
  );
  const licensePhotoBackUrl = getDriverLicensePhotoUrl(
    user?.driver?.license_photo_back_url,
    process.env.NEXT_PUBLIC_API_URL,
  );
  const assignedVehicleLabel = formatAssignedVehicle(user?.assigned_vehicle);
  const submittedAt = user?.driver?.created_at
    ? new Date(user.driver.created_at).toLocaleString(locale, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;
  const rating = user?.driver?.rating;
  const hasRating = Boolean(rating && rating.count > 0 && rating.average != null);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-y-auto p-0 data-[side=right]:sm:max-w-2xl data-[side=right]:lg:max-w-3xl"
      >
        <SheetHeader className="border-b border-slate-100 px-6 py-5">
          <SheetTitle className={adminHeadingClass}>{copy.detail.title}</SheetTitle>
          <SheetDescription className="leading-relaxed">{copy.detail.description}</SheetDescription>
          {user ? (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Badge variant="outline" className={cn("text-xs", statusBadgeClass(user.account_status))}>
                {copy.status[user.account_status]}
              </Badge>
              <Badge
                variant="outline"
                className={cn(
                  "text-xs",
                  user.assigned_vehicle
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-slate-200 bg-slate-50 text-slate-600",
                )}
              >
                {user.assigned_vehicle ? copy.assignment.assigned : copy.assignment.unassigned}
              </Badge>
              {submittedAt ? (
                <p className="text-xs font-medium text-slate-500">
                  {formatMessage(copy.detail.submittedAt, { date: submittedAt })}
                </p>
              ) : null}
            </div>
          ) : submittedAt ? (
            <p className="text-xs font-medium text-slate-500">
              {formatMessage(copy.detail.submittedAt, { date: submittedAt })}
            </p>
          ) : null}
        </SheetHeader>

        {loading ? (
          <div className="flex flex-1 items-center justify-center px-6 py-16 text-sm text-slate-500">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {copy.detail.loading}
          </div>
        ) : user ? (
          <div className="flex-1 space-y-6 px-6 py-6">
            <section className="space-y-4 rounded-lg border border-slate-200 bg-[#f8fafb]/60 p-5">
              <div className="flex items-start gap-3">
                <div className={cn(adminIconBoxClass, "shrink-0")}>
                  <UserRound className="size-4" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-slate-900">{copy.detail.profileSection}</h3>
                  <p className="text-xs leading-relaxed text-slate-500">
                    {copy.detail.profileSectionDescription}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="grid gap-4 sm:grid-cols-2">
                <ProfileField label={copy.detail.fields.firstName} value={user.first_name} />
                <ProfileField label={copy.detail.fields.middleName} value={user.middle_name} />
                <ProfileField label={copy.detail.fields.lastName} value={user.last_name} />
                <ProfileField label={copy.detail.fields.email} value={user.email} />
                <ProfileField label={copy.detail.fields.mobile} value={user.mobile_number} />
              </div>
            </section>

            <section className="space-y-4 rounded-lg border border-slate-200 bg-[#f8fafb]/60 p-5">
              <div className="flex items-start gap-3">
                <div className={cn(adminIconBoxClass, "shrink-0")}>
                  <Star className="size-4" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-slate-900">{copy.detail.ratingSection}</h3>
                  <p className="text-xs leading-relaxed text-slate-500">
                    {copy.detail.ratingSectionDescription}
                  </p>
                </div>
              </div>

              <Separator />

              {hasRating && rating?.average != null ? (
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-end gap-2 tabular-nums">
                      <span className="text-3xl font-bold leading-none tracking-tight text-[#1C3A34]">
                        {rating.average.toFixed(1)}
                      </span>
                      <span className="pb-0.5 text-sm font-medium text-slate-400">/5</span>
                    </div>
                    <DriverRatingStars value={rating.average} size="md" />
                  </div>
                  <p className="text-sm text-slate-500">
                    {formatMessage(copy.detail.ratingCount, { count: rating.count })}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-slate-500">{copy.detail.ratingUnrated}</p>
              )}
            </section>

            <section className="space-y-4 rounded-lg border border-slate-200 bg-[#f8fafb]/60 p-5">
              <div className="flex items-start gap-3">
                <div className={cn(adminIconBoxClass, "shrink-0")}>
                  <IdCard className="size-4" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-slate-900">{copy.detail.licenseSection}</h3>
                  <p className="text-xs leading-relaxed text-slate-500">
                    {copy.detail.licenseSectionDescription}
                  </p>
                </div>
              </div>

              <Separator />

              <ProfileField
                label={copy.detail.fields.licenseNumber}
                value={user.driver?.license_number}
              />

              {licensePhotoUrl || licensePhotoBackUrl ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {licensePhotoUrl ? (
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                        {copy.detail.licensePhotoFront}
                      </p>
                      <a
                        href={licensePhotoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="block overflow-hidden rounded-xl border border-slate-200 bg-slate-100"
                      >
                        <img
                          src={licensePhotoUrl}
                          alt={copy.detail.licensePhotoFront}
                          className="max-h-80 w-full bg-white object-contain"
                        />
                      </a>
                    </div>
                  ) : null}
                  {licensePhotoBackUrl ? (
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                        {copy.detail.licensePhotoBack}
                      </p>
                      <a
                        href={licensePhotoBackUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="block overflow-hidden rounded-xl border border-slate-200 bg-slate-100"
                      >
                        <img
                          src={licensePhotoBackUrl}
                          alt={copy.detail.licensePhotoBack}
                          className="max-h-80 w-full bg-white object-contain"
                        />
                      </a>
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-slate-500">{copy.detail.licensePhotoMissing}</p>
              )}
            </section>

            <section className="space-y-4 rounded-lg border border-slate-200 bg-[#f8fafb]/60 p-5">
              <div className="flex items-start gap-3">
                <div className={cn(adminIconBoxClass, "shrink-0")}>
                  <Truck className="size-4" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-slate-900">{copy.detail.vehicleSection}</h3>
                  <p className="text-xs leading-relaxed text-slate-500">
                    {copy.detail.vehicleSectionDescription}
                  </p>
                </div>
              </div>

              <Separator />

              {user.assigned_vehicle ? (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <ProfileField
                      label={copy.detail.fields.plate}
                      value={user.assigned_vehicle.plate_number}
                    />
                    <ProfileField label={copy.detail.fields.make} value={user.assigned_vehicle.make} />
                    <ProfileField label={copy.detail.fields.model} value={user.assigned_vehicle.model} />
                  </div>
                  <Button
                    className={adminPrimaryButtonClass}
                    render={<Link href={`/admin/fleet/vehicles/${user.assigned_vehicle.id}`} />}
                    nativeButton={false}
                  >
                    {copy.detail.openVehicle}
                    <ArrowUpRight className="size-4" />
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  {assignedVehicleLabel ?? copy.detail.vehicleUnassigned}
                </p>
              )}
            </section>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center px-6 py-16 text-sm text-slate-500">
            {copy.toast.loadFailed.description}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
