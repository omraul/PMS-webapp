-- Run this once in Supabase > SQL Editor.
create extension if not exists pgcrypto;

-- One table for everybody. A manager is just an employee whom others report to (manager_id self-reference).
create table employees (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text unique,                       -- filled in automatically on first sign-in (matched by email)
  full_name text not null,
  email text not null unique check (email = lower(email)),
  designation text,
  department text,
  date_of_joining date,
  manager_id uuid references employees(id) on delete set null,  -- who this person reports to
  role text not null default 'employee' check (role in ('employee','manager','hr_admin')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  check (manager_id is null or manager_id <> id)
);

create table review_cycles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date not null,
  end_date date not null,
  status text not null default 'draft' check (status in ('draft','open','closed')),
  created_by uuid references employees(id) on delete set null,   -- HR admin who created it
  created_at timestamptz not null default now(),
  check (end_date > start_date)
);
-- Only one cycle can be open at a time.
create unique index one_open_cycle on review_cycles ((true)) where status = 'open';

-- The plan: what the employee is asked to achieve in a cycle. No ratings here.
create table goals (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,   -- goal owner
  cycle_id uuid not null references review_cycles(id) on delete cascade,  -- keeps each year's goals separate
  title text not null,
  description text,
  weightage numeric(5,2) not null check (weightage > 0 and weightage <= 100),
  target_date date,
  status text not null default 'draft' check (status in ('draft','submitted','approved','sent_back')),
  manager_comment text,
  created_at timestamptz not null default now()
);

-- The workflow: one row per employee per cycle.
create table reviews (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  manager_id uuid references employees(id) on delete set null,           -- reviewer at the time of review
  cycle_id uuid not null references review_cycles(id) on delete cascade,
  status text not null default 'not_started' check (status in ('not_started','self_submitted','manager_reviewed','completed')),
  overall_self_rating int check (overall_self_rating between 1 and 5),
  overall_manager_rating int check (overall_manager_rating between 1 and 5),
  manager_summary text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (employee_id, cycle_id)
);

-- The outcome: line items behind a review, one per goal.
create table goal_ratings (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references reviews(id) on delete cascade,
  goal_id uuid not null references goals(id) on delete cascade,
  self_comment text,
  self_rating int check (self_rating between 1 and 5),
  manager_comment text,
  manager_rating int check (manager_rating between 1 and 5),
  unique (review_id, goal_id)
);

-- Row Level Security ON with no policies: the public anon key can read NOTHING.
-- The app reads data only on the server with the service-role key, after checking the Clerk user's role.
alter table employees enable row level security;
alter table review_cycles enable row level security;
alter table goals enable row level security;
alter table reviews enable row level security;
alter table goal_ratings enable row level security;

-- Bootstrap: the first HR admin. CHANGE the email to the one you will sign in with.
insert into employees (full_name, email, role, designation, department)
values ('HR Admin', 'your-email@example.com', 'hr_admin', 'HR Manager', 'Human Resources');
