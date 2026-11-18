import { db } from "./db";

/* eslint-disable @typescript-eslint/no-explicit-any */
export type Row = Record<string, any>;

export async function openCycle(): Promise<Row | null> {
  const { data } = await db().from("review_cycles").select("*").eq("status", "open").maybeSingle();
  return data;
}

export async function visibleCycles(): Promise<Row[]> {
  const { data } = await db().from("review_cycles").select("*").neq("status", "draft").order("start_date", { ascending: false });
  return data ?? [];
}

// The cycle chosen via ?cycle=, otherwise the open one, otherwise the latest closed one.
export async function pickCycle(id?: string): Promise<Row | null> {
  if (id) {
    const { data } = await db().from("review_cycles").select("*").eq("id", id).neq("status", "draft").maybeSingle();
    if (data) return data;
  }
  return (await openCycle()) ?? (await visibleCycles())[0] ?? null;
}

// One word summarising where a person's goal-setting stands.
export function goalStage(goals: Row[]): string {
  if (!goals.length) return "none";
  if (goals.every((g) => g.status === "approved")) return "approved";
  if (goals.some((g) => g.status === "submitted")) return "submitted";
  if (goals.some((g) => g.status === "sent_back")) return "sent_back";
  return "draft";
}

// Goals + review per employee for one cycle.
export async function statusFor(empIds: string[], cycleId: string) {
  const out: Record<string, { goals: Row[]; review: Row | null }> = {};
  empIds.forEach((id) => (out[id] = { goals: [], review: null }));
  if (!empIds.length) return out;
  const [g, r] = await Promise.all([
    db().from("goals").select("*").in("employee_id", empIds).eq("cycle_id", cycleId),
    db().from("reviews").select("*").in("employee_id", empIds).eq("cycle_id", cycleId),
  ]);
  (g.data ?? []).forEach((x) => out[x.employee_id]?.goals.push(x));
  (r.data ?? []).forEach((x) => { if (out[x.employee_id]) out[x.employee_id].review = x; });
  return out;
}

export async function loadReview(employeeId: string, cycleId: string) {
  const [g, r] = await Promise.all([
    db().from("goals").select("*").eq("employee_id", employeeId).eq("cycle_id", cycleId).order("created_at"),
    db().from("reviews").select("*").eq("employee_id", employeeId).eq("cycle_id", cycleId).maybeSingle(),
  ]);
  const ratings: Record<string, Row> = {};
  if (r.data) {
    const { data } = await db().from("goal_ratings").select("*").eq("review_id", r.data.id);
    (data ?? []).forEach((x) => (ratings[x.goal_id] = x));
  }
  return { goals: (g.data ?? []) as Row[], review: r.data as Row | null, ratings };
}

export async function ensureReview(employeeId: string, managerId: string | null, cycleId: string): Promise<Row> {
  await db().from("reviews").upsert(
    { employee_id: employeeId, manager_id: managerId, cycle_id: cycleId },
    { onConflict: "employee_id,cycle_id", ignoreDuplicates: true },
  );
  const { data } = await db().from("reviews").select("*").eq("employee_id", employeeId).eq("cycle_id", cycleId).single();
  return data!;
}
