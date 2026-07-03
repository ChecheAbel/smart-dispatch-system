"use client";

import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import type { PaginationMeta } from "@smart-dispatch/types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const paginationButtonClass =
  "h-9 min-w-9 gap-1.5 rounded-lg border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm hover:bg-slate-50";

const paginationIconButtonClass =
  "size-9 rounded-lg border-slate-200 bg-white text-slate-900 shadow-sm hover:bg-slate-50";

type DataTablePaginationProps = {
  pagination: PaginationMeta;
  pageSize: number;
  pageSizeOptions: number[];
  pageRange: { start: number; end: number };
  loading: boolean;
  onPageSizeChange: (size: number) => void;
  onPageChange: (page: number) => void;
};

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
  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1);

  return (
    <div className="flex flex-col gap-4 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500">
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
                  className={paginationButtonClass}
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

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          disabled={!pagination.has_prev || loading || pagination.page <= 1}
          onClick={() => onPageChange(1)}
          className={paginationIconButtonClass}
          aria-label="First page"
        >
          <ChevronsLeft className="size-4" />
        </Button>

        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          disabled={!pagination.has_prev || loading}
          onClick={() => onPageChange(Math.max(1, pagination.page - 1))}
          className={paginationIconButtonClass}
          aria-label="Previous page"
        >
          <ChevronLeft className="size-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={loading || pagination.total === 0}
            render={
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn(paginationButtonClass, "min-w-[7.5rem] justify-between")}
              />
            }
          >
            <span>
              Page <span className="font-semibold tabular-nums text-slate-900">{pagination.page}</span> of{" "}
              {totalPages}
            </span>
            <ChevronDown className="size-3.5 text-slate-400" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-64 min-w-36 overflow-y-auto p-1.5">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs text-slate-500">Go to page</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {pageNumbers.map((pageNumber) => (
                <DropdownMenuItem
                  key={pageNumber}
                  className={cn(
                    "rounded-md px-2 py-1.5 tabular-nums",
                    pageNumber === pagination.page && "bg-slate-900/6 font-medium text-slate-900",
                  )}
                  onClick={() => onPageChange(pageNumber)}
                >
                  Page {pageNumber}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          disabled={!pagination.has_next || loading}
          onClick={() => onPageChange(pagination.page + 1)}
          className={paginationIconButtonClass}
          aria-label="Next page"
        >
          <ChevronRight className="size-4" />
        </Button>

        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          disabled={!pagination.has_next || loading || pagination.page >= totalPages}
          onClick={() => onPageChange(totalPages)}
          className={paginationIconButtonClass}
          aria-label="Last page"
        >
          <ChevronsRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
