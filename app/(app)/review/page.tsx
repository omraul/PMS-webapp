import Link from "next/link";
import { requireMe } from "@/lib/me";
import { loadReview, pickCycle, visibleCycles } from "@/lib/data";
import { Badge, CyclePicker, Empty, Flash, RatingSelect, SP } from "@/components/ui";
import { ReviewView } from "@/components/review-view";
import { submitSelf } from "@/app/actions";

// The employee's own review only: the employee id always comes from the session, never from the URL.
export default async function MyReview({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const me = await requireMe();
  const [cycles, cycle] = await Promise.all([visibleCycles(), pickCycle(sp.cycle)]);
  if (!cycle) return <div className="space-y-4"><h1 className="h1">My Review</h1><Empty title="No review cycles yet" /></div>;

  const { goals, review, ratings } = await loadReview(me.id, cycle.id);
  const status = review?.status ?? "not_started";
  const allApproved = goals.length > 0 && goals.every((g) => g.status === "approved");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="h1">My Review</h1><p className="text-sm text-slate-500">{cycle.name} · <Badge s={status} /></p></div>
        <CyclePicker cycles={cycles} current={cycle.id} />
      </div>
      <Flash sp={sp} />

      {status !== "not_started" ? (
        <>
          {status !== "completed" && <p className="text-sm text-slate-500">Your manager&apos;s ratings will be visible here once the review is completed.</p>}
          <ReviewView goals={goals} ratings={ratings} review={review} showManager={status === "completed"} />
        </>
      ) : cycle.status !== "open" ? (
        <Empty title="This cycle is closed">No self-appraisal was submitted for it.</Empty>
      ) : !allApproved ? (
        <Empty title="Your goals need to be approved first">Set your goals and get them approved by your manager. <Link className="text-indigo-600 underline" href="/goals">Go to My Goals</Link></Empty>
      ) : (
        <form action={submitSelf} className="space-y-3">
          <p className="text-sm text-slate-600">For each goal, describe what you actually achieved (with evidence) and rate yourself.</p>
          {goals.map((g) => (
            <div key={g.id} className="card space-y-2">
              <p className="font-medium">{g.title} <span className="text-xs text-slate-500">· {Number(g.weightage)}%</span></p>
              {g.description && <p className="text-sm text-slate-500">{g.description}</p>}
              <div><label className="label">What did you achieve? *</label><textarea name={`c_${g.id}`} required minLength={10} rows={3} className="input" /></div>
              <div className="sm:w-72"><label className="label">Self rating *</label><RatingSelect name={`r_${g.id}`} /></div>
            </div>
          ))}
          <div className="card flex flex-wrap items-end justify-between gap-3">
            <div className="sm:w-72"><label className="label">Overall self rating *</label><RatingSelect name="overall" /></div>
            <button className="btn">Submit self-appraisal</button>
          </div>
          <p className="text-xs text-slate-500">After submitting you cannot edit it. Your manager will be emailed.</p>
        </form>
      )}
    </div>
  );
}
