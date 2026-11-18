import { Resend } from "resend";

const MAP: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => MAP[c]);

// Server-only. Email is a side effect: failures are logged, never thrown, so the appraisal still saves.
export async function notifyManager(to: string, managerName: string, employeeName: string, cycleName: string, link: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return console.warn("RESEND_API_KEY not set; email skipped");
  try {
    const { error } = await new Resend(key).emails.send({
      from: process.env.EMAIL_FROM || "PMS <onboarding@resend.dev>",
      to,
      subject: `${employeeName} submitted their self-appraisal`,
      html: `<div style="font-family:Arial,sans-serif;max-width:520px">
        <h2 style="color:#4f46e5">Self-appraisal submitted</h2>
        <p>Hi ${esc(managerName)},</p>
        <p><b>${esc(employeeName)}</b> has submitted their self-appraisal for <b>${esc(cycleName)}</b>.</p>
        <p><a href="${link}" style="background:#4f46e5;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">Open the review</a></p>
      </div>`,
    });
    if (error) console.error("Email failed:", error);
  } catch (e) {
    console.error("Email failed:", e);
  }
}
