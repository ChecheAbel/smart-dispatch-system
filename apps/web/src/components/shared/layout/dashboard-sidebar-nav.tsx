"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import type { Menu } from "@smart-dispatch/types";
import { useNavigation } from "@/components/shared/providers/navigation-context";
import { useLocale } from "@/components/shared/providers";
import { usePortalShell } from "@/components/shared/providers/portal-shell-context";
import { adminNavButtonClass } from "@/lib/admin-theme";
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

function isMenuBranchActive(
  item: Menu,
  pathname: string,
  isNavActive: (pathname: string, href: string) => boolean,
) {
  return collectMenuPaths(item).some((path) => isNavActive(pathname, path));
}

function getActiveRootMenuId(
  items: Menu[],
  pathname: string,
  isNavActive: (pathname: string, href: string) => boolean,
) {
  for (const item of items) {
    if (isMenuBranchActive(item, pathname, isNavActive)) {
      return item.id;
    }
  }

  return null;
}

function NestedMenuGroup({
  item,
  pathname,
  isNavActive,
}: {
  item: Menu;
  pathname: string;
  isNavActive: (pathname: string, href: string) => boolean;
}) {
  const [open, setOpen] = useState(() => isMenuBranchActive(item, pathname, isNavActive));
  const branchActive = isMenuBranchActive(item, pathname, isNavActive);
  const Icon = getMenuIcon(item.icon);

  useEffect(() => {
    if (isMenuBranchActive(item, pathname, isNavActive)) {
      setOpen(true);
    }
  }, [item, isNavActive, pathname]);

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
            <NavMenuChildren items={item.children ?? []} pathname={pathname} isNavActive={isNavActive} />
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuSubItem>
  );
}

function NavMenuChildren({
  items,
  pathname,
  isNavActive,
}: {
  items: Menu[];
  pathname: string;
  isNavActive: (pathname: string, href: string) => boolean;
}) {
  return (
    <>
      {items.map((child) => {
        if (child.children?.length) {
          return (
            <NestedMenuGroup
              key={child.id}
              item={child}
              pathname={pathname}
              isNavActive={isNavActive}
            />
          );
        }

        if (!child.path) {
          return null;
        }

        const ChildIcon = getMenuIcon(child.icon);

        return (
          <SidebarMenuSubItem key={child.id}>
            <SidebarMenuSubButton
              isActive={isNavActive(pathname, child.path)}
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
  pathname,
  open,
  onOpenChange,
  isNavActive,
}: {
  item: Menu;
  pathname: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isNavActive: (pathname: string, href: string) => boolean;
}) {
  const branchActive = isMenuBranchActive(item, pathname, isNavActive);
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
              <NavMenuChildren items={item.children} pathname={pathname} isNavActive={isNavActive} />
            </SidebarMenuSub>
          )}
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

function SidebarMenuItems({
  items,
  pathname,
  isNavActive,
}: {
  items: Menu[];
  pathname: string;
  isNavActive: (pathname: string, href: string) => boolean;
}) {
  const [expandedParentId, setExpandedParentId] = useState<string | null>(() =>
    getActiveRootMenuId(items, pathname, isNavActive),
  );

  useEffect(() => {
    setExpandedParentId(getActiveRootMenuId(items, pathname, isNavActive));
  }, [items, isNavActive, pathname]);

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
              pathname={pathname}
              open={expandedParentId === item.id}
              onOpenChange={(nextOpen) => {
                setExpandedParentId(nextOpen ? item.id : null);
              }}
              isNavActive={isNavActive}
            />
          );
        }

        if (!href) return null;

        return (
          <SidebarMenuItem key={item.id}>
            <SidebarMenuButton
              isActive={isNavActive(pathname, href)}
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
  const { getShellMessages, isNavActive } = usePortalShell();
  const copy = getShellMessages(locale);
  const { menus, loading, error } = useNavigation();

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
      <SidebarMenuItems items={menus} pathname={pathname} isNavActive={isNavActive} />
    </SidebarMenu>
  );
}
