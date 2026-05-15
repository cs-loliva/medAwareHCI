-- MedAware Initial Schema Migration
-- Academic prototype only. Medication interaction logic is mock/demo only.
create extension if not exists "pgcrypto";


-- Utility Functions
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Returns the role names for the current authenticated user.
create or replace function public.current_user_roles()
returns text[] as $$
  select coalesce(array_agg(r.name), '{}')
  from public.user_roles ur
  join public.roles r on r.id = ur.role_id
  where ur.user_id = auth.uid();
$$ language sql security definer stable;

-- 1. Profiles

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  avatar_url text,
  allergies text[] not null default '{}',
  font_size text not null default 'default'
    check (font_size in ('default', 'large', 'xl')),
  high_contrast boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email, 'Demo User'), '@', 1)),
    coalesce(new.email, '')
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- 2. Roles

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
    check (name in ('civilian', 'caregiver', 'nurse', 'doctor', 'pharmacist', 'admin'))
);

-- 3. User Roles

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  assigned_by uuid references public.profiles(id),
  assigned_at timestamptz not null default now(),
  unique (user_id, role_id)
);

-- 4. Civilian Medications

create table public.medications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  dose_amount numeric not null check (dose_amount > 0),
  dose_unit text not null,
  frequency text not null,
  start_date date not null,
  end_date date,
  notes text,
  status text not null default 'active'
    check (status in ('active', 'inactive', 'pending_review')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or end_date >= start_date)
);

create trigger medications_set_updated_at
before update on public.medications
for each row execute function public.set_updated_at();

-- 5. Medication Schedules

create table public.medication_schedules (
  id uuid primary key default gen_random_uuid(),
  medication_id uuid not null references public.medications(id) on delete cascade,
  scheduled_time time not null,
  day_of_week int[],
  created_at timestamptz not null default now(),
  check (
    day_of_week is null
    or day_of_week <@ array[0, 1, 2, 3, 4, 5, 6]
  )
);

-- 6. Medication Logs

create table public.medication_logs (
  id uuid primary key default gen_random_uuid(),
  medication_id uuid not null references public.medications(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  scheduled_at timestamptz not null,
  logged_at timestamptz,
  status text not null check (status in ('taken', 'missed', 'skipped')),
  source text not null default 'online'
    check (source in ('online', 'offline_sync')),
  conflict_flag boolean not null default false,
  idempotency_key text unique,
  created_at timestamptz not null default now()
);

-- 7. Medication Alerts

create table public.medication_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  medication_id_a uuid not null references public.medications(id) on delete cascade,
  medication_id_b uuid not null references public.medications(id) on delete cascade,
  severity text not null check (severity in ('critical', 'moderate', 'low')),
  rule_key text not null,
  description text not null,
  status text not null default 'active'
    check (status in ('active', 'acknowledged', 'resolved')),
  acknowledged_by uuid references public.profiles(id),
  acknowledged_at timestamptz,
  created_at timestamptz not null default now(),
  check (medication_id_a <> medication_id_b)
);

-- 8. Interaction Rules

create table public.interaction_rules (
  id uuid primary key default gen_random_uuid(),
  rule_key text not null unique,
  medication_a text not null,
  medication_b text not null,
  severity text not null check (severity in ('critical', 'moderate', 'low')),
  description text not null,
  is_demo boolean not null default true,
  created_at timestamptz not null default now()
);


-- 9. Interaction Checks


create table public.interaction_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  medication_name text not null,
  checked_against jsonb not null default '[]'::jsonb,
  result text not null check (result in ('clear', 'low', 'moderate', 'critical')),
  rules_triggered jsonb,
  context text not null default 'civilian'
    check (context in ('civilian', 'clinical')),
  created_at timestamptz not null default now()
);

-- 10. Care Circle Members

create table public.care_circle_members (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  caregiver_id uuid not null references public.profiles(id) on delete cascade,
  permission text not null default 'view'
    check (permission in ('view', 'manage')),
  status text not null default 'pending'
    check (status in ('pending', 'active', 'revoked')),
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  unique (owner_id, caregiver_id),
  check (owner_id <> caregiver_id)
);

-- 11. Patients

create table public.patients (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  date_of_birth date,
  room_number text,
  ward text,
  primary_diagnosis text,
  allergies text[] not null default '{}',
  admission_date date,
  discharge_date date,
  status text not null default 'admitted'
    check (status in ('admitted', 'discharged', 'outpatient')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (discharge_date is null or admission_date is null or discharge_date >= admission_date)
);

create trigger patients_set_updated_at
before update on public.patients
for each row execute function public.set_updated_at();

-- 12. Patient Assignments

create table public.patient_assignments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_name text not null check (role_name in ('nurse', 'doctor', 'pharmacist')),
  assigned_at timestamptz not null default now(),
  unique (patient_id, user_id)
);

-- 13. Patient Medications

create table public.patient_medications (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  prescribed_by uuid not null references public.profiles(id),
  name text not null,
  dose_amount numeric not null check (dose_amount > 0),
  dose_unit text not null,
  frequency text not null,
  start_date date not null,
  end_date date,
  special_instructions text,
  status text not null default 'active'
    check (status in ('active', 'on_hold', 'pending_review', 'approved', 'discontinued')),
  hold_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or end_date >= start_date)
);

