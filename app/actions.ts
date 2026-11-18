"use server";
// All writes happen here, on the server. Every action re-checks who the user is and what they may touch.
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireHR, requireMe } from "@/lib/me";
import { ensureReview, openCycle } from "@/lib/data";
import { notifyManager } from "@/lib/email";

const s = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const rating = (v: string) => { const n = Number(v); return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null; };
function back(path: string, msg: string, ok = false): never {
  redirect(`${path}${path.includes("?") ? "&" : "?"}msg=${encodeURIComponent(msg)}${ok ? "&ok=1" : ""}`);
}

/* ---------------- HR: employees ---------------- */
export async function saveEmployee(fd: FormData) {
  await requireHR();
  const id = s(fd, "id");
  const P = "/admin/employees" + (id ? `?edit=${id}` : "");
  const row = {
    full_name: s(fd, "full_name"), email: s(fd, "email").toLowerCase(), designation: s(fd, "designation") || null,
    department: s(fd, "department") || null, date_of_joining: s(fd, "date_of_joining") || null,
    manager_id: s(fd, "manager_id") || null, role: s(fd, "role"),
  };
  if (!row.full_name || !/^\S+@\S+\.\S+$/.test(row.email)) back(P, "Name and a valid email are required.");
  if (!["employee", "manager", "hr_admin"].includes(row.role)) back(P, "Invalid role.");
  if (id && row.manager_id) {
    // Prevent loops such as A -> B -> A in the reporting line.
    const { data: all } = await db().from("employees").select("id, manager_id");
    const up = new Map((all ?? []).map((e) => [e.id, e.manager_id]));
    for (let m: string | null = row.manager_id, i = 0; m && i < 500; m = up.get(m) ?? null, i++) {
      if (m === id) back(P, "That manager choice would create a reporting loop.");
    }
  }
  const { error } = id ? await db().from("employees").update(row).eq("id", id) : await db().from("employees").insert(row);
  if (error) back(P, error.code === "23505" ? "An employee with this email already exists." : error.message);
  back("/admin/employees", id ? "Employee updated." : "Employee added.", true);
}

export async function toggleEmployee(fd: FormData) {
  const me = await requireHR();
  const id = s(fd, "id");
  if (id === me.id) back("/admin/employees", "You cannot deactivate yourself.");
  const { data } = await db().from("employees").select("is_active").eq("id", id).single();
  await db().from("employees").update({ is_active: !data?.is_active }).eq("id", id);
  back("/admin/employees", "Status updated.", true);
}

/* ---------------- HR: cycles ---------------- */
export async function createCycle(fd: FormData) {
  const me = await requireHR();
  const row = { name: s(fd, "name"), start_date: s(fd, "start_date"), end_date: s(fd, "end_date"), created_by: me.id };
  if (!row.name || !row.start_date || !row.end_date) back("/admin/cycles", "Name, start date and end date are required.");
  if (row.end_date <= row.start_date) back("/admin/cycles", "End date must be after the start date.");
  const { error } = await db().from("review_cycles").insert(row);
  if (error) back("/admin/cycles", error.message);
  back("/admin/cycles", "Cycle created as Draft. Open it when you are ready.", true);
}

export async function setCycleStatus(fd: FormData) {
  await requireHR();
  const status = s(fd, "status");
  if (!["draft", "open", "closed"].includes(status)) back("/admin/cycles", "Invalid status.");
  const { error } = await db().from("review_cycles").update({ status }).eq("id", s(fd, "id"));
  if (error) back("/admin/cycles", error.code === "23505" ? "Another cycle is already open. Close it first." : error.message);
  back("/admin/cycles", `Cycle is now ${status}.`, true);
}

/* ---------------- Employee: goals ---------------- */
async function goalsLocked(empId: string, cycleId: string) {
  const { data } = await db().from("reviews").select("status").eq("employee_id", empId).eq("cycle_id", cycleId).maybeSingle();
  return !!data && data.status !== "not_started";
}

export async function saveGoal(fd: FormData) {
  const me = await requireMe();
  const id = s(fd, "id");
  const P = "/goals" + (id ? `?edit=${id}` : "");
  const cycle = await openCycle();
  if (!cycle) back("/goals", "There is no open review cycle.");
  if (await goalsLocked(me.id, cycle.id)) back("/goals", "Goals are locked once your self-appraisal is submitted.");
  const w = Number(s(fd, "weightage"));
  const row = { title: s(fd, "title"), description: s(fd, "description") || null, weightage: w, target_date: s(fd, "target_date") || null };
  if (!row.title) back(P, "Goal title is required.");
  if (!Number.isFinite(w) || w <= 0 || w > 100) back(P, "Weightage must be a number between 1 and 100.");
  if (!row.target_date) back(P, "Target date is required.");
  if (id) {
    const { data: g } = await db().from("goals").select("status").eq("id", id).eq("employee_id", me.id).maybeSingle();
    if (!g || !["draft", "sent_back"].includes(g.status)) back("/goals", "This goal can no longer be edited.");
    await db().from("goals").update({ ...row, status: "draft" }).eq("id", id);
  } else {
    await db().from("goals").insert({ ...row, employee_id: me.id, cycle_id: cycle.id });
  }
  back("/goals", "Goal saved.", true);
}

export async function deleteGoal(fd: FormData) {
  const me = await requireMe();
  const { data: g } = await db().from("goals").select("status").eq("id", s(fd, "id")).eq("employee_id", me.id).maybeSingle();
  if (!g || !["draft", "sent_back"].includes(g.status)) back("/goals", "Only draft or sent-back goals can be deleted.");
  await db().from("goals").delete().eq("id", s(fd, "id")).eq("employee_id", me.id);
  back("/goals", "Goal deleted.", true);
}

