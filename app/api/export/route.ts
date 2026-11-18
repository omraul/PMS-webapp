import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getMe } from "@/lib/me";
import { goalStage, statusFor } from "@/lib/data";

// HR-only CSV export of one cycle's ratings.
export async function GET(req: Request) {
  const me = await getMe();
  if (!me || me.role !== "hr_admin") return new NextResponse("Forbidden", { status: 403 });
  const cycleId = new URL(req.url).searchParams.get("cycle") ?? "";
  const { data: cycle } = await db().from("review_cycles").select("name").eq("id", cycleId).maybeSingle();
  if (!cycle) return new NextResponse("Cycle not found", { status: 404 });

  const { data } = await db().from("employees").select("id, full_name, email, department, designation, manager_id").eq("is_active", true).order("full_name");
  const emps = data ?? [];
  const name = new Map(emps.map((e) => [e.id, e.full_name]));
  const st = await statusFor(emps.map((e) => e.id), cycleId);
  const q = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [["Name", "Email", "Department", "Designation", "Manager", "Goal status", "Review status", "Self rating", "Manager rating", "Manager summary"].map(q).join(",")];
  for (const e of emps) {
    const r = st[e.id].review;
    lines.push([e.full_name, e.email, e.department, e.designation, e.manager_id ? name.get(e.manager_id) : "", goalStage(st[e.id].goals),
      r?.status ?? "not_started", r?.overall_self_rating, r?.overall_manager_rating, r?.manager_summary].map(q).join(","));
  }
  return new NextResponse(lines.join("\n"), {
    headers: { "Content-Type": "text/csv", "Content-Disposition": `attachment; filename="${cycle.name.replace(/[^\w-]+/g, "_")}.csv"` },
  });
}
