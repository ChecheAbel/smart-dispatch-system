"use client";

import { useCallback, useMemo, useState } from "react";
import { CheckCircle2, ClipboardCheck, Eye, MoreHorizontal, XCircle } from "lucide-react";
import type { DriverApplication } from "@smart-dispatch/types";
import { useAuth, useLocale } from "@/components/shared/providers";
import {
  DataTable,
  type DataTableColumn,
  type DataTableFetchParams,
  type DataTableRowContext,
} from "@/components/shared/data-table";
import { DeleteConfirmModal } from "@/components/shared/delete-confirm-modal";
import { PageAccessDenied } from "@/components/shared/page-access-denied";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  approveDriverApplication,
  fetchDriverApplications,
  rejectDriverApplication,
} from "@/lib/driver-application-api";
import { adminBadgeGoldClass } from "@/lib/admin-theme";
import { PERMISSIONS } from "@/lib/permissions";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { formatMessage, getAdminDriverApplicationsMessages } from "@/translations";
import {
  formatApplicantName,
  ReviewApplicationSheet,
} from "./review-application-sheet";
import { ApplicationStats } from "./application-stats";

function formatSubmittedAt(value: string, locale: string) {
  return new Date(value).toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function ApplicationRowActions({
  application,
  labels,
  canWrite,
  onReview,
  onApprove,
  onReject,
}: {
  application: DriverApplication;
  labels: ReturnType<typeof getAdminDriverApplicationsMessages>["actions"];
  canWrite: boolean;
  onReview: (application: DriverApplication) => void;
  onApprove: (application: DriverApplication) => void;
  onReject: (application: DriverApplication) => void;
}) {
  const name = formatApplicantName(application);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="text-slate-500 hover:bg-[#1C3A34]/6 hover:text-[#1C3A34]"
            aria-label={formatMessage(labels.menuLabel, { name })}
          />
        }
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => onReview(application)}>
            <Eye />
            {labels.review}
          </DropdownMenuItem>
          {canWrite ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onApprove(application)}>
                <CheckCircle2 />
                {labels.approve}
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={() => onReject(application)}>
                <XCircle />
                {labels.reject}
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function DriverApplicationsPage() {
  const { locale } = useLocale();
  const { hasPermission } = useAuth();
  const copy = getAdminDriverApplicationsMessages(locale);
  const canRead = hasPermission(PERMISSIONS.drivers.read);
  const canWrite = hasPermission(PERMISSIONS.drivers.write);

  const [refreshKey, setRefreshKey] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);
  const [rejectingApplication, setRejectingApplication] = useState<DriverApplication | null>(null);

  const openReviewSheet = useCallback((application: DriverApplication) => {
    setSelectedApplicationId(application.id);
    setSheetOpen(true);
  }, []);

  const refreshPage = useCallback(() => {
    setRefreshKey((current) => current + 1);
  }, []);

  const handleApprove = useCallback(
    async (application: DriverApplication) => {
      try {
        await approveDriverApplication(application.id);
        showSuccessToast({
          title: copy.toast.approveSuccess.title,
          description: formatMessage(copy.toast.approveSuccess.description, {
            name: formatApplicantName(application),
          }),
        });
        refreshPage();
      } catch (err) {
        const message = err instanceof Error ? err.message : copy.toast.approveFailed.description;
        showErrorToast({
          title: copy.toast.approveFailed.title,
          description: message,
        });
      }
    },
    [copy.toast, refreshPage],
  );

  const handleReject = useCallback((application: DriverApplication) => {
    setRejectingApplication(application);
  }, []);

  const applicationColumns = useMemo<DataTableColumn<DriverApplication>[]>(
    () => [
      {
        id: "name",
        header: copy.columns.name,
        cellClassName: "text-slate-700",
        cell: (application) => formatApplicantName(application),
      },
      {
        id: "email",
        header: copy.columns.email,
        cellClassName: "text-slate-500",
        cell: (application) => application.email,
      },
      {
        id: "mobile",
        header: copy.columns.mobile,
        cellClassName: "text-slate-500",
        cell: (application) => application.mobile_number,
      },
      {
        id: "license",
        header: copy.columns.license,
        cellClassName: "font-medium text-slate-700",
        cell: (application) => application.license_number,
      },
      {
        id: "submitted",
        header: copy.columns.submitted,
        cellClassName: "text-slate-500",
        cell: (application) => formatSubmittedAt(application.submitted_at, locale),
      },
    ],
    [copy.columns, locale],
  );

  const loadApplications = useCallback(
    ({ page, limit, search }: DataTableFetchParams) =>
      fetchDriverApplications({
        page,
        limit,
        search: search || undefined,
      }),
    [],
  );

  const renderRowActions = useCallback(
    (application: DriverApplication, _context: DataTableRowContext<DriverApplication>) => (
      <ApplicationRowActions
        application={application}
        labels={copy.actions}
        canWrite={canWrite}
        onReview={openReviewSheet}
        onApprove={(item) => void handleApprove(item)}
        onReject={handleReject}
      />
    ),
    [canWrite, copy.actions, handleApprove, handleReject, openReviewSheet],
  );

  if (!canRead) {
    return <PageAccessDenied copy={copy.accessDenied} />;
  }

  return (
    <div className="space-y-6">
      <ApplicationStats locale={locale} refreshKey={refreshKey} />

      <DataTable
        key={locale}
        eyebrow={<Badge className={adminBadgeGoldClass}>{copy.eyebrow}</Badge>}
        title={copy.title}
        titleClassName="text-2xl font-extrabold tracking-tight"
        description={copy.description}
        searchPlaceholder={copy.searchPlaceholder}
        itemLabel={copy.itemLabel}
        columns={applicationColumns}
        fetchData={loadApplications}
        getRowKey={(application) => application.id}
        showIndexColumn
        renderRowActions={renderRowActions}
        actionsColumnHeader={copy.columns.actions}
        minTableWidth="980px"
        emptyIcon={ClipboardCheck}
        emptyTitle={copy.empty.title}
        emptyDescription={copy.empty.description}
        emptySearchDescription={copy.empty.searchDescription}
        refreshDeps={[locale, refreshKey]}
      />

      <ReviewApplicationSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        applicationId={selectedApplicationId}
        canWrite={canWrite}
        onSuccess={refreshPage}
      />

      <DeleteConfirmModal
        open={Boolean(rejectingApplication)}
        onOpenChange={(open) => {
          if (!open) {
            setRejectingApplication(null);
          }
        }}
        itemName={rejectingApplication ? formatApplicantName(rejectingApplication) : undefined}
        title={copy.review.rejectConfirmTitle}
        description={copy.review.rejectConfirmDescription}
        cancelLabel={copy.review.rejectCancel}
        confirmLabel={copy.review.rejectConfirm}
        deletingLabel={copy.review.rejecting}
        onConfirm={async () => {
          if (!rejectingApplication) {
            return;
          }

          try {
            await rejectDriverApplication(rejectingApplication.id);
            showSuccessToast({
              title: copy.toast.rejectSuccess.title,
              description: formatMessage(copy.toast.rejectSuccess.description, {
                name: formatApplicantName(rejectingApplication),
              }),
            });
            refreshPage();
          } catch (err) {
            const message = err instanceof Error ? err.message : copy.toast.rejectFailed.description;
            showErrorToast({
              title: copy.toast.rejectFailed.title,
              description: message,
            });
            throw err;
          }
        }}
      />
    </div>
  );
}
