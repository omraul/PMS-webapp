import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireMe } from "@/lib/me";
import { loadReview, pickCycle, visibleCycles } from "@/lib/data";
import { Back, Badge, CyclePicker, Empty, Flash, RatingSelect, SP, ratingLabel } from "@/components/ui";
import { ReviewView } from "@/components/review-view";
import { decideGoal, submitManagerReview } from "@/app/actions";

// Manager view of one direct report. HR can view any employee read-only. Anyone else gets a 404,
// so changing the id in the URL never exposes someone else's review.
export default async function ReviewEmployee({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SP }) {
  const [{ id }, sp, me] = await Promise.all([params, searchParams, requireMe()]);
  const { data: emp } = await db().from("employees").select("*").eq("id", id).maybeSingle();
  if (!emp) notFound();
  const isMgr = emp.manager_id === me.id;
  if (!isMgr && me.role !== "hr_admin") notFound();

  const [cycles, cycle] = await Promise.all([visibleCycles(), pickCycle(sp.cycle)]);
  if (!cycle) return <Empty title="No review cycle yet" />;
  const { goals, review, ratings } = await loadReview(emp.id, cycle.id);
  const status = review?.status ?? "not_started";
  const canEdit = isMgr && (status === "self_submitted" || status === "manager_reviewed");

  return (
    <div className="space-y-5">
      <Back href={isMgr ? "/team" : "/admin/report"}>Back</Back>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="h1">{emp.full_name}</h1>
          <p className="text-sm text-slate-500">{emp.designation} · {emp.department} · {cycle.name} · <Badge s={status} /></p>
        </div>
        <CyclePicker cycles={cycles} current={cycle.id} />
      </div>
      <Flash sp={sp} />

      <section className="space-y-3">
        <h2 className="font-semibold">Goals</h2>
        {goals.length === 0 ? <Empty title="No goals set for this cycle yet" /> : goals.map((g) => (
          <div key={g.id} className="card">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium">{g.title}</p>
                {g.description && <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{g.description}</p>}
                <p className="mt-2 text-xs text-slate-500">Weightage {Number(g.weightage)}% · Target {g.target_date}</p>
              </div>
              <Badge s={g.status} />
            </div>
            {g.manager_comment && <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm"><b>Your comment:</b> {g.manager_comment}</p>}
            {isMgr && g.status === "submitted" && (
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <form action={decideGoal}>
                  <input type="hidden" name="id" value={g.id} /><input type="hidden" name="decision" value="approve" />
                  <button className="btn">Approve</button>
                </form>
                <form action={decideGoal} className="flex flex-1 gap-2">
                  <input type="hidden" name="id" value={g.id} /><input type="hidden" name="decision" value="send_back" />
                  <input name="comment" required placeholder="What should change?" className="input" />
                  <button className="btn-danger whitespace-nowrap">Send back</button>
                </form>
              </div>
            )}
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Review</h2>
        {status === "not_started" ? <Empty title="Waiting for the self-appraisal">You can review once {emp.full_name.split(" ")[0]} submits it.</Empty>
          : !canEdit ? <ReviewView goals={goals} ratings={ratings} review={review} showManager />
          : (
          <form action={submitManagerReview} className="space-y-3">
            <input type="hidden" name="review_id" value={review!.id} />
            {goals.map((g) => {
              const r = ratings[g.id] ?? {};
              return (
                <div key={g.id} className="card">
                  <p className="font-medium">{g.title} <span className="text-xs text-slate-500">· {Number(g.weightage)}%</span></p>
                  <div className="mt-3 grid gap-4 md:grid-cols-2">
                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="label">Employee · {ratingLabel(r.self_rating)}</p>
                      <p className="whitespace-pre-wrap text-sm">{r.self_comment}</p>
                    </div>
                    <div className="space-y-2">
                      <div><label className="label">Your comment *</label><textarea name={`mc_${g.id}`} required rows={3} defaultValue={r.manager_comment ?? ""} className="input" /></div>
                      <div><label className="label">Your rating *</label><RatingSelect name={`mr_${g.id}`} value={r.manager_rating} /></div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="card space-y-3">
              <p className="text-sm">Employee&apos;s overall self rating: <b>{ratingLabel(review!.overall_self_rating)}</b></p>
              <div className="sm:w-72"><label className="label">Overall rating *</label><RatingSelect name="overall" value={review!.overall_manager_rating} /></div>
              <div><label className="label">Summary *</label><textarea name="summary" required rows={4} defaultValue={review!.manager_summary ?? ""} className="input" placeholder="Strengths, areas to improve, and focus for next cycle" /></div>
              <div className="flex flex-wrap gap-2">
                <button name="intent" value="save" className="btn-ghost">Save review</button>
                <button name="intent" value="complete" className="btn">Complete review</button>
              </div>
              <p className="text-xs text-slate-500">&quot;Complete&quot; locks the review and shares the ratings with the employee.</p>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
