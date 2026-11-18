import { db } from "@/lib/db";
import { requireHR } from "@/lib/me";
import { Badge, Empty, Flash, SP } from "@/components/ui";
import { createCycle, setCycleStatus } from "@/app/actions";

function StatusButton({ id, status, label, primary }: { id: string; status: string; label: string; primary?: boolean }) {
  return (
    <form action={setCycleStatus} className="inline">
      <input type="hidden" name="id" value={id} /><input type="hidden" name="status" value={status} />
      <button className={primary ? "btn" : "btn-ghost"}>{label}</button>
    </form>
  );
}

export default async function CyclesPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  await requireHR();
  const { data } = await db().from("review_cycles").select("*").order("start_date", { ascending: false });
  const cycles = data ?? [];

  return (
    <div className="space-y-5">
      <h1 className="h1">Review cycles</h1>
      <Flash sp={sp} />
      <p className="text-sm text-slate-500">Only one cycle can be open at a time. Employees set goals and submit appraisals only in the open cycle.</p>

      {cycles.length === 0 ? <Empty title="No cycles yet">Create one below, e.g. &quot;FY 2026-27 Annual&quot;.</Empty> : (
        <div className="card overflow-x-auto !p-0">
          <table className="tbl">
            <thead><tr><th>Name</th><th>Dates</th><th>Status</th><th></th></tr></thead>
            <tbody>{cycles.map((c) => (
              <tr key={c.id}>
                <td className="font-medium">{c.name}</td>
                <td className="whitespace-nowrap">{c.start_date} → {c.end_date}</td>
                <td><Badge s={c.status} /></td>
                <td className="space-x-1 whitespace-nowrap">
                  {c.status !== "open" && <StatusButton id={c.id} status="open" label={c.status === "closed" ? "Reopen" : "Open"} primary />}
                  {c.status === "open" && <StatusButton id={c.id} status="closed" label="Close" />}
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      <form action={createCycle} className="card space-y-3">
        <h2 className="font-semibold">Create cycle</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <div><label className="label">Name *</label><input name="name" required placeholder="FY 2026-27 Annual" className="input" /></div>
          <div><label className="label">Start date *</label><input name="start_date" type="date" required className="input" /></div>
          <div><label className="label">End date *</label><input name="end_date" type="date" required className="input" /></div>
        </div>
        <button className="btn">Create as draft</button>
      </form>
    </div>
  );
}
