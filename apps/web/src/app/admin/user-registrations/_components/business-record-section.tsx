"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { AlertCircle, Building2, Loader2 } from "lucide-react";
import type {
  BusinessLicenseDetail,
  BusinessTinLicense,
  BusinessTinRegistration,
  RequesterProfile,
} from "@smart-dispatch/types";
import { Separator } from "@/components/ui/separator";
import { fetchBusinessTinLicense, fetchBusinessTinRegistration } from "@/lib/business-tin-api";
import { isValidEthiopianTin } from "@/lib/ethiopian-tin";
import { adminIconBoxClass } from "@/lib/admin-theme";
import { cn } from "@/lib/utils";
import { getAdminUserRegistrationsMessages } from "@/translations";
import type { SupportedLocale } from "@/lib/locale";

function isAbortError(error: unknown) {
  return axios.isCancel(error) || (error instanceof Error && error.name === "CanceledError");
}

function normalizeLicenseNo(value: string) {
  return value.trim().replace(/\s+/g, "").toLowerCase();
}

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function formatCapital(value: number, locale: SupportedLocale) {
  const formatted = new Intl.NumberFormat(locale === "am" ? "am-ET" : "en-US").format(value);
  return `${formatted} ETB`;
}

function licenseStatusClass(status: string | null | undefined) {
  const normalized = status?.trim().toLowerCase() ?? "";
  if (["closed", "cancelled", "canceled", "revoked"].includes(normalized)) {
    return "border-red-200 bg-red-50 text-red-800 dark:border-red-400/30 dark:bg-red-950/30 dark:text-red-200";
  }
  if (["active", "open", "renewed", "valid"].includes(normalized)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-950/30 dark:text-emerald-200";
  }
  return "border-slate-200 bg-slate-50 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200";
}

function RecordField({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value?.trim()) return null;

  return (
    <div className="space-y-1">
      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">{label}</p>
      <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">{value}</p>
    </div>
  );
}

function pickLicense(
  licenses: BusinessTinLicense[],
  submittedLicenseNo: string,
): BusinessTinLicense | null {
  if (licenses.length === 0) return null;

  const submitted = normalizeLicenseNo(submittedLicenseNo);
  if (submitted) {
    const matched = licenses.find((license) => normalizeLicenseNo(license.license_no) === submitted);
    if (matched) return matched;
  }

  return licenses.length === 1 ? licenses[0] : null;
}

type BusinessRecordSectionProps = {
  profile: RequesterProfile;
  locale: SupportedLocale;
};

