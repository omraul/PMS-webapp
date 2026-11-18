import { ratingLabel } from "./ui";
/* eslint-disable @typescript-eslint/no-explicit-any */

// Read-only review: self-appraisal on the left, manager on the right (when allowed).
export function ReviewView({ goals, ratings, review, showManager }: { goals: any[]; ratings: Record<string, any>; review: any; showManager: boolean }) {
  return (
    <div className="space-y-3">
      {goals.map((g) => {
        const r = ratings[g.id] ?? {};
        return (
          <div key={g.id} className="card">
            <p className="font-medium">{g.title} <span className="text-xs text-slate-500">· {Number(g.weightage)}%</span></p>
            <div className={`mt-3 grid gap-4 ${showManager ? "md:grid-cols-2" : ""}`}>
              <div>
                <p className="label">Self-appraisal · {ratingLabel(r.self_rating)}</p>
                <p className="whitespace-pre-wrap text-sm">{r.self_comment || "—"}</p>
              </div>
              {showManager && (
                <div className="md:border-l md:pl-4">
                  <p className="label">Manager · {ratingLabel(r.manager_rating)}</p>
                  <p className="whitespace-pre-wrap text-sm">{r.manager_comment || "—"}</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
      <div className="card grid gap-4 md:grid-cols-2">
        <div><p className="label">Overall self rating</p><p className="text-sm">{ratingLabel(review?.overall_self_rating)}</p></div>
        {showManager && (
          <div>
            <p className="label">Overall manager rating</p><p className="text-sm font-medium">{ratingLabel(review?.overall_manager_rating)}</p>
            <p className="label mt-2">Manager summary</p><p className="whitespace-pre-wrap text-sm">{review?.manager_summary || "—"}</p>
          </div>
        )}
      </div>
    </div>
  );
}
