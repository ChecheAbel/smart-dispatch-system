"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import type { Menu } from "@smart-dispatch/types";
import { useNavigation } from "@/components/shared/providers/navigation-context";
import { useLocale } from "@/components/shared/providers";
import { usePortalShell } from "@/components/shared/providers/portal-shell-context";
import { ADMIN_EXACT_MATCH_ROOTS, flattenMenus } from "@/lib/admin-navigation";
import { adminNavButtonClass } from "@/lib/admin-theme";
import { CUSTOMER_EXACT_MATCH_ROOTS } from "@/lib/customer-navigation";
import { resolveActiveMenuPath } from "@/lib/menu-navigation";
import { getMenuIcon } from "@/lib/menu-icons";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";

function collectMenuPaths(item: Menu): string[] {
  const paths: string[] = [];

  if (item.path) {
    paths.push(item.path);
  }

  for (const child of item.children ?? []) {
    paths.push(...collectMenuPaths(child));
  }

  return paths;
}

function isMenuBranchActive(item: Menu, activeMenuPath: string | null) {
  if (!activeMenuPath) {
    return false;
  }

  return collectMenuPaths(item).includes(activeMenuPath);
}

function getActiveRootMenuId(items: Menu[], activeMenuPath: string | null) {
  for (const item of items) {
    if (isMenuBranchActive(item, activeMenuPath)) {
      return item.id;
    }
  }

  return null;
}

function NestedMenuGroup({
  item,
  activeMenuPath,
}: {
  item: Menu;
  activeMenuPath: string | null;
}) {
  const [open, setOpen] = useState(() => isMenuBranchActive(item, activeMenuPath));
  const branchActive = isMenuBranchActive(item, activeMenuPath);
  const Icon = getMenuIcon(item.icon);

  useEffect(() => {
    if (isMenuBranchActive(item, activeMenuPath)) {
      setOpen(true);
    }
  }, [activeMenuPath, item]);

  return (
    <SidebarMenuSubItem>
      <Collapsible open={open} onOpenChange={setOpen} className="group/nested">
        <CollapsibleTrigger
          className={cn(
            "flex h-9 w-full items-center gap-2 rounded-md px-3 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            branchActive && "bg-sidebar-accent text-sidebar-accent-foreground",
          )}
        >
          <Icon className="size-4 shrink-0" />
          <span className="truncate">{item.label}</span>
          <ChevronRight
            className={cn(
              "ml-auto size-3.5 shrink-0 text-sidebar-foreground/60 transition-transform duration-200",
              open && "rotate-90",
            )}
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub className="ml-3.5 gap-1 border-l border-sidebar-border/70 py-1 pl-2">
            <NavMenuChildren items={item.children ?? []} activeMenuPath={activeMenuPath} />
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuSubItem>
  );
}

function NavMenuChildren({
  items,
  activeMenuPath,
}: {
  items: Menu[];
  activeMenuPath: string | null;
}) {
  return (
    <>
      {items.map((child) => {
        if (child.children?.length) {
          return <NestedMenuGroup key={child.id} item={child} activeMenuPath={activeMenuPath} />;
        }

        if (!child.path) {
          return null;
        }

        const ChildIcon = getMenuIcon(child.icon);

        return (
          <SidebarMenuSubItem key={child.id}>
            <SidebarMenuSubButton
              isActive={child.path === activeMenuPath}
              size="md"
              className={cn(adminNavButtonClass, "h-9 px-3")}
              render={<Link href={child.path} />}
            >
              <ChildIcon />
              <span>{child.label}</span>
            </SidebarMenuSubButton>
          </SidebarMenuSubItem>
        );
      })}
    </>
  );
}

