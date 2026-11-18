import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { requireMe } from "@/lib/me";
import { LABEL } from "@/components/ui";

// Shared shell for every signed-in page. Navigation depends on the user's role.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const me = await requireMe();
  const links: [string, string][] = [["/dashboard", "Dashboard"], ["/goals", "My Goals"], ["/review", "My Review"]];
  if (me.isManager) links.push(["/team", "My Team"]);
  if (me.role === "hr_admin") links.push(["/admin/employees", "Employees"], ["/admin/cycles", "Cycles"], ["/admin/report", "Report"]);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Link href="/dashboard" className="font-bold text-indigo-600">PerformIQ</Link>
          <span className="ml-auto hidden text-xs text-slate-500 sm:block">{me.full_name} · {LABEL[me.role]}</span>
          <UserButton />
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-2 text-sm">
          {links.map(([href, label]) => (
            <Link key={href} href={href} className="whitespace-nowrap rounded-md px-3 py-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900">{label}</Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
