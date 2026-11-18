import Link from "next/link";
import { db } from "@/lib/db";
import { requireHR } from "@/lib/me";
import { goalStage, pickCycle, statusFor, visibleCycles } from "@/lib/data";
import { Badge, CyclePicker, Empty, SP, Stat, ratingLabel } from "@/components/ui";

export default async function ReportPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  await requireHR();
  const [cycles, cycle, { data }] = await Promise.all([
    visibleCycles(), pickCycle(sp.cycle),
    db().from("employees").select("id, full_name, department, manager_id").eq("is_active", true).order("full_name"),
  ]);
  if (!cycle) return <div className="space-y-4"><h1 className="h1">Completion report</h1><Empty title="No open or closed cycles yet" /></div>;

  const emps = data ?? [];
  const name = new Map(emps.map((e) => [e.id, e.full_name]));
  const st = await statusFor(emps.map((e) => e.id), cycle.id);
  const filter = sp.status;
  const rows = emps.filter((e) => !filter || (st[e.id].review?.status ?? "not_started") === filter);
  const count = (s: string) => emps.filter((e) => (st[e.id].review?.status ?? "not_started") === s).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="h1">Completion report</h1><p className="text-sm text-slate-500">{cycle.name} · <Badge s={cycle.status} /></p></div>
        <div className="flex gap-2"><CyclePicker cycles={cycles} current={cycle.id} /><a href={`/api/export?cycle=${cycle.id}`} className="btn-ghost">Export CSV</a></div>
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        {["not_started", "self_submitted", "manager_reviewed", "completed"].map((s) => (
          <Link key={s} href={`/admin/report?cycle=${cycle.id}${filter === s ? "" : `&status=${s}`}`} className={filter === s ? "ring-2 ring-indigo-500 rounded-xl" : ""}>
            <Stat label={`${s === "completed" ? "Completed" : s.replace("_", " ")}`} value={count(s)} />
          </Link>
        ))}
      </div>
      {rows.length === 0 ? <Empty title="Nobody matches this filter" /> : (
        <div className="card overflow-x-auto !p-0">
          <table className="tbl">
            <thead><tr><th>Employee</th><th>Manager</th><th>Goals</th><th>Review</th><th>Final rating</th><th></th></tr></thead>
            <tbody>{rows.map((e) => {
              const r = st[e.id].review;
              return (
                <tr key={e.id}>
                  <td>{e.full_name}<div className="text-xs text-slate-500">{e.department}</div></td>
                  <td>{e.manager_id ? name.get(e.manager_id) ?? "—" : <span className="text-amber-700">Not assigned</span>}</td>
                  <td><Badge s={goalStage(st[e.id].goals)} /></td>
                  <td><Badge s={r?.status ?? "not_started"} /></td>
                  <td>{r?.status === "completed" ? ratingLabel(r.overall_manager_rating) : "—"}</td>
                  <td><Link href={`/team/${e.id}?cycle=${cycle.id}`} className="text-indigo-600 hover:underline">View</Link></td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
