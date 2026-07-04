import type { LucideIcon } from "lucide-react";
import {
  Bell,
  Circle,
  Key,
  LayoutDashboard,
  Mail,
  Menu,
  MessageSquare,
  Route,
  Settings,
  Shield,
  ShieldCheck,
  Users,
} from "lucide-react";

const MENU_ICON_MAP: Record<string, LucideIcon> = {
  "layout-dashboard": LayoutDashboard,
  dashboard: LayoutDashboard,
  users: Users,
  shield: Shield,
  "shield-check": ShieldCheck,
  roles: Shield,
  key: Key,
  permissions: Key,
  menu: Menu,
  menus: Menu,
  route: Route,
  endpoints: Route,
  settings: Settings,
  "access-control": ShieldCheck,
  bell: Bell,
  notifications: Bell,
  mail: Mail,
  "message-square": MessageSquare,
};

export function getMenuIcon(icon?: string | null): LucideIcon {
  if (!icon) return Circle;
  const normalized = icon.trim().toLowerCase();
  return MENU_ICON_MAP[normalized] ?? Circle;
}
