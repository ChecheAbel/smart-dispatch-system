"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Search } from "lucide-react";
import type { Menu } from "@smart-dispatch/types";
import {
  buildMenuTree,
  filterMenuTree,
  flattenMenuTree,
  type MenuTreeRow,
} from "@/lib/admin-navigation";
import { getMenuIcon } from "@/lib/menu-icons";
import { fetchMenus } from "@/lib/menu-api";
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

type MenuTreeTableProps = {
  locale: string;
  title: string;
  description?: string;
  eyebrow?: ReactNode;
  titleClassName?: string;
  searchPlaceholder?: string;
  itemLabel?: string;
  labelHeader: string;
  emptyIcon?: React.ComponentType<{ className?: string }>;
  emptyTitle?: string;
  emptyDescription?: string;
  emptySearchDescription?: string;
  refreshDeps?: readonly unknown[];
  toolbarActions?: ReactNode;
  renderRowActions?: (menu: Menu) => ReactNode;
  actionsColumnHeader?: string;
  columns: Array<{
    id: string;
    header: string;
    headerClassName?: string;
    cellClassName?: string;
    cell: (menu: Menu) => ReactNode;
  }>;
};

const searchInputClassName =
  "h-10 rounded-lg border-slate-200 bg-white py-2 pl-10 pr-3.5 text-sm shadow-sm";

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, index) => (
        <Skeleton key={index} className="h-12 w-full" />
      ))}
    </div>
  );
}

function MenuLabelCell({ menu, depth }: { menu: Menu; depth: number }) {
  const Icon = getMenuIcon(menu.icon);
  const isGroup = !menu.path && Boolean(menu.children?.length);

  return (
    <div
      className="flex min-w-0 items-center gap-2"
      style={{ paddingLeft: `${depth * 1.5}rem` }}
    >
      {depth > 0 ? (
        <span className="size-4 shrink-0 text-slate-300" aria-hidden>
          └
        </span>
      ) : null}
      <div
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-lg",
          isGroup ? "bg-[#1C3A34]/8 text-[#1C3A34]" : "bg-slate-100 text-slate-600",
        )}
      >
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-slate-700">{menu.label}</p>
        {isGroup ? (
          <p className="truncate text-xs text-slate-400">Group</p>
        ) : null}
      </div>
    </div>
  );
}

export function MenuTreeTable({
  locale,
  title,
  description,
  eyebrow,
  titleClassName,
  searchPlaceholder = "Search...",
  itemLabel = "menu",
  labelHeader,
  emptyIcon: EmptyIcon,
  emptyTitle = "No menus found",
  emptyDescription = "Navigation menus will appear here once they are created.",
  emptySearchDescription = "Try a different search term.",
  refreshDeps = [],
  toolbarActions,
  renderRowActions,
  actionsColumnHeader = "Actions",
  columns,
}: MenuTreeTableProps) {
  const [menus, setMenus] = useState<Menu[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 300);

    return () => window.clearTimeout(timer);
  }, [search]);

  const loadMenus = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await fetchMenus({ page: 1, limit: 100, locale });
      setMenus(result.data);
    } catch (err) {
      setMenus([]);
      setError(err instanceof Error ? err.message : "Failed to load menus.");
    } finally {
      setLoading(false);
    }
  }, [locale, ...refreshDeps]);

  useEffect(() => {
    void loadMenus();
  }, [loadMenus]);

  const menuTree = useMemo(() => buildMenuTree(menus), [menus]);
  const filteredTree = useMemo(
    () => filterMenuTree(menuTree, debouncedSearch),
    [menuTree, debouncedSearch],
  );
  const rows = useMemo(() => flattenMenuTree(filteredTree), [filteredTree]);

  const pluralLabel = `${itemLabel}s`;
  const totalLabel = `${menus.length} ${menus.length === 1 ? itemLabel : pluralLabel} total`;

  return (
    <Card className="border-slate-200/80 bg-white shadow-sm">
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
      </CardHeader>

      <CardContent className="space-y-4">
        {loading ? <TableSkeleton /> : null}

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
            <table className="w-full text-left text-sm" style={{ minWidth: "880px" }}>
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="min-w-[240px] px-4 py-3">{labelHeader}</th>
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
                {rows.map(({ menu, depth }: MenuTreeRow) => (
                  <tr key={menu.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3">
                      <MenuLabelCell menu={menu} depth={depth} />
                    </td>
                    {columns.map((column) => (
                      <td key={column.id} className={cn("px-4 py-3", column.cellClassName)}>
                        {column.cell(menu)}
                      </td>
                    ))}
                    {renderRowActions ? (
                      <td className="px-4 py-3 text-right">{renderRowActions(menu)}</td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
