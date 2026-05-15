-- MedAware Row Level Security Policies
-- Academic prototype only. Medication interaction logic is mock/demo only.

-- =========================================================
-- Helper Functions
-- =========================================================

create or replace function public.current_user_roles()
returns text[] as $$
  select coalesce(array_agg(r.name), '{}')
  from public.user_roles ur
  join public.roles r on r.id = ur.role_id
  where ur.user_id = auth.uid();
$$ language sql security definer stable set search_path = public;

create or replace function public.has_role(role_name text)
returns boolean as $$
  select role_name = any(public.current_user_roles());
$$ language sql security definer stable set search_path = public;

create or replace function public.has_any_role(role_names text[])
returns boolean as $$
  select exists (
    select 1
    from unnest(public.current_user_roles()) as r(role_name)
    where r.role_name = any(role_names)
  );
$$ language sql security definer stable set search_path = public;

create or replace function public.is_admin()
returns boolean as $$
  select public.has_role('admin');
$$ language sql security definer stable set search_path = public;

create or replace function public.can_view_civilian_data(owner uuid)
returns boolean as $$
  select
    owner = auth.uid()
    or exists (
      select 1
      from public.care_circle_members ccm
      where ccm.owner_id = owner
        and ccm.caregiver_id = auth.uid()
        and ccm.status = 'active'
    )
    or public.is_admin();
$$ language sql security definer stable set search_path = public;

create or replace function public.can_manage_civilian_data(owner uuid)
returns boolean as $$
  select
    owner = auth.uid()
    or exists (
      select 1
      from public.care_circle_members ccm
      where ccm.owner_id = owner
        and ccm.caregiver_id = auth.uid()
        and ccm.status = 'active'
        and ccm.permission = 'manage'
    )
    or public.is_admin();
$$ language sql security definer stable set search_path = public;

create or replace function public.can_access_patient(patient uuid)
returns boolean as $$
  select
    public.has_any_role(array['nurse', 'doctor', 'pharmacist', 'admin']);

  -- Demo note:
  -- For the academic prototype, clinical users can view seeded demo patients.
  -- For production-like deployment, replace this with a patient_assignments check:
  -- exists (
  --   select 1 from public.patient_assignments pa
  --   where pa.patient_id = patient and pa.user_id = auth.uid()
  -- )
$$ language sql security definer stable set search_path = public;

create or replace function public.can_manage_patient(patient uuid)
returns boolean as $$
  select public.has_any_role(array['nurse', 'doctor', 'admin']);
$$ language sql security definer stable set search_path = public;

grant execute on function public.current_user_roles() to authenticated;
grant execute on function public.has_role(text) to authenticated;
grant execute on function public.has_any_role(text[]) to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.can_view_civilian_data(uuid) to authenticated;
grant execute on function public.can_manage_civilian_data(uuid) to authenticated;
grant execute on function public.can_access_patient(uuid) to authenticated;
grant execute on function public.can_manage_patient(uuid) to authenticated;

-- =========================================================
-- Grants
-- RLS still controls what authenticated users can actually access.
-- =========================================================

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- =========================================================
-- Enable RLS
-- =========================================================

alter table public.profiles enable row level security;
alter table public.roles enable row level security;
alter table public.user_roles enable row level security;
alter table public.medications enable row level security;
alter table public.medication_schedules enable row level security;
alter table public.medication_logs enable row level security;
alter table public.medication_alerts enable row level security;
alter table public.interaction_rules enable row level security;
alter table public.interaction_checks enable row level security;
alter table public.care_circle_members enable row level security;
alter table public.patients enable row level security;
alter table public.patient_assignments enable row level security;
alter table public.patient_medications enable row level security;
alter table public.patient_medication_schedules enable row level security;
alter table public.patient_medication_administrations enable row level security;
alter table public.clinical_alerts enable row level security;
alter table public.care_notes enable row level security;
alter table public.clinical_reviews enable row level security;
alter table public.audit_logs enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.outpatient_appointments enable row level security;

-- =========================================================
-- profiles
-- =========================================================

create policy "profiles_select_own_or_admin"
on public.profiles
for select
to authenticated
using (
  id = auth.uid()
  or public.is_admin()
);

