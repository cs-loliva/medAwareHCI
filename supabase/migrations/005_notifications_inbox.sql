alter table if exists public.notifications
  add column if not exists body text,
  add column if not exists href text,
  add column if not exists read_at timestamptz,
  add column if not exists created_at timestamptz not null default now();

update public.notifications
set body = coalesce(body, message)
where body is null;
