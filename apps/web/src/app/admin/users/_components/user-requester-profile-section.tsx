"use client";

import type { RequesterProfile, User } from "@smart-dispatch/types";
import { Building2, Landmark, UserRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useLocale } from "@/components/shared/providers";
import { getAdminUsersMessages } from "@/translations";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

function segmentMeta(segment: RequesterProfile["segment"]): {
  icon: LucideIcon;
  label: string;
  className: string;
} {
  switch (segment) {
    case "business":
      return {
        icon: Building2,
        label: "Business (B2B)",
        className: "border-violet-200 bg-violet-50 text-violet-800",
      };
    case "government":
      return {
        icon: Landmark,
        label: "Government (B2G)",
        className: "border-sky-200 bg-sky-50 text-sky-800",
      };
    default:
      return {
        icon: UserRound,
        label: "Individual (B2P)",
        className: "border-emerald-200 bg-emerald-50 text-emerald-800",
      };
  }
}

function ProfileField({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value?.trim()) return null;

  return (
    <div className="space-y-1">
      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">{label}</p>
      <p className="text-sm text-slate-700 leading-relaxed">{value}</p>
    </div>
  );
}

type UserRequesterProfileSectionProps = {
  user: User;
};

export function UserRequesterProfileSection({ user }: UserRequesterProfileSectionProps) {
  const { locale } = useLocale();
  const copy = getAdminUsersMessages(locale);
  const profile = user.requester_profile;

  if (!profile) {
    return null;
  }

  const meta = segmentMeta(profile.segment);
  const Icon = meta.icon;
  const fields = copy.form.requesterFields;

  return (
    <section className="space-y-4 rounded-lg border border-slate-200 bg-[#f8fafb]/60 p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1C3A34]/8 text-[#1C3A34]">
          <Icon className="h-5 w-5" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-slate-900">{copy.form.requesterSection}</h3>
          <p className="text-xs leading-relaxed text-slate-500">{copy.form.requesterSectionDescription}</p>
        </div>
      </div>

      <Separator />

      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
            meta.className,
          )}
        >
          <Icon className="h-3.5 w-3.5" />
          {copy.requesterSegment[profile.segment]}
        </span>
        <span className="text-xs text-slate-400">{meta.label}</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <ProfileField label={fields.organizationName} value={profile.organization_name} />
        <ProfileField label={fields.jobTitle} value={profile.job_title} />
        <ProfileField label={fields.organizationAddress} value={profile.organization_address} />
        <ProfileField label={fields.taxId} value={profile.tax_id} />
        <ProfileField label={fields.registrationNumber} value={profile.registration_number} />
        <ProfileField label={fields.governmentEntityType} value={profile.government_entity_type} />
        <ProfileField label={fields.officialReference} value={profile.official_reference} />
        <ProfileField label={fields.billingContactName} value={profile.billing_contact_name} />
        <ProfileField label={fields.billingContactEmail} value={profile.billing_contact_email} />
      </div>
    </section>
  );
}