create trigger patient_medications_set_updated_at
before update on public.patient_medications
for each row execute function public.set_updated_at();

-- 14. Patient Medication Schedules

create table public.patient_medication_schedules (
  id uuid primary key default gen_random_uuid(),
  patient_medication_id uuid not null references public.patient_medications(id) on delete cascade,
  scheduled_time time not null,
  day_of_week int[],
  created_at timestamptz not null default now(),
  check (
    day_of_week is null
    or day_of_week <@ array[0, 1, 2, 3, 4, 5, 6]
  )
);

-- 15. Patient Medication Administrations

create table public.patient_medication_administrations (
  id uuid primary key default gen_random_uuid(),
  patient_medication_id uuid not null references public.patient_medications(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  administered_by uuid references public.profiles(id),
  scheduled_at timestamptz not null,
  administered_at timestamptz,
  status text not null check (status in ('administered', 'missed', 'held', 'skipped')),
  hold_reason text,
  notes text,
  source text not null default 'online'
    check (source in ('online', 'offline_sync')),
  conflict_flag boolean not null default false,
  idempotency_key text unique,
  created_at timestamptz not null default now()
);

-- 16. Clinical Alerts

create table public.clinical_alerts (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  patient_medication_id_a uuid not null references public.patient_medications(id) on delete cascade,
  patient_medication_id_b uuid not null references public.patient_medications(id) on delete cascade,
  severity text not null check (severity in ('critical', 'moderate', 'low')),
  rule_key text not null,
  description text not null,
  status text not null default 'active'
    check (status in ('active', 'acknowledged', 'resolved')),
  acknowledged_by uuid references public.profiles(id),
  acknowledged_at timestamptz,
  created_at timestamptz not null default now(),
  check (patient_medication_id_a <> patient_medication_id_b)
);

-- 17. Care Notes

create table public.care_notes (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  role_name text not null check (role_name in ('nurse', 'doctor')),
  content text not null,
  archived boolean not null default false,
  archived_by uuid references public.profiles(id),
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

-- 18. Clinical Reviews

create table public.clinical_reviews (
  id uuid primary key default gen_random_uuid(),
  patient_medication_id uuid not null references public.patient_medications(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  requested_by uuid not null references public.profiles(id),
  reason text not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'flagged_unsafe')),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz not null default now()
);

-- Prevent duplicate active pending review entries for the same patient medication.
create unique index clinical_reviews_one_pending_per_medication
on public.clinical_reviews(patient_medication_id)
where status = 'pending';

-- 19. Audit Logs

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  action text not null,
  target_type text,
  target_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);

-- 20. Notifications

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  status text not null default 'unread'
    check (status in ('unread', 'read', 'dismissed')),
  metadata jsonb,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

-- 21. Notification Preferences

create table public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade unique,
  reminder_minutes int not null default 30
    check (reminder_minutes in (15, 30, 60)),
  reminders_enabled boolean not null default true,
  missed_dose_alerts boolean not null default true,
  caregiver_alerts boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger notification_preferences_set_updated_at
before update on public.notification_preferences
for each row execute function public.set_updated_at();

-- 22. Outpatient Appointments

create table public.outpatient_appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  appointment_time timestamptz not null,
  reason_for_visit text,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'arrived', 'in_progress', 'completed', 'cancelled', 'no_show')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger outpatient_appointments_set_updated_at
before update on public.outpatient_appointments
for each row execute function public.set_updated_at();

-- Indexes

create index idx_user_roles_user_id on public.user_roles(user_id);
create index idx_medications_user_id on public.medications(user_id);
create index idx_medication_schedules_medication_id on public.medication_schedules(medication_id);
create index idx_medication_logs_user_id on public.medication_logs(user_id);
create index idx_medication_logs_medication_id on public.medication_logs(medication_id);
create index idx_medication_alerts_user_id_status on public.medication_alerts(user_id, status);
create index idx_interaction_checks_user_id on public.interaction_checks(user_id);
create index idx_care_circle_owner_id on public.care_circle_members(owner_id);
create index idx_care_circle_caregiver_id on public.care_circle_members(caregiver_id);
create index idx_patients_status on public.patients(status);
create index idx_patient_assignments_user_id on public.patient_assignments(user_id);
create index idx_patient_assignments_patient_id on public.patient_assignments(patient_id);
create index idx_patient_medications_patient_id on public.patient_medications(patient_id);
create index idx_patient_medication_schedules_medication_id on public.patient_medication_schedules(patient_medication_id);
create index idx_patient_medication_admin_patient_id on public.patient_medication_administrations(patient_id);
create index idx_patient_medication_admin_medication_id on public.patient_medication_administrations(patient_medication_id);
create index idx_clinical_alerts_patient_id_status on public.clinical_alerts(patient_id, status);
create index idx_care_notes_patient_id_created_at on public.care_notes(patient_id, created_at desc);
create index idx_clinical_reviews_status on public.clinical_reviews(status);
create index idx_audit_logs_created_at on public.audit_logs(created_at desc);
create index idx_notifications_user_id_status on public.notifications(user_id, status);
create index idx_outpatient_appointments_time on public.outpatient_appointments(appointment_time);
create index idx_outpatient_appointments_patient_id on public.outpatient_appointments(patient_id);
