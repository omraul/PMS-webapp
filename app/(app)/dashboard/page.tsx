import Link from "next/link";
import { db } from "@/lib/db";
import { requireMe } from "@/lib/me";
import { goalStage, openCycle, statusFor } from "@/lib/data";
import { Badge, Empty, Stat } from "@/components/ui";

// Role-aware landing page: own progress for everyone, team for managers, company for HR.
export default async function Dashboard() {
  const me = await requireMe();
  const cycle = await openCycle();
  const hello = <h1 className="h1">Hello, {me.full_name.split(" ")[0]}</h1>;

  if (!cycle) {
    return (
      <div className="space-y-4">{hello}
        <Empty title="No review cycle is open right now">
          {me.role === "hr_admin" ? <>Create and open one under <Link className="text-indigo-600 underline" href="/admin/cycles">Cycles</Link>.</> : "HR will open the next appraisal cycle. Your tasks will appear here."}
        </Empty>
      </div>
    );
  }

  const mine = (await statusFor([me.id], cycle.id))[me.id];
  const stage = goalStage(mine.goals);
  const rStatus = mine.review?.status ?? "not_started";
  const total = mine.goals.reduce((t, g) => t + Number(g.weightage), 0);
  const next =
    stage === "none" || stage === "draft" ? ["Add your goals (total 100%) and submit them", "/goals"]
    : stage === "sent_back" ? ["Your manager sent a goal back — review the comment", "/goals"]
    : stage === "submitted" ? ["Waiting for your manager to approve your goals", "/goals"]
    : rStatus === "not_started" ? ["Your goals are approved — complete your self-appraisal", "/review"]
    : rStatus === "completed" ? ["Your review is complete — see your ratings", "/review"]
    : ["Waiting for your manager's review", "/review"];

  let team: { id: string; full_name: string; designation: string | null }[] = [];
  let teamSt: Awaited<ReturnType<typeof statusFor>> = {};
  if (me.isManager) {
    const { data } = await db().from("employees").select("id, full_name, designation").eq("manager_id", me.id).eq("is_active", true).order("full_name");
    team = data ?? [];
    teamSt = await statusFor(team.map((t) => t.id), cycle.id);
  }

  let company: Record<string, number> | null = null;
  if (me.role === "hr_admin") {
    const { data } = await db().from("employees").select("id").eq("is_active", true);
    const st = await statusFor((data ?? []).map((e) => e.id), cycle.id);
    company = { total: 0, not_started: 0, self_submitted: 0, manager_reviewed: 0, completed: 0 };
    Object.values(st).forEach((x) => { company!.total++; company![x.review?.status ?? "not_started"]++; });
  }

  return (
    <div className="space-y-6">
      <div>{hello}<p className="text-sm text-slate-500">Current cycle: <b>{cycle.name}</b> · {cycle.start_date} to {cycle.end_date}</p></div>

      <section className="space-y-3">
        <h2 className="font-semibold">My progress</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Goals" value={<>{mine.goals.length} <span className="text-sm font-normal text-slate-500">({total}% weight)</span></>} />
          <Stat label="Goal status" value={<Badge s={stage} />} />
          <Stat label="Review status" value={<Badge s={rStatus} />} />
        </div>
        <Link href={next[1]} className="card block hover:border-indigo-300"><span className="text-sm text-slate-500">Next step</span><p className="font-medium text-indigo-700">{next[0]} →</p></Link>
      </section>

      {me.isManager && (
        <section className="space-y-3">
          <h2 className="font-semibold">My team ({team.filter((t) => teamSt[t.id].review?.status === "completed").length}/{team.length} completed)</h2>
          {team.length === 0 ? <Empty title="No direct reports yet" /> : (
            <div className="card overflow-x-auto !p-0">
              <table className="tbl"><thead><tr><th>Name</th><th>Goals</th><th>Review</th><th></th></tr></thead>
                <tbody>{team.map((t) => (
                  <tr key={t.id}><td>{t.full_name}<div className="text-xs text-slate-500">{t.designation}</div></td>
                    <td><Badge s={goalStage(teamSt[t.id].goals)} /></td><td><Badge s={teamSt[t.id].review?.status ?? "not_started"} /></td>
                    <td><Link href={`/team/${t.id}`} className="text-indigo-600 hover:underline">Open</Link></td></tr>
                ))}</tbody></table>
            </div>
          )}
        </section>
      )}

      {company && (
        <section className="space-y-3">
          <h2 className="font-semibold">Company completion</h2>
          <div className="grid gap-3 sm:grid-cols-5">
            <Stat label="Active employees" value={company.total} />
            <Stat label="Not started" value={company.not_started} />
            <Stat label="Self submitted" value={company.self_submitted} />
            <Stat label="Manager reviewed" value={company.manager_reviewed} />
            <Stat label="Completed" value={<>{company.completed} <span className="text-sm font-normal text-slate-500">({company.total ? Math.round((company.completed / company.total) * 100) : 0}%)</span></>} />
          </div>
          <Link href="/admin/report" className="text-sm text-indigo-600 hover:underline">See the full completion report →</Link>
        </section>
      )}
    </div>
  );
}
