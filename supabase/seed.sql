-- MedAware Seed Data
-- Run this after:
-- 1. 001_initial_schema.sql
-- 2. 002_rls_policies.sql
-- 3. npx tsx supabase/seed-users.ts

-- Roles
insert into public.roles (name)
values
  ('civilian'),
  ('caregiver'),
  ('nurse'),
  ('doctor'),
  ('pharmacist'),
  ('admin')
on conflict (name) do nothing;

-- Profiles from Supabase Auth users
insert into public.profiles (id, full_name, email)
select
  u.id,
  coalesce(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
  u.email
from auth.users u
where u.email in (
  'civilian@medaware.demo',
  'caregiver@medaware.demo',
  'nurse@medaware.demo',
  'doctor@medaware.demo',
  'pharmacist@medaware.demo',
  'admin@medaware.demo'
)
on conflict (id) do update
set
  full_name = excluded.full_name,
  email = excluded.email,
  updated_at = now();

-- Assign user roles
insert into public.user_roles (user_id, role_id)
select p.id, r.id
from public.profiles p
join public.roles r on r.name = 'civilian'
where p.email = 'civilian@medaware.demo'
on conflict (user_id, role_id) do nothing;

insert into public.user_roles (user_id, role_id)
select p.id, r.id
from public.profiles p
join public.roles r on r.name = 'caregiver'
where p.email = 'caregiver@medaware.demo'
on conflict (user_id, role_id) do nothing;

insert into public.user_roles (user_id, role_id)
select p.id, r.id
from public.profiles p
join public.roles r on r.name = 'nurse'
where p.email = 'nurse@medaware.demo'
on conflict (user_id, role_id) do nothing;

insert into public.user_roles (user_id, role_id)
select p.id, r.id
from public.profiles p
join public.roles r on r.name = 'doctor'
where p.email = 'doctor@medaware.demo'
on conflict (user_id, role_id) do nothing;

insert into public.user_roles (user_id, role_id)
select p.id, r.id
from public.profiles p
join public.roles r on r.name = 'pharmacist'
where p.email = 'pharmacist@medaware.demo'
on conflict (user_id, role_id) do nothing;

insert into public.user_roles (user_id, role_id)
select p.id, r.id
from public.profiles p
join public.roles r on r.name = 'admin'
where p.email = 'admin@medaware.demo'
on conflict (user_id, role_id) do nothing;

-- Demo interaction rules
insert into public.interaction_rules
(rule_key, medication_a, medication_b, severity, description, is_demo)
values
  (
    'warfarin_ibuprofen',
    'warfarin',
    'ibuprofen',
    'critical',
    'Demo rule: Warfarin and ibuprofen may increase bleeding risk. Contact a health professional before continuing.',
    true
  ),
  (
    'duplicate_name',
    'duplicate',
    'duplicate',
    'moderate',
    'Demo rule: Duplicate medication names may indicate accidental duplicate therapy.',
    true
  ),
  (
    'allergy_penicillin',
    'penicillin',
    'allergy',
    'critical',
    'Demo rule: Medication may conflict with a listed allergy.',
    true
  ),
  (
    'statin_grapefruit',
    'statin',
    'grapefruit',
    'low',
    'Demo rule: Grapefruit may affect certain statins. Ask a professional if unsure.',
    true
  )
on conflict (rule_key) do update
set
  medication_a = excluded.medication_a,
  medication_b = excluded.medication_b,
  severity = excluded.severity,
  description = excluded.description,
  is_demo = excluded.is_demo;

-- Civilian medications
insert into public.medications
(id, user_id, name, dose_amount, dose_unit, frequency, start_date, notes, status)
values
  (
    '00000000-0000-4000-8000-000000000101',
    (select id from public.profiles where email = 'civilian@medaware.demo'),
    'Warfarin',
    5,
    'mg',
    'Daily',
    current_date,
    'Take in the evening. Demo medication only.',
    'active'
  ),
  (
    '00000000-0000-4000-8000-000000000102',
    (select id from public.profiles where email = 'civilian@medaware.demo'),
    'Ibuprofen',
    200,
    'mg',
    'As needed',
    current_date,
    'Demo medication that triggers a critical warning with Warfarin.',
    'pending_review'
  ),
  (
    '00000000-0000-4000-8000-000000000103',
    (select id from public.profiles where email = 'civilian@medaware.demo'),
    'Metformin',
    500,
    'mg',
    'Twice daily',
    current_date,
    'Take after meals.',
    'active'
  )
on conflict (id) do update
set
  name = excluded.name,
  dose_amount = excluded.dose_amount,
  dose_unit = excluded.dose_unit,
  frequency = excluded.frequency,
  notes = excluded.notes,
  status = excluded.status,
  updated_at = now();

insert into public.medication_schedules
(medication_id, scheduled_time, day_of_week)
values
  ('00000000-0000-4000-8000-000000000101', '20:00', array[0,1,2,3,4,5,6]),
  ('00000000-0000-4000-8000-000000000102', '14:00', array[0,1,2,3,4,5,6]),
  ('00000000-0000-4000-8000-000000000103', '08:00', array[0,1,2,3,4,5,6]),
  ('00000000-0000-4000-8000-000000000103', '18:00', array[0,1,2,3,4,5,6])
on conflict do nothing;

insert into public.medication_alerts
(user_id, medication_id_a, medication_id_b, severity, rule_key, description, status)
values
  (
    (select id from public.profiles where email = 'civilian@medaware.demo'),
    '00000000-0000-4000-8000-000000000101',
    '00000000-0000-4000-8000-000000000102',
    'critical',
    'warfarin_ibuprofen',
    'Demo critical alert: Warfarin and ibuprofen may increase bleeding risk. Contact a health professional before continuing.',
    'active'
  )
on conflict do nothing;

-- Care circle
insert into public.care_circle_members
(owner_id, caregiver_id, permission, status, accepted_at)
values
  (
    (select id from public.profiles where email = 'civilian@medaware.demo'),
    (select id from public.profiles where email = 'caregiver@medaware.demo'),
    'manage',
    'active',
    now()
  )
on conflict (owner_id, caregiver_id) do update
set
  permission = excluded.permission,
  status = excluded.status,
  accepted_at = excluded.accepted_at;

-- Clinical patients
insert into public.patients
(id, full_name, date_of_birth, room_number, ward, primary_diagnosis, allergies, admission_date, status)
values
  (
    '00000000-0000-4000-8000-000000000201',
    'Maria Santos',
    '1959-04-12',
    '305',
    'Ward A',
    'Pneumonia, anticoagulant therapy',
    array['Penicillin'],
    current_date - interval '2 days',
    'admitted'
  ),
  (
    '00000000-0000-4000-8000-000000000202',
    'Pedro Reyes',
    '1967-09-20',
    '112',
    'Ward B',
    'Type II Diabetes',
    array[]::text[],
    current_date - interval '4 days',
    'admitted'
  ),
  (
    '00000000-0000-4000-8000-000000000203',
    'Elena Santos',
    '1974-06-07',
    null,
    'Outpatient',
    'Medication follow-up',
    array[]::text[],
    null,
    'outpatient'
  )
on conflict (id) do update
set
  full_name = excluded.full_name,
  room_number = excluded.room_number,
  ward = excluded.ward,
  primary_diagnosis = excluded.primary_diagnosis,
  allergies = excluded.allergies,
  status = excluded.status,
  updated_at = now();

insert into public.patient_assignments
(patient_id, user_id, role_name)
values
  (
    '00000000-0000-4000-8000-000000000201',
    (select id from public.profiles where email = 'nurse@medaware.demo'),
    'nurse'
  ),
  (
    '00000000-0000-4000-8000-000000000202',
    (select id from public.profiles where email = 'nurse@medaware.demo'),
    'nurse'
  ),
  (
    '00000000-0000-4000-8000-000000000201',
    (select id from public.profiles where email = 'doctor@medaware.demo'),
    'doctor'
  ),
  (
    '00000000-0000-4000-8000-000000000201',
    (select id from public.profiles where email = 'pharmacist@medaware.demo'),
    'pharmacist'
  )
on conflict (patient_id, user_id) do nothing;

-- Clinical medications
insert into public.patient_medications
(id, patient_id, prescribed_by, name, dose_amount, dose_unit, frequency, start_date, special_instructions, status, hold_reason)
values
  (
    '00000000-0000-4000-8000-000000000301',
    '00000000-0000-4000-8000-000000000201',
    (select id from public.profiles where email = 'doctor@medaware.demo'),
    'Warfarin',
    5,
    'mg',
    'Daily',
    current_date,
    'Evening dose. Demo only.',
    'active',
    null
  ),
  (
    '00000000-0000-4000-8000-000000000302',
    '00000000-0000-4000-8000-000000000201',
    (select id from public.profiles where email = 'doctor@medaware.demo'),
    'Ibuprofen',
    200,
    'mg',
    'As needed',
    current_date,
    'Hold pending review.',
    'on_hold',
    'Demo interaction with Warfarin.'
  ),
  (
    '00000000-0000-4000-8000-000000000303',
    '00000000-0000-4000-8000-000000000202',
    (select id from public.profiles where email = 'doctor@medaware.demo'),
    'Metformin',
    500,
    'mg',
    'Twice daily',
    current_date,
    'Take after meals.',
    'active',
    null
  )
on conflict (id) do update
set
  name = excluded.name,
  dose_amount = excluded.dose_amount,
  dose_unit = excluded.dose_unit,
  frequency = excluded.frequency,
  special_instructions = excluded.special_instructions,
  status = excluded.status,
  hold_reason = excluded.hold_reason,
  updated_at = now();

insert into public.patient_medication_schedules
(patient_medication_id, scheduled_time, day_of_week)
values
  ('00000000-0000-4000-8000-000000000301', '20:00', array[0,1,2,3,4,5,6]),
  ('00000000-0000-4000-8000-000000000302', '14:00', array[0,1,2,3,4,5,6]),
  ('00000000-0000-4000-8000-000000000303', '08:00', array[0,1,2,3,4,5,6]),
  ('00000000-0000-4000-8000-000000000303', '18:00', array[0,1,2,3,4,5,6])
on conflict do nothing;

insert into public.clinical_alerts
(patient_id, patient_medication_id_a, patient_medication_id_b, severity, rule_key, description, status)
values
  (
    '00000000-0000-4000-8000-000000000201',
    '00000000-0000-4000-8000-000000000301',
    '00000000-0000-4000-8000-000000000302',
    'critical',
    'warfarin_ibuprofen',
    'Demo clinical danger alert: Do not administer until reviewed.',
    'active'
  )
on conflict do nothing;

insert into public.clinical_reviews
(patient_medication_id, patient_id, requested_by, reason, status)
values
  (
    '00000000-0000-4000-8000-000000000302',
    '00000000-0000-4000-8000-000000000201',
    (select id from public.profiles where email = 'doctor@medaware.demo'),
    'Demo review requested due to Warfarin + Ibuprofen alert.',
    'pending'
  )
on conflict do nothing;

-- Care notes
insert into public.care_notes
(patient_id, author_id, role_name, content)
values
  (
    '00000000-0000-4000-8000-000000000201',
    (select id from public.profiles where email = 'nurse@medaware.demo'),
    'nurse',
    'Patient reports fatigue. Medication hold remains visible in tracker.'
  ),
  (
    '00000000-0000-4000-8000-000000000201',
    (select id from public.profiles where email = 'doctor@medaware.demo'),
    'doctor',
    'Awaiting pharmacist review before administering held medication.'
  )
on conflict do nothing;

-- Notifications
insert into public.notifications
(user_id, type, title, message, status, metadata)
values
  (
    (select id from public.profiles where email = 'civilian@medaware.demo'),
    'interaction_alert',
    'Medication caution',
    'Demo alert: Review Warfarin and Ibuprofen before continuing.',
    'unread',
    '{"severity":"critical"}'
  ),
  (
    (select id from public.profiles where email = 'nurse@medaware.demo'),
    'clinical_team',
    'Clinical alert',
    'Room 305 has an active medication safety alert.',
    'unread',
    '{"room":"305"}'
  )
on conflict do nothing;

-- Notification preferences
insert into public.notification_preferences
(user_id, reminder_minutes, reminders_enabled, missed_dose_alerts, caregiver_alerts)
select p.id, 30, true, true, true
from public.profiles p
where p.email in (
  'civilian@medaware.demo',
  'caregiver@medaware.demo',
  'nurse@medaware.demo',
  'doctor@medaware.demo',
  'pharmacist@medaware.demo',
  'admin@medaware.demo'
)
on conflict (user_id) do update
set
  reminder_minutes = excluded.reminder_minutes,
  reminders_enabled = excluded.reminders_enabled,
  missed_dose_alerts = excluded.missed_dose_alerts,
  caregiver_alerts = excluded.caregiver_alerts,
  updated_at = now();

-- Outpatient appointments
insert into public.outpatient_appointments
(patient_id, appointment_time, reason_for_visit, status)
values
  (
    '00000000-0000-4000-8000-000000000203',
    date_trunc('day', now()) + interval '10 hours',
    'Medication adherence follow-up',
    'scheduled'
  )
on conflict do nothing;

-- Audit logs
insert into public.audit_logs
(actor_id, action, target_type, target_id, metadata)
values
  (
    (select id from public.profiles where email = 'admin@medaware.demo'),
    'seed.demo_data_created',
    'system',
    null,
    '{"demo":true}'
  ),
  (
    (select id from public.profiles where email = 'doctor@medaware.demo'),
    'clinical.review_requested',
    'patient_medication',
    '00000000-0000-4000-8000-000000000302',
    '{"reason":"demo interaction"}'
  )
on conflict do nothing;