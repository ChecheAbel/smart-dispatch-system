import type { LucideIcon } from "lucide-react";
import {
  Circle,
  Key,
  LayoutDashboard,
  Menu,
  Route,
  Settings,
  Shield,
  Users,
} from "lucide-react";

const MENU_ICON_MAP: Record<string, LucideIcon> = {
  "layout-dashboard": LayoutDashboard,
  dashboard: LayoutDashboard,
  users: Users,
  shield: Shield,
  roles: Shield,
  key: Key,
  permissions: Key,
  menu: Menu,
  menus: Menu,
  route: Route,
  endpoints: Route,
  settings: Settings,
};

export function getMenuIcon(icon?: string | null): LucideIcon {
  if (!icon) return Circle;
  const normalized = icon.trim().toLowerCase();
  return MENU_ICON_MAP[normalized] ?? Circle;
}
