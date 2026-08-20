"use client";

import { useState } from "react";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  exportDashboardChartExcel,
  exportDashboardChartPdf,
  type ChartExportTable,
} from "@/lib/admin-dashboard-export";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import type { AdminDashboardMessages } from "@/translations/types";
import { cn } from "@/lib/utils";

type DashboardChartExportMenuProps = {
  copy: AdminDashboardMessages;
  disabled?: boolean;
  getTable: () => Promise<Omit<ChartExportTable, "copy" | "fromDate" | "toDate">> | Omit<
    ChartExportTable,
    "copy" | "fromDate" | "toDate"
  >;
  fromDate: string;
  toDate: string;
  className?: string;
};

export function DashboardChartExportMenu({
  copy,
  disabled = false,
  getTable,
  fromDate,
  toDate,
  className,
}: DashboardChartExportMenuProps) {
  const [exporting, setExporting] = useState(false);

  async function handleExport(format: "excel" | "pdf") {
    setExporting(true);
    try {
      const table = await getTable();
      if (!table.rows.length) {
        throw new Error(copy.export.empty);
      }

      const payload: ChartExportTable = {
        ...table,
        fromDate,
        toDate,
        copy,
      };

      if (format === "excel") {
        await exportDashboardChartExcel(payload);
      } else {
        await exportDashboardChartPdf(payload);
      }

      showSuccessToast({
        title: copy.export.toast.success.title,
        description: copy.export.toast.success.description,
      });
    } catch (error) {
      showErrorToast({
        title: copy.export.toast.failed.title,
        description:
          error instanceof Error ? error.message : copy.export.toast.failed.description,
      });
    } finally {
      setExporting(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={disabled || exporting}
            aria-label={copy.export.button}
            title={copy.export.button}
            className={cn(
              "size-8 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-[#1C3A34] dark:text-muted-foreground dark:hover:bg-accent dark:hover:text-foreground",
              className,
            )}
          />
        }
      >
        <Download className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuGroup>
          <DropdownMenuItem
            disabled={exporting}
            onClick={() => void handleExport("excel")}
          >
            <FileSpreadsheet />
            {copy.export.excel}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={exporting}
            onClick={() => void handleExport("pdf")}
          >
            <FileText />
            {copy.export.pdf}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
