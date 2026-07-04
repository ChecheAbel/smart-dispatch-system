"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Search } from "lucide-react";
import type { ApiPaginatedResponse, PaginationMeta } from "@smart-dispatch/types";
import { DataTablePagination } from "@/components/shared/data-table/data-table-pagination";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type DataTableColumn<T> = {
  id: string;
  header: string;
  cell: (row: T, context: DataTableRowContext<T>) => ReactNode;
  headerClassName?: string;
  cellClassName?: string;
};

export type DataTableRowContext<T> = {
  row: T;
  index: number;
  rowIndex: number;
};

export type DataTableFetchParams = {
  page: number;
  limit: number;
  search: string;
};

type DataTableProps<T> = {
  title: string;
  description?: string;
  eyebrow?: ReactNode;
  titleClassName?: string;
  searchPlaceholder?: string;
  itemLabel?: string;
  columns: DataTableColumn<T>[];
  fetchData: (params: DataTableFetchParams) => Promise<ApiPaginatedResponse<T>>;
  getRowKey: (row: T) => string;
  emptyIcon?: React.ComponentType<{ className?: string }>;
  emptyTitle?: string;
  emptyDescription?: string;
  emptySearchDescription?: string;
  pageSizeOptions?: number[];
  defaultPageSize?: number;
  searchDebounceMs?: number;
  refreshDeps?: readonly unknown[];
  minTableWidth?: string;
  showIndexColumn?: boolean;
  indexColumnHeader?: string;
  renderRowActions?: (row: T, context: DataTableRowContext<T>) => ReactNode;
  actionsColumnHeader?: string;
  toolbarActions?: ReactNode;
  filterBar?: ReactNode;
  className?: string;
};

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50];

const searchInputClassName =
  "h-10 rounded-lg border-slate-200 bg-white py-2 pl-10 pr-3.5 text-sm shadow-sm";

function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-12 w-full" />
      ))}
    </div>
  );
}

function getPageRange(pagination: PaginationMeta) {
  if (pagination.total === 0) {
    return { start: 0, end: 0 };
  }

  const start = (pagination.page - 1) * pagination.limit + 1;
  const end = Math.min(pagination.page * pagination.limit, pagination.total);
  return { start, end };
}

export function DataTable<T>({
  title,
  description,
  eyebrow,
  titleClassName,
  searchPlaceholder = "Search...",
  itemLabel = "item",
  columns,
  fetchData,
  getRowKey,
  emptyIcon: EmptyIcon,
  emptyTitle = "No results found",
  emptyDescription = "There is nothing to show yet.",
  emptySearchDescription = "Try a different search term.",
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  defaultPageSize = pageSizeOptions[0] ?? 10,
  searchDebounceMs = 300,
  refreshDeps = [],
  minTableWidth = "640px",
  showIndexColumn = false,
  indexColumnHeader = "#",
  renderRowActions,
  actionsColumnHeader = "Actions",
  toolbarActions,
  filterBar,
  className,
}: DataTableProps<T>) {
  const [rows, setRows] = useState<T[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, searchDebounceMs);

    return () => window.clearTimeout(timer);
  }, [search, searchDebounceMs]);

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await fetchData({
        page,
        limit: pageSize,
        search: debouncedSearch,
      });
      setRows(result.data);
      setPagination(result.pagination);

      if (result.pagination.total_pages > 0 && page > result.pagination.total_pages) {
        setPage(result.pagination.total_pages);
      }
    } catch (err) {
      setRows([]);
      setPagination(null);
      setError(err instanceof Error ? err.message : "Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, fetchData, page, pageSize, ...refreshDeps]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  function handlePageSizeChange(nextPageSize: number) {
    setPageSize(nextPageSize);
    setPage(1);
  }

  const pluralLabel = `${itemLabel}s`;
  const totalLabel = pagination
    ? `${pagination.total} ${pagination.total === 1 ? itemLabel : pluralLabel} total`
    : `Loading ${pluralLabel}`;

  const pageRange = pagination ? getPageRange(pagination) : null;

  return (
    <Card className={cn("border-slate-200/80 bg-white shadow-sm", className)}>
      <CardHeader className="gap-4">
        {eyebrow}

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <CardTitle className={cn("font-bold text-slate-900", titleClassName, "shrink-0")}>
            {title}
          </CardTitle>

          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center lg:w-auto lg:justify-end">
            <div className="relative w-full sm:min-w-[240px] sm:max-w-md">
              <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={searchPlaceholder}
                className={searchInputClassName}
              />
            </div>

            {toolbarActions ? (
              <div className="flex shrink-0 items-center justify-end gap-2">{toolbarActions}</div>
            ) : null}
          </div>
        </div>

        <CardDescription className="max-w-2xl text-sm text-slate-500">
          {description ?? totalLabel}
        </CardDescription>

        {filterBar ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4 sm:p-5">{filterBar}</div>
        ) : null}
      </CardHeader>

      <CardContent className="space-y-4">
        {loading ? <TableSkeleton rows={pageSize > 5 ? 5 : pageSize} /> : null}

        {!loading && error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {!loading && !error && rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
            {EmptyIcon ? (
              <div className="rounded-xl bg-slate-900/8 p-3 text-slate-900">
                <EmptyIcon className="size-5" />
              </div>
            ) : null}
            <p className="text-sm font-semibold text-slate-900">{emptyTitle}</p>
            <p className="max-w-sm text-sm text-slate-500">
              {debouncedSearch ? emptySearchDescription : emptyDescription}
            </p>
          </div>
        ) : null}

        {!loading && !error && rows.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-left text-sm" style={{ minWidth: minTableWidth }}>
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  {showIndexColumn ? (
                    <th className="w-12 px-4 py-3 text-center">{indexColumnHeader}</th>
                  ) : null}
                  {columns.map((column) => (
                    <th key={column.id} className={cn("px-4 py-3", column.headerClassName)}>
                      {column.header}
                    </th>
                  ))}
                  {renderRowActions ? (
                    <th className="w-20 px-4 py-3 text-right">{actionsColumnHeader}</th>
                  ) : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {rows.map((row, rowIndex) => {
                  const index = pagination
                    ? (pagination.page - 1) * pagination.limit + rowIndex + 1
                    : rowIndex + 1;
                  const rowContext: DataTableRowContext<T> = { row, index, rowIndex };

                  return (
                    <tr key={getRowKey(row)} className="hover:bg-slate-50/80">
                      {showIndexColumn ? (
                        <td className="px-4 py-3 text-center text-slate-500 tabular-nums">{index}</td>
                      ) : null}
                      {columns.map((column) => (
                        <td key={column.id} className={cn("px-4 py-3", column.cellClassName)}>
                          {column.cell(row, rowContext)}
                        </td>
                      ))}
                      {renderRowActions ? (
                        <td className="px-4 py-3 text-right">{renderRowActions(row, rowContext)}</td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}

        {pagination ? (
          <DataTablePagination
            pagination={pagination}
            pageSize={pageSize}
            pageSizeOptions={pageSizeOptions}
            pageRange={pageRange ?? { start: 0, end: 0 }}
            loading={loading}
            onPageSizeChange={handlePageSizeChange}
            onPageChange={setPage}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}
