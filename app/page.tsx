import Link from "next/link";

const FEATURES = [
  ["Goals that add up", "Employees set weighted goals for the cycle; managers approve or send them back with feedback."],
  ["Self-appraisal first", "Employees reflect on each goal before the manager rates, and the manager is notified by email."],
  ["One record, every year", "HR runs cycles end to end and sees company-wide completion. Every review is stored and searchable."],
];

export default function Landing() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-16">
      <p className="font-bold text-indigo-600">PerformIQ</p>
      <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">Performance reviews without the spreadsheets.</h1>
      <p className="mt-4 max-w-2xl text-lg text-slate-600">Run your appraisal cycle end to end: goal setting, approvals, self-appraisal and manager review, all in one place.</p>
      <div className="mt-8 flex gap-3">
        <Link href="/sign-in" className="btn">Sign in</Link>
        <Link href="/dashboard" className="btn-ghost">Go to dashboard</Link>
      </div>
      <div className="mt-16 grid gap-4 sm:grid-cols-3">
        {FEATURES.map(([t, d]) => (
          <div key={t} className="card"><p className="font-semibold">{t}</p><p className="mt-2 text-sm text-slate-600">{d}</p></div>
        ))}
      </div>
    </main>
  );
}