function ParentMenuItem({
  item,
  activeMenuPath,
  open,
  onOpenChange,
}: {
  item: Menu;
  activeMenuPath: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const branchActive = isMenuBranchActive(item, activeMenuPath);
  const Icon = getMenuIcon(item.icon);

  return (
    <Collapsible open={open} onOpenChange={onOpenChange} className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger
          render={
            <SidebarMenuButton
              isActive={branchActive}
              tooltip={item.label}
              size="lg"
              className={adminNavButtonClass}
            />
          }
        >
          <Icon />
          <span>{item.label}</span>
          <ChevronRight
            className={cn(
              "ml-auto size-4 shrink-0 text-sidebar-foreground/60 transition-transform duration-200",
              open && "rotate-90",
            )}
          />
        </CollapsibleTrigger>

        <CollapsibleContent className="overflow-hidden data-ending-style:animate-out data-starting-style:animate-in">
          {item.children && (
            <SidebarMenuSub className="gap-1.5 py-1">
              <NavMenuChildren items={item.children} activeMenuPath={activeMenuPath} />
            </SidebarMenuSub>
          )}
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

function SidebarMenuItems({
  items,
  activeMenuPath,
}: {
  items: Menu[];
  activeMenuPath: string | null;
}) {
  const [expandedParentId, setExpandedParentId] = useState<string | null>(() =>
    getActiveRootMenuId(items, activeMenuPath),
  );

  useEffect(() => {
    setExpandedParentId(getActiveRootMenuId(items, activeMenuPath));
  }, [activeMenuPath, items]);

  return (
    <>
      {items.map((item) => {
        const hasChildren = Boolean(item.children?.length);
        const href = item.path ?? undefined;
        const Icon = getMenuIcon(item.icon);

        if (hasChildren) {
          return (
            <ParentMenuItem
              key={item.id}
              item={item}
              activeMenuPath={activeMenuPath}
              open={expandedParentId === item.id}
              onOpenChange={(nextOpen) => {
                setExpandedParentId(nextOpen ? item.id : null);
              }}
            />
          );
        }

        if (!href) return null;

        return (
          <SidebarMenuItem key={item.id}>
            <SidebarMenuButton
              isActive={href === activeMenuPath}
              tooltip={item.label}
              size="lg"
              className={adminNavButtonClass}
              render={<Link href={href} />}
              onClick={() => setExpandedParentId(null)}
            >
              <Icon />
              <span>{item.label}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </>
  );
}

export function DashboardSidebarNav() {
  const pathname = usePathname();
  const { locale } = useLocale();
  const { getShellMessages, portal } = usePortalShell();
  const copy = getShellMessages(locale);
  const { menus, loading, error } = useNavigation();
  const exactMatchRoots = portal === "admin" ? ADMIN_EXACT_MATCH_ROOTS : CUSTOMER_EXACT_MATCH_ROOTS;
  const menuPaths = useMemo(
    () =>
      flattenMenus(menus)
        .map((menu) => menu.path)
        .filter((path): path is string => Boolean(path)),
    [menus],
  );
  const activeMenuPath = useMemo(
    () => resolveActiveMenuPath(pathname, menuPaths, exactMatchRoots),
    [exactMatchRoots, menuPaths, pathname],
  );

  if (loading) {
    return (
      <SidebarMenu className="gap-1.5 px-2 py-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <SidebarMenuItem key={index}>
            <SidebarMenuSkeleton showIcon />
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    );
  }

  if (error) {
    return (
      <p className="px-3 py-2 text-xs leading-relaxed text-sidebar-foreground/60 group-data-[collapsible=icon]:hidden">
        {error}
      </p>
    );
  }

  if (!menus.length) {
    return (
      <p className="px-3 py-2 text-xs text-sidebar-foreground/60 group-data-[collapsible=icon]:hidden">
        {copy.sidebar.noNavigation}
      </p>
    );
  }

  return (
    <SidebarMenu className="gap-1.5 px-2 py-2">
      <SidebarMenuItems items={menus} activeMenuPath={activeMenuPath} />
    </SidebarMenu>
  );
}
