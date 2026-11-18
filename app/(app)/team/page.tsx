import Link from "next/link";
import { db } from "@/lib/db";
import { requireMe } from "@/lib/me";
import { goalStage, pickCycle, statusFor, visibleCycles } from "@/lib/data";
import { Badge, CyclePicker, Empty, SP } from "@/components/ui";

export default async function TeamPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const me = await requireMe();
  const [cycles, cycle, { data }] = await Promise.all([
    visibleCycles(), pickCycle(sp.cycle),
    db().from("employees").select("id, full_name, designation, department").eq("manager_id", me.id).eq("is_active", true).order("full_name"),
  ]);
  const team = data ?? [];
  const st = cycle ? await statusFor(team.map((t) => t.id), cycle.id) : {};

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="h1">My Team</h1>{cycle && <p className="text-sm text-slate-500">{cycle.name}</p>}</div>
        <CyclePicker cycles={cycles} current={cycle?.id} />
      </div>
      {team.length === 0 ? <Empty title="Nobody reports to you yet">HR sets reporting lines under Employees.</Empty>
        : !cycle ? <Empty title="No review cycle yet" /> : (
        <div className="card overflow-x-auto !p-0">
          <table className="tbl">
            <thead><tr><th>Name</th><th>Goals</th><th>Review</th><th></th></tr></thead>
            <tbody>{team.map((t) => {
              const pending = st[t.id].goals.filter((g) => g.status === "submitted").length;
              return (
                <tr key={t.id}>
                  <td>{t.full_name}<div className="text-xs text-slate-500">{t.designation} · {t.department}</div></td>
                  <td><Badge s={goalStage(st[t.id].goals)} />{pending > 0 && <div className="mt-1 text-xs text-amber-700">{pending} awaiting you</div>}</td>
                  <td><Badge s={st[t.id].review?.status ?? "not_started"} /></td>
                  <td><Link href={`/team/${t.id}?cycle=${cycle.id}`} className="btn-ghost">Open</Link></td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
