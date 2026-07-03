"use client";

import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { PaginationMeta } from "@smart-dispatch/types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  adminPaginationButtonClass,
  adminPaginationIconButtonClass,
} from "@/lib/admin-theme";
import { cn } from "@/lib/utils";

type DataTablePaginationProps = {
  pagination: PaginationMeta;
  pageSize: number;
  pageSizeOptions: number[];
  pageRange: { start: number; end: number };
  loading: boolean;
  onPageSizeChange: (size: number) => void;
  onPageChange: (page: number) => void;
};

function getVisiblePageNumbers(
  currentPage: number,
  totalPages: number,
): Array<number | "ellipsis"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set<number>([
    1,
    totalPages,
    currentPage,
    currentPage - 1,
    currentPage + 1,
  ]);

  const sorted = [...pages]
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((left, right) => left - right);

  const result: Array<number | "ellipsis"> = [];

  for (let index = 0; index < sorted.length; index += 1) {
    const page = sorted[index];
    const previous = sorted[index - 1];

    if (index > 0 && page - previous > 1) {
      result.push("ellipsis");
    }

    result.push(page);
  }

  return result;
}

export function DataTablePagination({
  pagination,
  pageSize,
  pageSizeOptions,
  pageRange,
  loading,
  onPageSizeChange,
  onPageChange,
}: DataTablePaginationProps) {
  const totalPages = Math.max(pagination.total_pages, 1);
  const visiblePages = getVisiblePageNumbers(pagination.page, totalPages);

  return (
    <div className="flex flex-col gap-4 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 text-sm text-slate-500">
        <span>
          {pagination.total === 0
            ? "No results"
            : `Showing ${pageRange.start}-${pageRange.end} of ${pagination.total}`}
        </span>

        <div className="flex items-center gap-2">
          <span className="text-slate-400">·</span>
          <span>Rows per page</span>
          <DropdownMenu>
            <DropdownMenuTrigger
              disabled={loading}
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={adminPaginationButtonClass}
                />
              }
            >
              {pageSize}
              <ChevronDown className="size-3.5 text-slate-400" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-36 p-1.5">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-xs text-slate-500">
                  Rows per page
                </DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={String(pageSize)}
                  onValueChange={(value) => onPageSizeChange(Number(value))}
                >
                  {pageSizeOptions.map((option) => (
                    <DropdownMenuRadioItem
                      key={option}
                      value={String(option)}
                      className="rounded-md px-2 py-1.5"
                    >
                      {option} rows
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!pagination.has_prev || loading}
          onClick={() => onPageChange(Math.max(1, pagination.page - 1))}
          className={adminPaginationButtonClass}
          aria-label="Previous page"
        >
          <ChevronLeft className="size-4" />
          Previous
        </Button>

        <div className="mx-0.5 flex items-center gap-1">
          {pagination.total === 0 ? (
            <span
              className={cn(
                adminPaginationButtonClass,
                "inline-flex size-9 items-center justify-center border-[#1C3A34] bg-[#1C3A34] font-semibold text-white",
              )}
            >
              1
            </span>
          ) : (
            visiblePages.map((item, index) =>
              item === "ellipsis" ? (
                <span
                  key={`ellipsis-${index}`}
                  className="inline-flex size-9 items-center justify-center text-sm text-slate-400"
                  aria-hidden
                >
                  …
                </span>
              ) : (
                <Button
                  key={item}
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  disabled={loading}
                  onClick={() => onPageChange(item)}
                  className={cn(
                    adminPaginationIconButtonClass,
                    "font-semibold tabular-nums",
                    item === pagination.page &&
                      "border-[#1C3A34] bg-[#1C3A34] text-white hover:bg-[#162e29] hover:text-white",
                  )}
                  aria-label={`Page ${item}`}
                  aria-current={item === pagination.page ? "page" : undefined}
                >
                  {item}
                </Button>
              ),
            )
          )}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!pagination.has_next || loading}
          onClick={() => onPageChange(pagination.page + 1)}
          className={adminPaginationButtonClass}
          aria-label="Next page"
        >
          Next
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
