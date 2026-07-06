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

function getActiveParentMenuId(
  items: Menu[],
  pathname: string,
  isNavActive: (pathname: string, href: string) => boolean,
) {
  for (const item of items) {
    if (!item.children?.length) {
      continue;
    }

    const childActive = item.children.some(
      (child) => child.path && isNavActive(pathname, child.path),
    );

    if (childActive) {
      return item.id;
    }
  }

  return null;
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
  const childActive = Boolean(
    item.children?.some((child) => child.path && isNavActive(pathname, child.path)),
  );
  const Icon = getMenuIcon(item.icon);

  return (
    <Collapsible open={open} onOpenChange={onOpenChange} className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger
          render={
            <SidebarMenuButton
              isActive={childActive}
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
              {item.children.map((child) => {
                if (!child.path) return null;
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
    getActiveParentMenuId(items, pathname, isNavActive),
  );

  useEffect(() => {
    setExpandedParentId(getActiveParentMenuId(items, pathname, isNavActive));
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