create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- =========================================================
-- roles
-- =========================================================

create policy "roles_select_authenticated"
on public.roles
for select
to authenticated
using (true);

create policy "roles_admin_insert"
on public.roles
for insert
to authenticated
with check (public.is_admin());

create policy "roles_admin_update"
on public.roles
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "roles_admin_delete"
on public.roles
for delete
to authenticated
using (public.is_admin());

-- =========================================================
-- user_roles
-- =========================================================

create policy "user_roles_select_own_or_admin"
on public.user_roles
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_admin()
);

create policy "user_roles_admin_insert"
on public.user_roles
for insert
to authenticated
with check (public.is_admin());

create policy "user_roles_admin_update"
on public.user_roles
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "user_roles_admin_delete"
on public.user_roles
for delete
to authenticated
using (public.is_admin());

-- =========================================================
-- medications
-- =========================================================

create policy "medications_select_owner_caregiver_admin"
on public.medications
for select
to authenticated
using (public.can_view_civilian_data(user_id));

create policy "medications_insert_owner_or_manage_caregiver"
on public.medications
for insert
to authenticated
with check (public.can_manage_civilian_data(user_id));

create policy "medications_update_owner_or_manage_caregiver"
on public.medications
for update
to authenticated
using (public.can_manage_civilian_data(user_id))
with check (public.can_manage_civilian_data(user_id));

create policy "medications_delete_owner_only"
on public.medications
for delete
to authenticated
using (user_id = auth.uid());

-- =========================================================
-- medication_schedules
-- =========================================================

create policy "medication_schedules_select_via_medication"
on public.medication_schedules
for select
to authenticated
using (
  exists (
    select 1
    from public.medications m
    where m.id = medication_schedules.medication_id
      and public.can_view_civilian_data(m.user_id)
  )
);

create policy "medication_schedules_insert_via_medication"
on public.medication_schedules
for insert
to authenticated
with check (
  exists (
    select 1
    from public.medications m
    where m.id = medication_schedules.medication_id
      and public.can_manage_civilian_data(m.user_id)
  )
);

create policy "medication_schedules_update_via_medication"
on public.medication_schedules
for update
to authenticated
using (
  exists (
    select 1
    from public.medications m
    where m.id = medication_schedules.medication_id
      and public.can_manage_civilian_data(m.user_id)
  )
)
with check (
  exists (
    select 1
    from public.medications m
    where m.id = medication_schedules.medication_id
      and public.can_manage_civilian_data(m.user_id)
  )
);

create policy "medication_schedules_delete_owner_only"
on public.medication_schedules
for delete
to authenticated
using (
  exists (
    select 1
    from public.medications m
    where m.id = medication_schedules.medication_id
      and m.user_id = auth.uid()
  )
);

-- =========================================================
-- medication_logs
-- =========================================================

create policy "medication_logs_select_owner_caregiver_admin"
on public.medication_logs
for select
to authenticated
using (
  exists (
    select 1
    from public.medications m
    where m.id = medication_logs.medication_id
      and public.can_view_civilian_data(m.user_id)
  )
);

create policy "medication_logs_insert_owner_or_manage_caregiver"
on public.medication_logs
for insert
to authenticated
with check (
  exists (
    select 1
    from public.medications m
    where m.id = medication_logs.medication_id
      and m.user_id = medication_logs.user_id
      and public.can_manage_civilian_data(m.user_id)
  )
);

-- No UPDATE/DELETE policies: logs are append-only.

-- =========================================================
-- medication_alerts
-- =========================================================

create policy "medication_alerts_select_owner_caregiver_admin"
on public.medication_alerts
for select
to authenticated
using (public.can_view_civilian_data(user_id));

create policy "medication_alerts_update_owner_acknowledge"
on public.medication_alerts
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- No INSERT/DELETE policies: server-side/service role only.

-- =========================================================
-- interaction_rules
-- =========================================================

create policy "interaction_rules_select_authenticated"
on public.interaction_rules
for select
to authenticated
using (true);

-- No client-side INSERT/UPDATE/DELETE policies.

-- =========================================================
-- interaction_checks
-- =========================================================

