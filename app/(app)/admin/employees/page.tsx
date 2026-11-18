import Link from "next/link";
import { db } from "@/lib/db";
import { requireHR } from "@/lib/me";
import { Badge, Empty, Flash, LABEL, SP } from "@/components/ui";
import { saveEmployee, toggleEmployee } from "@/app/actions";

export default async function EmployeesPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  await requireHR();
  const { data } = await db().from("employees").select("*").order("full_name");
  const emps = data ?? [];
  const name = new Map(emps.map((e) => [e.id, e.full_name]));
  const editing = sp.edit ? emps.find((e) => e.id === sp.edit) : null;

  return (
    <div className="space-y-5">
      <h1 className="h1">Employees</h1>
      <Flash sp={sp} />

      {emps.length === 0 ? <Empty title="No employees yet">Add your first employee below.</Empty> : (
        <div className="card overflow-x-auto !p-0">
          <table className="tbl">
            <thead><tr><th>Name</th><th>Designation</th><th>Department</th><th>Manager</th><th>Role</th><th>Status</th><th></th></tr></thead>
            <tbody>{emps.map((e) => (
              <tr key={e.id}>
                <td>{e.full_name}<div className="text-xs text-slate-500">{e.email}{e.clerk_user_id ? "" : " · not signed in yet"}</div></td>
                <td>{e.designation ?? "—"}</td><td>{e.department ?? "—"}</td>
                <td>{e.manager_id ? name.get(e.manager_id) : "—"}</td>
                <td>{LABEL[e.role]}</td>
                <td><Badge s={e.is_active ? "active" : "inactive"} /></td>
                <td className="whitespace-nowrap">
                  <Link href={`/admin/employees?edit=${e.id}`} className="btn-ghost mr-1">Edit</Link>
                  <form action={toggleEmployee} className="inline"><input type="hidden" name="id" value={e.id} /><button className="btn-ghost">{e.is_active ? "Deactivate" : "Activate"}</button></form>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      <form action={saveEmployee} key={editing?.id ?? "new"} className="card space-y-3">
        <h2 className="font-semibold">{editing ? `Edit ${editing.full_name}` : "Add employee"}</h2>
        {editing && <input type="hidden" name="id" value={editing.id} />}
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="label">Full name *</label><input name="full_name" required defaultValue={editing?.full_name} className="input" /></div>
          <div><label className="label">Work email * (they sign in with this)</label><input name="email" type="email" required defaultValue={editing?.email} className="input" /></div>
          <div><label className="label">Designation</label><input name="designation" defaultValue={editing?.designation ?? ""} className="input" /></div>
          <div><label className="label">Department</label><input name="department" defaultValue={editing?.department ?? ""} className="input" /></div>
          <div><label className="label">Date of joining</label><input name="date_of_joining" type="date" defaultValue={editing?.date_of_joining ?? ""} className="input" /></div>
          <div><label className="label">Reports to</label>
            <select name="manager_id" defaultValue={editing?.manager_id ?? ""} className="input">
              <option value="">— No manager —</option>
              {emps.filter((e) => e.is_active && e.id !== editing?.id).map((e) => <option key={e.id} value={e.id}>{e.full_name}{e.designation ? ` (${e.designation})` : ""}</option>)}
            </select>
          </div>
          <div><label className="label">Role *</label>
            <select name="role" defaultValue={editing?.role ?? "employee"} className="input">
              <option value="employee">Employee</option><option value="manager">Manager</option><option value="hr_admin">HR Admin</option>
            </select>
          </div>
        </div>
        <div className="flex gap-2"><button className="btn">{editing ? "Save changes" : "Add employee"}</button>{editing && <Link href="/admin/employees" className="btn-ghost">Cancel</Link>}</div>
      </form>
    </div>
  );
}
