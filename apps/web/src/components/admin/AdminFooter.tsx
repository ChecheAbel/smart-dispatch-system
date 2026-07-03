import Link from "next/link";
import { adminTheme } from "@/lib/admin-theme";
import { Separator } from "@/components/ui/separator";

export default function AdminFooter() {
  return (
    <footer className="mt-auto border-t border-slate-200/80 bg-white">
      <div className="flex flex-col gap-3 px-4 py-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="space-y-1">
          <p className="font-medium text-[#1C3A34]">© {new Date().getFullYear()} Cheche Technologies</p>
          <p>Smart Dispatch System — Ethiopian Investment Holdings</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/"
            className="font-medium transition-colors hover:text-[#C9B87A]"
            style={{ color: adminTheme.brand }}
          >
            Back to website
          </Link>
          <Separator orientation="vertical" className="hidden h-4 sm:block" />
          <span>Version 1.0.0</span>
        </div>
      </div>
    </footer>
  );
}