create policy "interaction_checks_select_owner"
on public.interaction_checks
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_admin()
);

-- No client-side INSERT/UPDATE/DELETE policies.

-- =========================================================
-- care_circle_members
-- =========================================================

create policy "care_circle_select_owner_or_caregiver"
on public.care_circle_members
for select
to authenticated
using (
  owner_id = auth.uid()
  or caregiver_id = auth.uid()
  or public.is_admin()
);

create policy "care_circle_insert_owner"
on public.care_circle_members
for insert
to authenticated
with check (
  owner_id = auth.uid()
  or public.is_admin()
);

create policy "care_circle_update_owner_or_caregiver"
on public.care_circle_members
for update
to authenticated
using (
  owner_id = auth.uid()
  or caregiver_id = auth.uid()
  or public.is_admin()
)
with check (
  owner_id = auth.uid()
  or caregiver_id = auth.uid()
  or public.is_admin()
);

create policy "care_circle_delete_owner"
on public.care_circle_members
for delete
to authenticated
using (
  owner_id = auth.uid()
  or public.is_admin()
);

-- =========================================================
-- patients
-- =========================================================

create policy "patients_select_clinical_roles"
on public.patients
for select
to authenticated
using (
  public.has_any_role(array['nurse', 'doctor', 'pharmacist', 'admin'])
);

create policy "patients_insert_nurse_doctor_admin"
on public.patients
for insert
to authenticated
with check (
  public.has_any_role(array['nurse', 'doctor', 'admin'])
);

create policy "patients_update_nurse_doctor_admin"
on public.patients
for update
to authenticated
using (
  public.has_any_role(array['nurse', 'doctor', 'admin'])
)
with check (
  public.has_any_role(array['nurse', 'doctor', 'admin'])
);

create policy "patients_delete_admin"
on public.patients
for delete
to authenticated
using (public.is_admin());

-- =========================================================
-- patient_assignments
-- =========================================================

create policy "patient_assignments_select_self_or_admin"
on public.patient_assignments
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_admin()
);

create policy "patient_assignments_insert_doctor_or_admin"
on public.patient_assignments
for insert
to authenticated
with check (
  public.has_any_role(array['doctor', 'admin'])
);

create policy "patient_assignments_delete_doctor_or_admin"
on public.patient_assignments
for delete
to authenticated
using (
  public.has_any_role(array['doctor', 'admin'])
);

-- =========================================================
-- patient_medications
-- =========================================================

create policy "patient_medications_select_clinical"
on public.patient_medications
for select
to authenticated
using (
  public.can_access_patient(patient_id)
);

create policy "patient_medications_insert_doctor_admin"
on public.patient_medications
for insert
to authenticated
with check (
  public.has_any_role(array['doctor', 'admin'])
);

create policy "patient_medications_update_doctor_pharmacist_admin"
on public.patient_medications
for update
to authenticated
using (
  public.has_any_role(array['doctor', 'pharmacist', 'admin'])
)
with check (
  public.has_any_role(array['doctor', 'pharmacist', 'admin'])
);

-- No DELETE policy: use status = discontinued.

-- =========================================================
-- patient_medication_schedules
-- =========================================================

create policy "patient_medication_schedules_select_via_medication"
on public.patient_medication_schedules
for select
to authenticated
using (
  exists (
    select 1
    from public.patient_medications pm
    where pm.id = patient_medication_schedules.patient_medication_id
      and public.can_access_patient(pm.patient_id)
  )
);

create policy "patient_medication_schedules_insert_doctor_admin"
on public.patient_medication_schedules
for insert
to authenticated
with check (
  exists (
    select 1
    from public.patient_medications pm
    where pm.id = patient_medication_schedules.patient_medication_id
      and public.has_any_role(array['doctor', 'admin'])
  )
);

create policy "patient_medication_schedules_update_doctor_admin"
on public.patient_medication_schedules
for update
to authenticated
using (
  exists (
    select 1
    from public.patient_medications pm
    where pm.id = patient_medication_schedules.patient_medication_id
      and public.has_any_role(array['doctor', 'admin'])
  )
)
with check (
  exists (
    select 1
    from public.patient_medications pm
    where pm.id = patient_medication_schedules.patient_medication_id
      and public.has_any_role(array['doctor', 'admin'])
  )
);