export function BusinessRecordSection({ profile, locale }: BusinessRecordSectionProps) {
  const copy = getAdminUserRegistrationsMessages(locale).review.businessRecord;
  const tin = profile.tax_id?.trim() ?? "";
  const submittedLicenseNo = profile.registration_number?.trim() ?? "";
  const canLookup = isValidEthiopianTin(tin);

  const [loading, setLoading] = useState(canLookup);
  const [error, setError] = useState<string | null>(null);
  const [registration, setRegistration] = useState<BusinessTinRegistration | null>(null);
  const [detail, setDetail] = useState<BusinessLicenseDetail | null>(null);
  const [matchedLicense, setMatchedLicense] = useState<BusinessTinLicense | null>(null);

  useEffect(() => {
    if (!canLookup) {
      setLoading(false);
      setError(null);
      setRegistration(null);
      setDetail(null);
      setMatchedLicense(null);
      return;
    }

    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const loaded = await fetchBusinessTinRegistration(tin, controller.signal);
        if (controller.signal.aborted) return;

        setRegistration(loaded);
        const license = pickLicense(loaded.licenses, submittedLicenseNo);
        setMatchedLicense(license);

        const licenseNo = license?.license_no || submittedLicenseNo;
        if (!licenseNo) {
          setDetail(null);
          return;
        }

        try {
          const loadedDetail = await fetchBusinessTinLicense(tin, licenseNo, controller.signal);
          if (!controller.signal.aborted) {
            setDetail(loadedDetail);
          }
        } catch (licenseError) {
          if (isAbortError(licenseError) || controller.signal.aborted) return;
          setDetail(null);
        }
      } catch (loadError) {
        if (isAbortError(loadError) || controller.signal.aborted) return;
        setRegistration(null);
        setDetail(null);
        setMatchedLicense(null);
        setError(loadError instanceof Error ? loadError.message : null);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      controller.abort();
    };
  }, [canLookup, submittedLicenseNo, tin]);

  const otherLicenses =
    registration?.licenses.filter(
      (license) => license.license_no !== (matchedLicense?.license_no || detail?.license_no),
    ) ?? [];

  const submittedName = profile.organization_name?.trim() ?? "";
  const registeredName = (matchedLicense?.business_name || registration?.owner_name || "").trim();
  const nameMismatch =
    Boolean(submittedName && registeredName && normalizeName(submittedName) !== normalizeName(registeredName));
  const licenseMismatch =
    Boolean(submittedLicenseNo && registration && !matchedLicense && registration.licenses.length > 0);

  return (
    <section className="space-y-4 rounded-lg border border-slate-200 bg-[#f8fafb]/60 p-5">
      <div className="flex items-start gap-3">
        <div className={cn(adminIconBoxClass, "shrink-0")}>
          <Building2 className="size-4" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-slate-900">{copy.title}</h3>
          <p className="text-xs leading-relaxed text-slate-500">{copy.description}</p>
        </div>
      </div>

      <Separator />

      {!canLookup ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-xs leading-relaxed text-amber-800">{copy.missingTin}</p>
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          {copy.loading}
        </div>
      ) : null}

      {error ? (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50/80 px-4 py-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
          <p className="text-xs leading-relaxed text-red-700">{error || copy.failed}</p>
        </div>
      ) : null}

      {licenseMismatch ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-xs leading-relaxed text-amber-800">{copy.noMatch}</p>
        </div>
      ) : null}

      {nameMismatch ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-xs leading-relaxed text-amber-800">{copy.nameMismatch}</p>
        </div>
      ) : null}

      {!loading && (registration || detail) ? (
        <div className="space-y-5">
          {detail?.status_description ? (
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
                licenseStatusClass(detail.status_description),
              )}
            >
              {detail.status_description}
            </span>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <RecordField label={copy.fields.ownerName} value={registration?.owner_name} />
            <RecordField
              label={copy.fields.businessName}
              value={matchedLicense?.business_name || registration?.owner_name}
            />
            <RecordField label={copy.fields.tradeName} value={detail?.trade_name} />
            <RecordField
              label={copy.fields.licenseNo}
              value={detail?.license_no || matchedLicense?.license_no || submittedLicenseNo}
            />
            <RecordField
              label={copy.fields.dateRegistered}
              value={detail?.date_registered || matchedLicense?.issued_date}
            />
            <RecordField
              label={copy.fields.capital}
              value={detail?.capital != null ? formatCapital(detail.capital, locale) : null}
            />
            <RecordField label={copy.fields.region} value={detail?.address?.region} />
            <RecordField label={copy.fields.zone} value={detail?.address?.zone} />
            <RecordField label={copy.fields.woreda} value={detail?.address?.woreda} />
            <RecordField label={copy.fields.kebele} value={detail?.address?.kebele} />
            <RecordField label={copy.fields.houseNo} value={detail?.address?.house_no} />
            <RecordField label={copy.fields.mobilePhone} value={detail?.address?.mobile_phone} />
            <RecordField label={copy.fields.regularPhone} value={detail?.address?.regular_phone} />
            <RecordField label={copy.fields.renewalDate} value={detail?.renewal_date} />
            <RecordField
              label={copy.fields.renewedTo}
              value={detail?.renewed_to_date_string || detail?.renewed_to}
            />
            <RecordField label={copy.fields.cancellationDate} value={detail?.cancellation_date} />
          </div>

          {detail?.sub_groups.some((group) => group.description || group.code != null) ? (
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                {copy.fields.activities}
              </p>
              <ul className="space-y-1.5">
                {detail.sub_groups
                  .filter((group) => group.description || group.code != null)
                  .map((group, index) => (
                    <li
                      key={`${group.code ?? "activity"}-${index}`}
                      className="text-sm leading-relaxed text-slate-700 dark:text-slate-200"
                    >
                      {group.description || String(group.code)}
                    </li>
                  ))}
              </ul>
            </div>
          ) : null}

          {otherLicenses.length > 0 ? (
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                {copy.otherLicenses}
              </p>
              <div className="space-y-2">
                {otherLicenses.map((license) => (
                  <div
                    key={license.license_no}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-3 dark:border-white/10 dark:bg-card"
                  >
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                      {license.business_name || registration?.owner_name}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {license.license_no}
                      {license.issued_date ? ` · ${license.issued_date}` : ""}
                      {license.expiry_date ? ` · ${license.expiry_date}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