export async function submitGoals() {
  const me = await requireMe();
  const cycle = await openCycle();
  if (!cycle) back("/goals", "There is no open review cycle.");
  if (!me.manager_id) back("/goals", "You have no reporting manager. Ask HR to assign one.");
  const { data } = await db().from("goals").select("id, status, weightage").eq("employee_id", me.id).eq("cycle_id", cycle.id);
  const goals = data ?? [];
  const total = goals.reduce((t, g) => t + Number(g.weightage), 0);
  if (!goals.length) back("/goals", "Add at least one goal first.");
  if (Math.abs(total - 100) > 0.001) back("/goals", `Total weightage is ${total}. It must be exactly 100 before you submit.`);
  const pending = goals.filter((g) => g.status === "draft" || g.status === "sent_back").map((g) => g.id);
  if (!pending.length) back("/goals", "Nothing new to submit.");
  await db().from("goals").update({ status: "submitted" }).in("id", pending);
  back("/goals", "Goals submitted to your manager for approval.", true);
}

/* ---------------- Manager: goal approval ---------------- */
export async function decideGoal(fd: FormData) {
  const me = await requireMe();
  const { data: g } = await db().from("goals").select("*").eq("id", s(fd, "id")).maybeSingle();
  const { data: emp } = g ? await db().from("employees").select("manager_id").eq("id", g.employee_id).single() : { data: null };
  if (!g || emp?.manager_id !== me.id) back("/team", "You can only act on your direct reports' goals.");
  const P = `/team/${g.employee_id}?cycle=${g.cycle_id}`;
  const decision = s(fd, "decision"), comment = s(fd, "comment");
  if (g.status !== "submitted") back(P, "This goal is not awaiting approval.");
  if (decision === "send_back" && !comment) back(P, "A comment is required when sending a goal back.");
  await db().from("goals").update({ status: decision === "approve" ? "approved" : "sent_back", manager_comment: comment || null }).eq("id", g.id);
  back(P, decision === "approve" ? "Goal approved." : "Goal sent back with your comment.", true);
}

/* ---------------- Employee: self-appraisal ---------------- */
export async function submitSelf(fd: FormData) {
  const me = await requireMe();
  const cycle = await openCycle();
  if (!cycle) back("/review", "There is no open review cycle.");
  const { data } = await db().from("goals").select("id, status").eq("employee_id", me.id).eq("cycle_id", cycle.id);
  const goals = data ?? [];
  if (!goals.length || goals.some((g) => g.status !== "approved")) back("/review", "All goals must be approved before the self-appraisal.");
  const review = await ensureReview(me.id, me.manager_id, cycle.id);
  if (review.status !== "not_started") back("/review", "Your self-appraisal is already submitted.");
  const overall = rating(s(fd, "overall"));
  const rows = goals.map((g) => ({ review_id: review.id, goal_id: g.id, self_comment: s(fd, `c_${g.id}`), self_rating: rating(s(fd, `r_${g.id}`)) }));
  if (!overall || rows.some((r) => !r.self_comment || !r.self_rating)) back("/review", "Add a comment and rating for every goal, plus an overall rating.");
  const { error } = await db().from("goal_ratings").upsert(rows, { onConflict: "review_id,goal_id" });
  if (error) back("/review", error.message);
  await db().from("reviews").update({
    status: "self_submitted", overall_self_rating: overall, submitted_at: new Date().toISOString(), manager_id: me.manager_id,
  }).eq("id", review.id);

  // Side effect: email the manager. Never blocks the submission.
  const { data: mgr } = await db().from("employees").select("full_name, email").eq("id", me.manager_id!).maybeSingle();
  if (mgr) {
    const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    await notifyManager(mgr.email, mgr.full_name, me.full_name, cycle.name, `${base}/team/${me.id}?cycle=${cycle.id}`);
  }
  back("/review", "Self-appraisal submitted. Your manager has been notified.", true);
}

/* ---------------- Manager: review & rating ---------------- */
export async function submitManagerReview(fd: FormData) {
  const me = await requireMe();
  const { data: review } = await db().from("reviews").select("*").eq("id", s(fd, "review_id")).maybeSingle();
  const { data: emp } = review ? await db().from("employees").select("id, manager_id").eq("id", review.employee_id).single() : { data: null };
  if (!review || emp?.manager_id !== me.id) back("/team", "You can only review your direct reports.");
  const P = `/team/${review.employee_id}?cycle=${review.cycle_id}`;
  if (!["self_submitted", "manager_reviewed"].includes(review.status)) back(P, "This review cannot be edited now.");
  const { data: lines } = await db().from("goal_ratings").select("id, goal_id").eq("review_id", review.id);
  const updates = (lines ?? []).map((l) => ({ id: l.id, manager_comment: s(fd, `mc_${l.goal_id}`), manager_rating: rating(s(fd, `mr_${l.goal_id}`)) }));
  const overall = rating(s(fd, "overall")), summary = s(fd, "summary");
  if (!overall || !summary || updates.some((u) => !u.manager_comment || !u.manager_rating)) back(P, "Every goal needs a comment and rating, plus an overall rating and summary.");
  await Promise.all(updates.map(({ id, ...u }) => db().from("goal_ratings").update(u).eq("id", id)));
  const complete = s(fd, "intent") === "complete";
  await db().from("reviews").update({
    overall_manager_rating: overall, manager_summary: summary, status: complete ? "completed" : "manager_reviewed",
    reviewed_at: new Date().toISOString(),
  }).eq("id", review.id);
  back(P, complete ? "Review completed. The employee can now see it." : "Review saved. You can edit it until you complete it.", true);
}
