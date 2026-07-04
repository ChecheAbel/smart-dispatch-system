import { Activity, ShieldCheck, Users, Waypoints } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  adminBadgeGoldClass,
  adminBadgeSuccessClass,
  adminCardClass,
  adminHeadingClass,
  adminIconBoxClass,
} from "@/lib/admin-theme";

const overviewCards = [
  {
    title: "Active Users",
    value: "—",
    description: "Platform accounts currently active",
    icon: Users,
  },
  {
    title: "Dispatch Queue",
    value: "—",
    description: "Trips awaiting assignment",
    icon: Waypoints,
  },
  {
    title: "Fleet Online",
    value: "—",
    description: "Drivers available right now",
    icon: Activity,
  },
  {
    title: "Admin Access",
    value: "Enabled",
    description: "Role-based permissions active",
    icon: ShieldCheck,
  },
] as const;

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Badge className={adminBadgeGoldClass}>Overview</Badge>
        <h2 className={`text-2xl font-extrabold tracking-tight ${adminHeadingClass}`}>Dashboard</h2>
        <p className="max-w-2xl text-sm text-slate-500">
          Welcome to the Smart Dispatch admin console. Use the sidebar to manage users, roles, and
          navigation menus.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {overviewCards.map((card) => (
          <Card key={card.title} className={adminCardClass}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className={`text-sm font-semibold ${adminHeadingClass}`}>
                  {card.title}
                </CardTitle>
                <div className={adminIconBoxClass}>
                  <card.icon className="size-4" />
                </div>
              </div>
              <CardDescription className="text-slate-500">{card.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className={`text-3xl font-extrabold ${adminHeadingClass}`}>{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card className={adminCardClass}>
          <CardHeader>
            <CardTitle className={adminHeadingClass}>Getting started</CardTitle>
            <CardDescription className="text-slate-500">
              Core admin modules are ready for API integration.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-500">
            <p>• Users and roles can be managed from the sidebar.</p>
            <p>• Navigation menus are loaded from `/api/menus/navigation`.</p>
            <p>• Permissions and API endpoints are managed automatically by the backend.</p>
          </CardContent>
        </Card>

        <Card className={adminCardClass}>
          <CardHeader>
            <CardTitle className={adminHeadingClass}>System status</CardTitle>
            <CardDescription className="text-slate-500">Current platform health</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-[#f8fafb] px-3 py-2">
              <span className="text-sm text-slate-500">API</span>
              <Badge className={adminBadgeSuccessClass}>Connected</Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-[#f8fafb] px-3 py-2">
              <span className="text-sm text-slate-500">Auth session</span>
              <Badge className={adminBadgeSuccessClass}>Active</Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-[#f8fafb] px-3 py-2">
              <span className="text-sm text-slate-500">RBAC</span>
              <Badge className={adminBadgeSuccessClass}>Enabled</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
