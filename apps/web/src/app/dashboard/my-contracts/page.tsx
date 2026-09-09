import { redirect } from "next/navigation";
import { USER_DASHBOARD_PATH } from "@/lib/auth-paths";

export default function Page() {
  redirect(USER_DASHBOARD_PATH);
}

