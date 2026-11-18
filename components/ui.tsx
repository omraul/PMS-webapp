import Link from "next/link";

const COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700", open: "bg-green-100 text-green-800", closed: "bg-slate-200 text-slate-600",
  submitted: "bg-amber-100 text-amber-800", approved: "bg-green-100 text-green-800", sent_back: "bg-red-100 text-red-700",
  not_started: "bg-slate-100 text-slate-600", self_submitted: "bg-amber-100 text-amber-800",
  manager_reviewed: "bg-blue-100 text-blue-800", completed: "bg-green-100 text-green-800", none: "bg-slate-100 text-slate-500",
  inactive: "bg-red-100 text-red-700", active: "bg-green-100 text-green-800",
};
export const LABEL: Record<string, string> = {
  draft: "Draft", open: "Open", closed: "Closed", submitted: "Pending approval", approved: "Approved", sent_back: "Sent back",
  not_started: "Not started", self_submitted: "Self-appraisal submitted", manager_reviewed: "Manager reviewed",
  completed: "Completed", none: "No goals yet", hr_admin: "HR Admin", manager: "Manager", employee: "Employee",
  active: "Active", inactive: "Inactive",
};

export function Badge({ s }: { s: string }) {
  return <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${COLORS[s] ?? "bg-slate-100"}`}>{LABEL[s] ?? s}</span>;
}

export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="card py-10 text-center">
      <p className="font-medium text-slate-700">{title}</p>
      {children && <div className="mt-1 text-sm text-slate-500">{children}</div>}
    </div>
  );
}

export function Flash({ sp }: { sp: Record<string, string | undefined> }) {
  if (!sp.msg) return null;
  const ok = sp.ok === "1";
  return <div className={`mb-4 rounded-lg border px-4 py-2 text-sm ${ok ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-700"}`}>{sp.msg}</div>;
}

export const RATINGS: [number, string][] = [
  [1, "1 – Below expectations"], [2, "2 – Partially meets"], [3, "3 – Meets expectations"],
  [4, "4 – Exceeds expectations"], [5, "5 – Outstanding"],
];
export const ratingLabel = (n?: number | null) => (n ? RATINGS[n - 1]?.[1] : "—");

export function RatingSelect({ name, value }: { name: string; value?: number | null }) {
  return (
    <select name={name} defaultValue={value ?? ""} required className="input">
      <option value="" disabled>Select rating</option>
      {RATINGS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}

export function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="card"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></div>;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function CyclePicker({ cycles, current }: { cycles: any[]; current?: string }) {
  if (cycles.length < 2) return null;
  return (
    <form method="get" className="flex gap-2">
      <select name="cycle" defaultValue={current} className="input !w-auto">
        {cycles.map((c) => <option key={c.id} value={c.id}>{c.name} ({LABEL[c.status]})</option>)}
      </select>
      <button className="btn-ghost">View</button>
    </form>
  );
}

export function Back({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} className="text-sm text-indigo-600 hover:underline">← {children}</Link>;
}

export type SP = Promise<Record<string, string | undefined>>;
