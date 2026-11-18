# PerformIQ: Performance Management System

Next.js 15 (App Router) · TypeScript · Tailwind · Clerk · Supabase · Resend · Vercel

HR runs a review cycle end to end. Employees set weighted goals and self-appraise. Managers approve goals and rate their direct reports.

## Workflow
- **Goals:** `draft → submitted → approved` (or `sent_back` with a required comment). Total weightage must be exactly 100.
- **Review** (one row per employee per cycle): `not_started → self_submitted → manager_reviewed → completed`
- The manager gets an email (Resend) when a self-appraisal is submitted. If the email fails, the submission still saves.
- The employee sees the manager's ratings only after the review is **Completed**.

## Security model
- Clerk middleware protects every route except `/`, `/sign-in` and `/sign-up`.
- On first sign-in, the user's Clerk email is matched to `employees.email` and `clerk_user_id` is saved. Users with no record see "contact HR".
- All database access runs **on the server** with the Supabase service-role key (`lib/db.ts`). Every page and action checks the role and the relationship first:
  - `/review` always uses the signed-in employee's id, never an id from the URL.
  - `/team/[id]` returns 404 unless you are that person's manager or HR, so editing the URL cannot expose another review.
- RLS is **enabled with no policies** on all five tables, so the public anon key cannot read anything.

## Setup
1. `npm install`
2. **Supabase:** create a project, then open SQL Editor and run `supabase/schema.sql`. **First change the email in the last INSERT to your own**, which becomes the first HR Admin.
3. **Clerk:** create an app with email sign-in enabled.
4. **Resend:** create an API key. On the free test sender (`onboarding@resend.dev`), Resend only delivers to **your own Resend account email**, so give the test manager that email address.
5. Copy `.env.example` to `.env.local` and fill it in. Then run `npm run dev` and open http://localhost:3000.
6. **Vercel:** push to GitHub, import the repo in Vercel, add the same env vars (set `NEXT_PUBLIC_APP_URL` to the live URL) and redeploy. Add the Vercel domain in Clerk.

## Demo script (Definition of Done)
1. HR signs in, opens Cycles, creates "FY 2026-27 Annual" and opens it.
2. In Employees, HR adds a manager and an employee, and sets "Reports to".
3. The employee signs up with that email, opens My Goals, adds 3 goals totalling 100 and submits them.
4. The manager opens My Team, then the employee, and approves the goals.
5. The employee opens My Review, completes the self-appraisal and submits it. The manager receives an email.
6. The manager completes the review with ratings, an overall rating and a summary.
7. HR opens Report and sees the employee as **Completed**.

## Project map
| Path | Purpose |
|---|---|
| `middleware.ts` | Clerk route protection |
| `lib/me.ts` | Who is signed in: Clerk user to employee row and role |
| `lib/data.ts` | Shared queries (open cycle, goal and review status) |
| `app/actions.ts` | All writes (server actions) with validation and authorization |
| `app/(app)/*` | Signed-in pages; the layout builds role-aware navigation |
| `app/api/export` | HR CSV export |
| `supabase/schema.sql` | Tables, constraints and RLS |

Still to add yourself (graded): `RESEARCH.md`, screen sketches and the data-model diagram.
