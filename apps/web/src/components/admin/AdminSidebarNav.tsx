"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Menu } from "@smart-dispatch/types";
import { useAdminNavigation } from "@/components/admin/admin-navigation-context";
import { isAdminNavActive } from "@/lib/admin-navigation";
import { adminNavButtonClass } from "@/lib/admin-theme";
import { getMenuIcon } from "@/lib/menu-icons";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";

function AdminSidebarMenuItems({ items, pathname }: { items: Menu[]; pathname: string }) {
  return (
    <>
      {items.map((item) => {
        const hasChildren = Boolean(item.children?.length);
        const href = item.path ?? undefined;
        const Icon = getMenuIcon(item.icon);

        if (hasChildren) {
          return (
            <SidebarMenuItem key={item.id}>
              <SidebarMenuButton tooltip={item.label} className={adminNavButtonClass}>
                <Icon />
                <span>{item.label}</span>
              </SidebarMenuButton>
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
            </SidebarMenuItem>
          );
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
