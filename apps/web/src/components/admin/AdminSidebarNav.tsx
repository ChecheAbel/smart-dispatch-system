"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import type { Menu } from "@smart-dispatch/types";
import { useAdminNavigation } from "@/components/admin/admin-navigation-context";
import { isAdminNavActive } from "@/lib/admin-navigation";
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

function ParentMenuItem({ item, pathname }: { item: Menu; pathname: string }) {
  const childActive = Boolean(
    item.children?.some((child) => child.path && isAdminNavActive(pathname, child.path)),
  );
  const [open, setOpen] = useState(childActive);
  const Icon = getMenuIcon(item.icon);

  useEffect(() => {
    if (childActive) {
      setOpen(true);
    }
  }, [childActive]);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger
          render={
            <SidebarMenuButton
              isActive={childActive}
              tooltip={item.label}
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
            <SidebarMenuSub>
              {item.children.map((child) => {
                if (!child.path) return null;
                const ChildIcon = getMenuIcon(child.icon);

                return (
                  <SidebarMenuSubItem key={child.id}>
                    <SidebarMenuSubButton
                      isActive={isAdminNavActive(pathname, child.path)}
                      className={adminNavButtonClass}
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

function AdminSidebarMenuItems({ items, pathname }: { items: Menu[]; pathname: string }) {
  return (
    <>
      {items.map((item) => {
        const hasChildren = Boolean(item.children?.length);
        const href = item.path ?? undefined;
        const Icon = getMenuIcon(item.icon);

        if (hasChildren) {
          return <ParentMenuItem key={item.id} item={item} pathname={pathname} />;
        }

        if (!href) return null;

        return (
          <SidebarMenuItem key={item.id}>
            <SidebarMenuButton
              isActive={isAdminNavActive(pathname, href)}
              tooltip={item.label}
              className={adminNavButtonClass}
              render={<Link href={href} />}
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

export default function AdminSidebarNav() {
  const pathname = usePathname();
  const { menus, loading, error } = useAdminNavigation();

  if (loading) {
    return (
      <SidebarMenu>
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
        No navigation items available.
      </p>
    );
  }

  return (
    <SidebarMenu>
      <AdminSidebarMenuItems items={menus} pathname={pathname} />
    </SidebarMenu>
  );
}
