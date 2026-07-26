-- Run this in Supabase: SQL Editor → New query.
-- One private JSON progress document is stored for each signed-in learner.

create table if not exists public.course_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.course_progress enable row level security;

create policy "Learners can read their own progress"
  on public.course_progress for select
  using (auth.uid() = user_id);

create policy "Learners can insert their own progress"
  on public.course_progress for insert
  with check (auth.uid() = user_id);

create policy "Learners can update their own progress"
  on public.course_progress for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
