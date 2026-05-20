alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists avatar_url text,
  add column if not exists profile_completed boolean not null default false,
  add column if not exists auth_provider text;

alter table public.profiles
  add column if not exists updated_at timestamptz not null default now();