-- No DELETE policy for demo.

-- =========================================================
-- patient_medication_administrations
-- =========================================================

create policy "patient_medication_administrations_select_clinical"
on public.patient_medication_administrations
for select
to authenticated
using (
  public.can_access_patient(patient_id)
);

create policy "patient_medication_administrations_insert_nurse"
on public.patient_medication_administrations
for insert
to authenticated
with check (
  public.has_role('nurse')
  and public.can_access_patient(patient_id)
);

-- No UPDATE/DELETE policies: administration logs are append-only.

-- =========================================================
-- clinical_alerts
-- =========================================================

create policy "clinical_alerts_select_clinical"
on public.clinical_alerts
for select
to authenticated
using (
  public.can_access_patient(patient_id)
);

create policy "clinical_alerts_update_clinical_acknowledge"
on public.clinical_alerts
for update
to authenticated
using (
  public.can_access_patient(patient_id)
)
with check (
  public.can_access_patient(patient_id)
);

-- No INSERT/DELETE policies: server-side/service role only.

-- =========================================================
-- care_notes
-- =========================================================

create policy "care_notes_select_clinical"
on public.care_notes
for select
to authenticated
using (
  public.can_access_patient(patient_id)
);

create policy "care_notes_insert_nurse_doctor"
on public.care_notes
for insert
to authenticated
with check (
  public.has_any_role(array['nurse', 'doctor'])
  and public.can_access_patient(patient_id)
);

create policy "care_notes_update_admin_archive_only"
on public.care_notes
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- No DELETE policy.

-- =========================================================
-- clinical_reviews
-- =========================================================

create policy "clinical_reviews_select_permitted"
on public.clinical_reviews
for select
to authenticated
using (
  public.has_role('pharmacist')
  or requested_by = auth.uid()
  or public.is_admin()
);

create policy "clinical_reviews_insert_nurse_doctor"
on public.clinical_reviews
for insert
to authenticated
with check (
  public.has_any_role(array['nurse', 'doctor'])
  and public.can_access_patient(patient_id)
);

create policy "clinical_reviews_update_pharmacist_admin"
on public.clinical_reviews
for update
to authenticated
using (
  public.has_any_role(array['pharmacist', 'admin'])
)
with check (
  public.has_any_role(array['pharmacist', 'admin'])
);

-- =========================================================
-- audit_logs
-- =========================================================

create policy "audit_logs_select_admin"
on public.audit_logs
for select
to authenticated
using (public.is_admin());

-- No client-side INSERT/UPDATE/DELETE policies.

-- =========================================================
-- notifications
-- =========================================================

create policy "notifications_select_owner"
on public.notifications
for select
to authenticated
using (user_id = auth.uid());

create policy "notifications_update_owner"
on public.notifications
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- No client-side INSERT/DELETE policies.

-- =========================================================
-- notification_preferences
-- =========================================================

create policy "notification_preferences_select_owner"
on public.notification_preferences
for select
to authenticated
using (user_id = auth.uid());

create policy "notification_preferences_insert_owner"
on public.notification_preferences
for insert
to authenticated
with check (user_id = auth.uid());

create policy "notification_preferences_update_owner"
on public.notification_preferences
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- =========================================================
-- outpatient_appointments
-- =========================================================

create policy "outpatient_appointments_select_clinical"
on public.outpatient_appointments
for select
to authenticated
using (
  public.has_any_role(array['nurse', 'doctor', 'admin'])
);

create policy "outpatient_appointments_insert_admin"
on public.outpatient_appointments
for insert
to authenticated
with check (public.is_admin());

create policy "outpatient_appointments_update_nurse_doctor_admin"
on public.outpatient_appointments
for update
to authenticated
using (
  public.has_any_role(array['nurse', 'doctor', 'admin'])
)
with check (
  public.has_any_role(array['nurse', 'doctor', 'admin'])
);

create policy "outpatient_appointments_delete_admin"
on public.outpatient_appointments
for delete
to authenticated
using (public.is_admin());