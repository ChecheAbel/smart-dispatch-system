import type { LucideIcon } from "lucide-react";
import {
  Bell,
  Circle,
  Key,
  Layers,
  LayoutDashboard,
  Mail,
  Map,
  MapPin,
  Menu,
  MessageSquare,
  Route,
  ScrollText,
  Settings,
  Shield,
  ShieldCheck,
  Truck,
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
  "scroll-text": ScrollText,
  "audit-logs": ScrollText,
  settings: Settings,
  "access-control": ShieldCheck,
  bell: Bell,
  notifications: Bell,
  mail: Mail,
  "message-square": MessageSquare,
  truck: Truck,
  fleet: Truck,
  "fleet-vehicles": Truck,
  layers: Layers,
  "vehicle-types": Layers,
  map: Map,
  "map-pin": MapPin,
  "location-management": Map,
  "location-regions": Map,
  "location-sites": MapPin,
};

export function getMenuIcon(icon?: string | null): LucideIcon {
  if (!icon) return Circle;
  const normalized = icon.trim().toLowerCase();
  return MENU_ICON_MAP[normalized] ?? Circle;
}
