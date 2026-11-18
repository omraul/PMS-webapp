import { auth, currentUser } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { db } from "./db";

export type Role = "employee" | "manager" | "hr_admin";
export type Me = {
  id: string; full_name: string; email: string; role: Role; manager_id: string | null;
  department: string | null; designation: string | null; isManager: boolean;
};

// Runs on the server. Finds the employees row for the signed-in Clerk user.
// First login: match by email and store clerk_user_id on that row.
export const getMe = cache(async (): Promise<Me | null> => {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  let { data: emp } = await db().from("employees").select("*").eq("clerk_user_id", userId).eq("is_active", true).maybeSingle();
  if (!emp) {
    const user = await currentUser();
    const email = user?.primaryEmailAddress?.emailAddress?.toLowerCase();
    if (!email) return null;
    const r = await db().from("employees").select("*").eq("email", email).eq("is_active", true).maybeSingle();
    emp = r.data;
    if (!emp) return null;
    if (emp.clerk_user_id && emp.clerk_user_id !== userId) return null; // email already linked to another account
    if (!emp.clerk_user_id) await db().from("employees").update({ clerk_user_id: userId }).eq("id", emp.id);
  }
  const { count } = await db().from("employees").select("id", { count: "exact", head: true })
    .eq("manager_id", emp.id).eq("is_active", true);
  return { ...emp, isManager: emp.role === "manager" || (count ?? 0) > 0 };
});

export async function requireMe() {
  const me = await getMe();
  if (!me) redirect("/not-setup");
  return me;
}

export async function requireHR() {
  const me = await requireMe();
  if (me.role !== "hr_admin") notFound();
  return me;
}
