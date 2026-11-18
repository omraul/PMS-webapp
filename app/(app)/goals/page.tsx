import Link from "next/link";
import { db } from "@/lib/db";
import { requireMe } from "@/lib/me";
import { openCycle } from "@/lib/data";
import { Badge, Empty, Flash, SP } from "@/components/ui";
import { deleteGoal, saveGoal, submitGoals } from "@/app/actions";

export default async function GoalsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const me = await requireMe();
  const cycle = await openCycle();
  if (!cycle) return <div className="space-y-4"><h1 className="h1">My Goals</h1><Empty title="No review cycle is open">Goals can be set once HR opens a cycle.</Empty></div>;

  const [{ data }, { data: review }] = await Promise.all([
    db().from("goals").select("*").eq("employee_id", me.id).eq("cycle_id", cycle.id).order("created_at"),
    db().from("reviews").select("status").eq("employee_id", me.id).eq("cycle_id", cycle.id).maybeSingle(),
  ]);
  const goals = data ?? [];
  const locked = !!review && review.status !== "not_started";
  const editable = (g: { status: string }) => !locked && (g.status === "draft" || g.status === "sent_back");
  const total = goals.reduce((t, g) => t + Number(g.weightage), 0);
  const editing = sp.edit ? goals.find((g) => g.id === sp.edit && editable(g)) : null;
  const canSubmit = goals.some(editable);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="h1">My Goals</h1><p className="text-sm text-slate-500">{cycle.name}</p></div>
        <p className={`text-sm font-medium ${total === 100 ? "text-green-700" : "text-amber-700"}`}>Total weightage: {total}% {total === 100 ? "✓" : "(must be 100%)"}</p>
      </div>
      <Flash sp={sp} />
      {!me.manager_id && <p className="rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-800">You have no reporting manager assigned yet. Ask HR before submitting goals.</p>}

      {goals.length === 0 ? <Empty title="No goals yet">Add your first goal below. Make it SMART: specific, measurable, achievable, relevant and time-bound.</Empty> : (
        <div className="space-y-3">
          {goals.map((g) => (
            <div key={g.id} className="card">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{g.title}</p>
                  {g.description && <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{g.description}</p>}
                  <p className="mt-2 text-xs text-slate-500">Weightage {Number(g.weightage)}% · Target {g.target_date}</p>
                </div>
                <Badge s={g.status} />
              </div>
              {g.manager_comment && <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm"><b>Manager:</b> {g.manager_comment}</p>}
              {editable(g) && (
                <div className="mt-3 flex gap-2">
                  <Link href={`/goals?edit=${g.id}`} className="btn-ghost">Edit</Link>
                  <form action={deleteGoal}><input type="hidden" name="id" value={g.id} /><button className="btn-danger">Delete</button></form>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {canSubmit && (
        <form action={submitGoals} className="card flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600">When your goals total 100%, submit them to your manager for approval.</p>
          <button className="btn">Submit goals for approval</button>
        </form>
      )}

      {locked ? <p className="text-sm text-slate-500">Goals are locked because your self-appraisal has been submitted.</p> : (
        <form action={saveGoal} key={editing?.id ?? "new"} className="card space-y-3">
          <h2 className="font-semibold">{editing ? "Edit goal" : "Add a goal"}</h2>
          {editing && <input type="hidden" name="id" value={editing.id} />}
          <div><label className="label">Title *</label><input name="title" required maxLength={200} defaultValue={editing?.title} className="input" placeholder="e.g. Reduce client ticket resolution time to under 24 hours" /></div>
          <div><label className="label">Description / how it will be measured</label><textarea name="description" rows={3} defaultValue={editing?.description ?? ""} className="input" /></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className="label">Weightage % *</label><input name="weightage" type="number" min={1} max={100} step="0.5" required defaultValue={editing ? Number(editing.weightage) : ""} className="input" /></div>
            <div><label className="label">Target date *</label><input name="target_date" type="date" required defaultValue={editing?.target_date ?? ""} className="input" /></div>
          </div>
          <div className="flex gap-2"><button className="btn">{editing ? "Save changes" : "Add goal"}</button>{editing && <Link href="/goals" className="btn-ghost">Cancel</Link>}</div>
        </form>
      )}
    </div>
  );
}
