# Design Document — MedAware

> **Medical Safety Disclaimer**: All medication interaction logic in MedAware is mock/demo logic for academic purposes only. It does NOT constitute real medical advice. Real deployment would require verified drug-interaction databases and licensed clinical review.

---

## Overview

MedAware is a role-adaptive medication safety and adherence full-stack web application. It serves two operational modes — Civilian (personal medication management) and Clinical (hospital/clinic workflows) — across six roles: Civilian User, Caregiver, Nurse, Doctor, Pharmacist, and Admin. The application is built with Next.js App Router, TypeScript, Tailwind CSS, Framer Motion, Supabase (Auth + PostgreSQL + RLS), and deployed on Vercel. All medication interaction logic is mock/demo logic for academic purposes only.

---

## Architecture

See Section 1 (System Architecture) below for the full architecture detail including the Next.js App Router structure, Supabase integration, RLS design, and Vercel deployment topology.

---

## Components and Interfaces

See Section 6 (Component Architecture) below for the full component tree including layout components, civilian feature components, clinical feature components, modal components, and shared state components.

---

## Data Models

See Section 3 (Database Schema) below for the full PostgreSQL schema including all 21 tables with column definitions, constraints, and relationships.

---

## Correctness Properties

The following correctness properties are enforced by the implementation and verified by the testing strategy in Section 9. They map directly to the properties defined in requirements.md.

### Property 1: Countdown Non-Negativity
`computeCountdown(scheduledAt)` returns a value `>= 0` for all inputs, including past timestamps.

**Validates: Requirements 3.7, 22.4**

### Property 2: Medication Data Round-Trip
For all medications submitted through the add medication flow, the stored and retrieved data is equivalent to the submitted data (same name, dose, unit, schedule, notes).

**Validates: Requirements 4.6, 14.6**

### Property 3: Adherence Score Monotonicity
`score(history + [missed]) <= score(history)` — adding a missed dose never increases the adherence score.

**Validates: Requirements 8.5**

### Property 4: Interaction Alert Completeness
For all pairs of active medications matching a Mock_Interaction_Rule, an Interaction_Alert is surfaced. No conflicting pair is silently ignored.

**Validates: Requirements 5.6**

### Property 5: Audit Log Append-Only
`|log(t2)| >= |log(t1)|` for all `t2 > t1`. No audit log entry is removed or modified after creation.

**Validates: Requirements 20.5, 20.7**

### Property 6: Idempotent Offline Sync
Syncing the same Offline_Queue twice produces no duplicate records or double-counted dose markings.

**Validates: Requirements 10.6**

### Property 7: Review Queue Membership Exclusivity
A medication cannot appear in both the approved state and the pending Review_Queue simultaneously.

**Validates: Requirements 17.6**

### Property 8: Widget Data Consistency
Widget next-dose data (countdown, medication name, scheduled time) matches the Civilian Dashboard data for the same user at the same point in time.

**Validates: Requirements 34.4**

### Property 9: Role Access Exclusivity
For any role R and any route outside R's permitted set, an access attempt returns an unauthorized response. This holds for all valid role values and all defined routes (Requirements 2 and 42).

**Validates: Requirements 2.8, 42.2**

### Property 10: Discharge Instructions Completeness
For all patients with one or more active medications at discharge, every active medication appears in the generated discharge instructions without omission.

**Validates: Requirements 19.6**

---

## Error Handling

- **Authentication errors**: Supabase Auth errors are caught in Server Actions and returned as typed error objects. The UI displays inline error messages without exposing internal details.
- **Database errors**: Supabase query errors are caught server-side. Non-sensitive error messages are surfaced via `ErrorState` component. Full errors are logged server-side only.
- **Interaction engine errors**: If the mock engine throws, the medication save is aborted and the user is shown a generic "Safety check failed — please try again" message.
- **Offline sync conflicts**: Civilian conflicts use last-write-wins with user notification. Clinical conflicts are flagged for manual review and recorded in `audit_logs`.
- **Unauthorized access**: Middleware redirects to `/unauthorized` for role violations. The page shows a clear access-denied message with a link back to the user's landing view.
- **RLS violations**: Supabase returns a `PGRST116` error for RLS-blocked queries. These are treated as unauthorized and surfaced as access-denied messages.
- **Form validation**: All forms use server-side validation in Server Actions in addition to client-side validation. Field-level errors are returned and displayed inline.

---

## Testing Strategy

See Section 9 (Testing Strategy) below for the full test plan mapping each correctness property to specific property-based tests, unit tests, and integration tests using Vitest, fast-check, and React Testing Library.

---

## 1. System Architecture

### 1.1 Overview

MedAware is a full-stack web application built on the Next.js App Router with Supabase as the backend-as-a-service platform and deployed on Vercel. The architecture follows a server-first rendering model where sensitive data fetching and access control happen on the server, with client-side interactivity layered on top via React Server Components and Client Components.

```
┌─────────────────────────────────────────────────────────────┐
│                        Vercel Edge                          │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Next.js App Router (SSR/RSC)             │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐  │  │
│  │  │  Middleware  │  │ Server Comps │  │Client Comps │  │  │
│  │  │ (Auth Guard) │  │ (Data Fetch) │  │(Interactiv.)│  │  │
│  │  └──────┬──────┘  └──────┬───────┘  └──────┬──────┘  │  │
│  └─────────┼────────────────┼─────────────────┼─────────┘  │
└────────────┼────────────────┼─────────────────┼────────────┘
             │                │                 │
             ▼                ▼                 ▼
┌─────────────────────────────────────────────────────────────┐
│                        Supabase                             │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │  Supabase    │  │  PostgreSQL  │  │  Supabase         │  │
│  │  Auth        │  │  + RLS       │  │  Realtime (Ph. 3) │  │
│  └──────────────┘  └──────────────┘  └───────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Next.js App Router Architecture

- **Runtime**: Node.js on Vercel serverless functions
- **Rendering strategy**: React Server Components (RSC) for data-fetching pages; Client Components (`"use client"`) for interactive UI (timers, modals, forms)
- **Route groups**: `(auth)` for unauthenticated pages, `(app)` for authenticated civilian routes, `(clinical)` for clinical routes, `(admin)` for admin routes
- **Middleware**: `middleware.ts` at the project root intercepts every request, validates the Supabase session cookie, and redirects unauthenticated users to `/login`
- **Server Actions**: Used for form submissions (add medication, care notes, role changes) to keep mutations server-side
- **API Routes**: Minimal — used only for Supabase webhook callbacks and any future push notification endpoints

### 1.3 Supabase Auth

- Email/password authentication via Supabase Auth
- Session stored in an HTTP-only cookie managed by `@supabase/ssr`
- Server-side session validation in middleware and in every Server Component via `createServerClient`
- Client-side session access via `createBrowserClient` for reactive UI state
- Auth state changes (login, logout, token refresh) handled by Supabase Auth helpers

### 1.4 Supabase PostgreSQL + Row Level Security

- All application data stored in a single Supabase PostgreSQL project
- RLS enabled on every table — no table is publicly readable or writable
- Role resolution: the authenticated user's `user_roles` record is joined in RLS policies to determine permitted data scope
- Service role key used only in server-side seed scripts and migrations — never exposed to the client

### 1.5 Vercel Deployment

- Next.js build output deployed as Vercel serverless functions + static assets
- Environment variables set in Vercel project settings (never committed to source)
- Preview deployments for every pull request
- Production deployment from `main` branch

---

## 2. Application Routing

### 2.1 Route Structure

```
app/
├── (auth)/
│   ├── login/                  → /login
│   └── role-select/            → /role-select
├── (app)/
│   ├── dashboard/              → /dashboard
│   ├── medications/
│   │   └── new/                → /medications/new
│   ├── interactions/           → /interactions
│   ├── adherence/              → /adherence
│   ├── care-circle/            → /care-circle
│   ├── widgets/                → /widgets
│   └── settings/               → /settings
├── (clinical)/
│   ├── clinical/
│   │   ├── patients/           → /clinical/patients
│   │   ├── patients/[id]/      → /clinical/patients/[id]
│   │   ├── alerts/             → /clinical/alerts
│   │   ├── reviews/            → /clinical/reviews  (Pharmacist Review Queue)
│   │   ├── clinic/             → /clinical/clinic
│   │   └── discharge/[id]/     → /clinical/discharge/[id]
├── (admin)/
│   └── admin/                  → /admin
└── unauthorized/               → /unauthorized
```

### 2.2 Route Descriptions and Access

| Route | Description | Permitted Roles |
|---|---|---|
| `/login` | Login form + medical disclaimer. Unauthenticated entry point. | Public |
| `/role-select` | Role picker shown only when a user has 2+ roles. Redirects to landing view after selection. | Authenticated (multi-role users only) |
| `/dashboard` | Civilian Medication Dashboard — next dose countdown, adherence score, alerts. | Civilian_User, Caregiver |
| `/medications/new` | Guided multi-step Add Medication form with Safety Pre-Check. | Civilian_User, Caregiver (with manage permission) |
| `/interactions` | Interaction Detail and Triage view. | Civilian_User, Caregiver |
| `/adherence` | Adherence Risk Dashboard — score, history, trends. | Civilian_User, Caregiver |
| `/care-circle` | Care Circle Sharing — invite, manage, set permissions. | Civilian_User, Caregiver |
| `/widgets` | Widget mockup page — iOS light/dark and Android light/dark prototype previews. | Civilian_User, Caregiver |
| `/settings` | Accessibility settings, notification preferences. | All authenticated roles |
| `/clinical/patients` | Hospital Patient Board — all patients with risk states. | Nurse, Doctor, Admin |
| `/clinical/patients/[id]` | Patient Medication Tracker for a specific patient. | Nurse, Doctor, Pharmacist, Admin |
| `/clinical/alerts` | Hospital Alert Center — all active alerts across patients. | Nurse, Doctor, Pharmacist, Admin |
| `/clinical/reviews` | Pharmacist Review Queue — approve or flag medications pending review. | Pharmacist, Admin |
| `/clinical/clinic` | Outpatient Clinic Queue. | Nurse, Doctor, Admin |
| `/clinical/discharge/[id]` | Discharge Instructions for a specific patient. | Doctor, Admin |
| `/admin` | Admin Roles and Audit Logs + System Overview. | Admin |
| `/unauthorized` | Access-denied page shown when a role attempts a forbidden route. | All authenticated roles |

### 2.3 Authentication and Redirect Flow

```
Request arrives
      │
      ▼
middleware.ts
      │
      ├─ Route is /login and user IS authenticated? ──► redirect to role landing view
      │
      ├─ Route is /login and user is NOT authenticated? ─► allow through (render login page)
      │
      ├─ Route is protected and user is NOT authenticated? ─► redirect /login
      │
      ├─ Route is protected, user IS authenticated,
      │  multiple roles, no role selected in session? ──► redirect /role-select
      │
      └─ Route is protected, user IS authenticated,
         role selected ──────────────────────────────► check route permission
                                                              │
                                              ┌───────────────┴───────────────┐
                                              │                               │
                                         Permitted                      Not permitted
                                              │                               │
                                         Render page                 redirect /unauthorized
```

**Key rules:**
- Middleware does NOT redirect authenticated users away from every route — only from `/login` (to avoid re-login) and from routes they are not permitted to access.
- `/role-select` is only shown when the user has 2+ roles and has not yet selected an active role for this session.
- `/unauthorized` is shown when an authenticated user with a valid session attempts a route outside their role's permitted set.

### 2.4 Role Landing Views

| Role | Landing Route |
|---|---|
| Civilian_User | `/dashboard` |
| Caregiver | `/dashboard` |
| Nurse | `/clinical/patients` |
| Doctor | `/clinical/patients` |
| Pharmacist | `/clinical/reviews` |
| Admin | `/admin` |

---

## 3. Database Schema

All tables use `uuid` primary keys generated by `gen_random_uuid()`. All timestamps are `timestamptz` defaulting to `now()`. RLS is enabled on every table.

### 3.1 `profiles`

Extends Supabase Auth `auth.users`. Created automatically via a trigger on `auth.users` insert.

```sql
CREATE TABLE profiles (
  id            uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name     text NOT NULL,
  email         text NOT NULL,
  avatar_url    text,
  font_size     text NOT NULL DEFAULT 'default',   -- 'default' | 'large' | 'xl'
  high_contrast boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
```

### 3.2 `roles`

Lookup table for the six application roles.

```sql
CREATE TABLE roles (
  id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE   -- 'civilian' | 'caregiver' | 'nurse' | 'doctor' | 'pharmacist' | 'admin'
);
```

### 3.3 `user_roles`

Maps users to their assigned roles. A user may have multiple rows (multiple roles).

```sql
CREATE TABLE user_roles (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role_id    uuid NOT NULL REFERENCES roles(id),
  assigned_by uuid REFERENCES profiles(id),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role_id)
);
```

### 3.4 `medications`

Civilian-context medications owned by a user.

```sql
CREATE TABLE medications (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name          text NOT NULL,
  dose_amount   numeric NOT NULL,
  dose_unit     text NOT NULL,         -- 'mg' | 'ml' | 'tablet' | etc.
  frequency     text NOT NULL,         -- 'once_daily' | 'twice_daily' | 'custom' | etc.
  start_date    date NOT NULL,
  end_date      date,
  notes         text,
  status        text NOT NULL DEFAULT 'active',  -- 'active' | 'inactive' | 'pending_review'
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
```

### 3.5 `medication_schedules`

Individual scheduled dose times for a medication.

```sql
CREATE TABLE medication_schedules (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_id uuid NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  scheduled_time time NOT NULL,        -- e.g. '08:00:00'
  day_of_week   int[],                 -- NULL = every day; [0..6] for specific days
  created_at    timestamptz NOT NULL DEFAULT now()
);
```

### 3.6 `medication_logs`

Records each dose event (taken, missed, skipped) for civilian medications.

```sql
CREATE TABLE medication_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_id   uuid NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES profiles(id),
  scheduled_at    timestamptz NOT NULL,
  logged_at       timestamptz,
  status          text NOT NULL,   -- 'taken' | 'missed' | 'skipped'
  source          text NOT NULL DEFAULT 'online',  -- 'online' | 'offline_sync'
  conflict_flag   boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);
```

### 3.7 `medication_alerts`

Active interaction alerts for civilian medications.

```sql
CREATE TABLE medication_alerts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES profiles(id),
  medication_id_a   uuid NOT NULL REFERENCES medications(id),
  medication_id_b   uuid NOT NULL REFERENCES medications(id),
  severity          text NOT NULL,   -- 'critical' | 'moderate' | 'low'
  rule_key          text NOT NULL,   -- references the mock rule that triggered this
  description       text NOT NULL,
  status            text NOT NULL DEFAULT 'active',  -- 'active' | 'acknowledged' | 'resolved'
  acknowledged_by   uuid REFERENCES profiles(id),
  acknowledged_at   timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now()
);
```

### 3.8 `interaction_rules`

Seeded mock interaction rules evaluated by the safety engine. All rules are flagged `is_demo = true`.

> ⚠️ **Demo Logic Only** — These rules are not real clinical pharmacology.

```sql
CREATE TABLE interaction_rules (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_key      text NOT NULL UNIQUE,   -- e.g. 'warfarin_ibuprofen'
  medication_a  text NOT NULL,          -- normalized lowercase name or pattern
  medication_b  text NOT NULL,          -- normalized lowercase name or pattern
  severity      text NOT NULL,          -- 'critical' | 'moderate' | 'low'
  description   text NOT NULL,          -- shown to user; always includes demo disclaimer
  is_demo       boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);
```

### 3.9 `interaction_checks`

Audit trail of every interaction check run (civilian and clinical).

```sql
CREATE TABLE interaction_checks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES profiles(id),
  medication_name text NOT NULL,
  checked_against jsonb NOT NULL,   -- array of existing medication names checked
  result          text NOT NULL,    -- 'clear' | 'low' | 'moderate' | 'critical'
  rules_triggered jsonb,            -- array of rule_keys that fired
  context         text NOT NULL DEFAULT 'civilian',  -- 'civilian' | 'clinical'
  created_at      timestamptz NOT NULL DEFAULT now()
);
```

### 3.10 `care_circle_members`

Links a Civilian_User to their Caregivers with permission level.

```sql
CREATE TABLE care_circle_members (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,  -- the Civilian_User
  caregiver_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  permission      text NOT NULL DEFAULT 'view',  -- 'view' | 'manage'
  status          text NOT NULL DEFAULT 'pending',  -- 'pending' | 'active' | 'revoked'
  invited_at      timestamptz NOT NULL DEFAULT now(),
  accepted_at     timestamptz,
  UNIQUE (owner_id, caregiver_id)
);
```

### 3.11 `patients`

Clinical patient records (distinct from auth users — patients are managed entities).

```sql
CREATE TABLE patients (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name       text NOT NULL,
  date_of_birth   date,
  room_number     text,
  ward            text,
  primary_diagnosis text,
  admission_date  date,
  discharge_date  date,
  status          text NOT NULL DEFAULT 'admitted',  -- 'admitted' | 'discharged' | 'outpatient'
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
```

### 3.12 `patient_assignments`

Links clinical staff (Nurse, Doctor, Pharmacist) to patients they are responsible for.

```sql
CREATE TABLE patient_assignments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id  uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role_name   text NOT NULL,   -- 'nurse' | 'doctor' | 'pharmacist'
  assigned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (patient_id, user_id)
);
```

### 3.13 `patient_medications`

Clinical medications prescribed to a patient.

```sql
CREATE TABLE patient_medications (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id        uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  prescribed_by     uuid NOT NULL REFERENCES profiles(id),  -- Doctor
  name              text NOT NULL,
  dose_amount       numeric NOT NULL,
  dose_unit         text NOT NULL,
  frequency         text NOT NULL,
  start_date        date NOT NULL,
  end_date          date,
  special_instructions text,
  status            text NOT NULL DEFAULT 'active',
  -- 'active' | 'on_hold' | 'pending_review' | 'approved' | 'discontinued'
  hold_reason       text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
```

### 3.14 `patient_medication_schedules`

Scheduled dose times for a clinical patient medication.

```sql
CREATE TABLE patient_medication_schedules (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_medication_id uuid NOT NULL REFERENCES patient_medications(id) ON DELETE CASCADE,
  scheduled_time        time NOT NULL,     -- e.g. '08:00:00'
  day_of_week           int[],             -- NULL = every day; [0..6] for specific days
  created_at            timestamptz NOT NULL DEFAULT now()
);
```

### 3.15 `patient_medication_administrations`

Records each administration event for a clinical patient medication. Used by the Patient Medication Tracker for bedside logging and clinical audit behavior.

```sql
CREATE TABLE patient_medication_administrations (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_medication_id uuid NOT NULL REFERENCES patient_medications(id) ON DELETE CASCADE,
  patient_id            uuid NOT NULL REFERENCES patients(id),
  administered_by       uuid NOT NULL REFERENCES profiles(id),   -- Nurse
  scheduled_at          timestamptz NOT NULL,
  administered_at       timestamptz,
  status                text NOT NULL,
  -- 'administered' | 'missed' | 'held' | 'skipped'
  hold_reason           text,
  notes                 text,
  source                text NOT NULL DEFAULT 'online',   -- 'online' | 'offline_sync'
  conflict_flag         boolean NOT NULL DEFAULT false,   -- set true on clinical sync conflict
  created_at            timestamptz NOT NULL DEFAULT now()
);
```

### 3.16 `clinical_alerts`

Interaction alerts for clinical patient medications. Separate from civilian `medication_alerts` because clinical alerts reference `patient_medications` rather than civilian `medications`.

```sql
CREATE TABLE clinical_alerts (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id                uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  patient_medication_id_a   uuid NOT NULL REFERENCES patient_medications(id),
  patient_medication_id_b   uuid NOT NULL REFERENCES patient_medications(id),
  severity                  text NOT NULL,   -- 'critical' | 'moderate' | 'low'
  rule_key                  text NOT NULL,   -- references interaction_rules.rule_key
  description               text NOT NULL,
  status                    text NOT NULL DEFAULT 'active',
  -- 'active' | 'acknowledged' | 'resolved'
  acknowledged_by           uuid REFERENCES profiles(id),
  acknowledged_at           timestamptz,
  created_at                timestamptz NOT NULL DEFAULT now()
);
```

### 3.17 `care_notes`

Clinical care notes written by Nurses and Doctors for patients.

```sql
CREATE TABLE care_notes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id  uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  author_id   uuid NOT NULL REFERENCES profiles(id),
  role_name   text NOT NULL,   -- 'nurse' | 'doctor'
  content     text NOT NULL,
  archived    boolean NOT NULL DEFAULT false,
  archived_by uuid REFERENCES profiles(id),
  archived_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
```

### 3.18 `clinical_reviews`

Pharmacist review queue entries for patient medications flagged for review.

```sql
CREATE TABLE clinical_reviews (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_medication_id uuid NOT NULL REFERENCES patient_medications(id) ON DELETE CASCADE,
  patient_id          uuid NOT NULL REFERENCES patients(id),
  requested_by        uuid NOT NULL REFERENCES profiles(id),
  reason              text NOT NULL,
  status              text NOT NULL DEFAULT 'pending',
  -- 'pending' | 'approved' | 'flagged_unsafe'
  reviewed_by         uuid REFERENCES profiles(id),
  reviewed_at         timestamptz,
  review_notes        text,
  created_at          timestamptz NOT NULL DEFAULT now()
);
```

### 3.19 `audit_logs`

Append-only audit trail. No UPDATE or DELETE is permitted via RLS.

```sql
CREATE TABLE audit_logs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id      uuid REFERENCES profiles(id),
  action        text NOT NULL,
  -- 'role_assigned' | 'role_revoked' | 'alert_acknowledged' | 'medication_approved'
  -- | 'medication_flagged' | 'care_note_archived' | 'discharge_generated'
  -- | 'sync_conflict_flagged' | 'demo_override_used'
  target_type   text,    -- 'user' | 'medication' | 'alert' | 'care_note' | 'patient'
  target_id     uuid,
  metadata      jsonb,   -- role changes: {old_role, new_role, affected_user_id}, etc.
  created_at    timestamptz NOT NULL DEFAULT now()
);
```

### 3.20 `notifications`

In-app notifications for missed doses, interaction alerts, caregiver events, and clinical team notifications.

```sql
CREATE TABLE notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type        text NOT NULL,
  -- 'missed_dose' | 'interaction_alert' | 'caregiver_alert' | 'clinical_team'
  -- | 'sync_conflict' | 'review_assigned' | 'medication_approved' | 'medication_flagged'
  title       text NOT NULL,
  message     text NOT NULL,
  status      text NOT NULL DEFAULT 'unread',   -- 'unread' | 'read' | 'dismissed'
  metadata    jsonb,   -- e.g. { medication_id, patient_id, alert_id }
  created_at  timestamptz NOT NULL DEFAULT now(),
  read_at     timestamptz
);
```

### 3.21 `notification_preferences`

Per-user notification configuration.

```sql
CREATE TABLE notification_preferences (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  reminder_minutes    int NOT NULL DEFAULT 30,   -- 15 | 30 | 60
  reminders_enabled   boolean NOT NULL DEFAULT true,
  missed_dose_alerts  boolean NOT NULL DEFAULT true,
  caregiver_alerts    boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
```

---

## 4. Row Level Security Policy Design

RLS policies use the helper function `auth.uid()` to identify the current user and join `user_roles` + `roles` to resolve the user's role name.

### 4.1 Helper Function

```sql
-- Returns the role name(s) for the current authenticated user
CREATE OR REPLACE FUNCTION current_user_roles()
RETURNS text[] AS $$
  SELECT array_agg(r.name)
  FROM user_roles ur
  JOIN roles r ON r.id = ur.role_id
  WHERE ur.user_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

### 4.2 Policy Summary by Table

**`profiles`**
- SELECT: user can read their own row; Admin can read all rows
- UPDATE: user can update their own row only
- INSERT/DELETE: handled by trigger on `auth.users`

**`user_roles`**
- SELECT: user can read their own rows; Admin can read all
- INSERT/UPDATE/DELETE: Admin only

**`medications`**
- SELECT: owner (`user_id = auth.uid()`) OR Caregiver with active `care_circle_members` record for that owner
- INSERT: Civilian_User for themselves; Caregiver only when `care_circle_members.permission = 'manage'`
- UPDATE: same as INSERT
- DELETE: owner only

**`medication_schedules`**
- Inherits access through `medication_id` join to `medications` — same policy as `medications`

**`medication_logs`**
- SELECT: owner or Caregiver with care circle access
- INSERT: owner or Caregiver with manage permission; `source` field set to `'offline_sync'` for synced records
- UPDATE: prohibited via RLS (logs are append-only)
- DELETE: prohibited

**`medication_alerts`**
- SELECT: owner or Caregiver with care circle access
- INSERT: server-side only (via service role in Server Actions)
- UPDATE: owner can acknowledge their own alerts
- DELETE: prohibited

**`interaction_rules`**
- SELECT: all authenticated users (rules are not sensitive — they are demo data)
- INSERT/UPDATE/DELETE: server-side only (via service role in migrations/seed)

**`interaction_checks`**
- SELECT: owner only
- INSERT: server-side only

**`care_circle_members`**
- SELECT: owner (`owner_id`) or caregiver (`caregiver_id`)
- INSERT: owner only (to invite)
- UPDATE: owner (to change permissions or revoke); caregiver (to accept invitation — set `status = 'active'`)
- DELETE: owner only

**`patients`**
- SELECT: Nurse, Doctor, Pharmacist, Admin can see all patients. **Demo note**: For the academic demo, seeded Nurse and Doctor accounts may view all seeded demo patients without a `patient_assignments` record. The `patient_assignments` table is still populated in seed data and represents the production-like access model — in a real deployment, the SELECT policy would be tightened to require an assignment record.
- INSERT/UPDATE: Nurse, Doctor, Admin
- DELETE: Admin only

**`patient_assignments`**
- SELECT: the assigned user themselves; Admin
- INSERT/DELETE: Admin, Doctor

**`patient_medications`**
- SELECT: clinical staff assigned to the patient; Pharmacist (all, for review queue); Admin
- INSERT: Doctor, Admin
- UPDATE: Doctor (prescriber), Pharmacist (status changes for review), Admin
- DELETE: prohibited (use `status = 'discontinued'`)

**`patient_medication_schedules`**
- Inherits access through `patient_medication_id` join to `patient_medications` — same policy as `patient_medications`

**`patient_medication_administrations`**
- SELECT: clinical staff assigned to the patient; Admin
- INSERT: Nurse (for assigned patients); `conflict_flag` set server-side on sync conflict
- UPDATE: prohibited via RLS (administration records are append-only; use a new record for corrections)
- DELETE: prohibited

**`clinical_alerts`**
- SELECT: clinical staff assigned to the patient; Pharmacist (all, for review queue); Admin
- INSERT: server-side only (via service role in Server Actions)
- UPDATE: clinical staff assigned to the patient can acknowledge; Admin

**`notifications`**
- SELECT: the recipient user (`user_id = auth.uid()`) only
- INSERT: server-side only (via service role)
- UPDATE: recipient user (to mark read/dismissed)
- DELETE: prohibited

**`care_notes`**
- SELECT: clinical staff assigned to the patient; Admin
- INSERT: Nurse, Doctor (for assigned patients)
- UPDATE: prohibited (notes are immutable)
- DELETE: prohibited; Admin can set `archived = true`

**`clinical_reviews`**
- SELECT: Pharmacist (all pending); the requesting user; Admin
- INSERT: Nurse, Doctor (to escalate)
- UPDATE: Pharmacist (to approve/flag); Admin

**`audit_logs`**
- SELECT: Admin only
- INSERT: server-side only (via service role)
- UPDATE: prohibited
- DELETE: prohibited

**`notification_preferences`**
- SELECT/UPDATE: owner only

---

## 5. Mock Medication Safety Engine

> ⚠️ **Academic Prototype — Demo Logic Only**: The interaction rules below are hardcoded mock rules for demonstration purposes. They do NOT represent real clinical pharmacology. This engine must NOT be used for real medical decision-making. Real deployment requires verified drug-interaction databases (e.g., DrugBank, RxNorm) and licensed clinical review.

### 5.1 Engine Location

`src/lib/interaction-engine.ts` — a pure TypeScript module with no external dependencies. All rules are seeded in the `interaction_rules` seed data and evaluated server-side in a Server Action.

### 5.2 Rule Data Structure

```typescript
type InteractionSeverity = 'critical' | 'moderate' | 'low';

interface MockInteractionRule {
  key: string;                    // unique rule identifier
  medicationA: string;            // normalized lowercase name
  medicationB: string;            // normalized lowercase name
  severity: InteractionSeverity;
  description: string;            // shown to user
  demoLabel: string;              // always "Demo/Academic Logic — Not Real Medical Advice"
}
```

### 5.3 Seeded Demo Rules

| Rule Key | Medication A | Medication B | Severity | Description |
|---|---|---|---|---|
| `warfarin_ibuprofen` | warfarin | ibuprofen | **critical** | Concurrent use of Warfarin and Ibuprofen significantly increases bleeding risk. (Demo logic only.) |
| `warfarin_aspirin` | warfarin | aspirin | **critical** | Warfarin combined with Aspirin increases anticoagulation and bleeding risk. (Demo logic only.) |
| `ssri_maoi` | any SSRI | any MAOI | **critical** | Combining SSRIs and MAOIs can cause serotonin syndrome. (Demo logic only.) |
| `duplicate_name` | any | same name | **moderate** | A medication with this name is already in your list. Possible duplicate. (Demo logic only.) |
| `allergy_penicillin` | penicillin | allergy flag | **critical** | Patient allergy flag detected for Penicillin-class medications. (Demo logic only.) |
| `metformin_contrast` | metformin | contrast dye | **moderate** | Metformin should be paused before contrast procedures. (Demo logic only.) |
| `statin_grapefruit` | any statin | grapefruit | **low** | Grapefruit may increase statin blood levels. (Demo logic only.) |

### 5.4 Adherence Risk Rule

Evaluated separately from interaction rules:

- **Trigger**: More than 2 missed doses within the past 7 days for any single medication
- **Result**: Adherence risk flag set on the medication; Adherence_Score recalculated
- **Display**: High-risk warning on Adherence Risk Dashboard

### 5.5 Evaluation Algorithm

```
function checkInteractions(newMedName, existingMeds, userAllergies):
  normalizedNew = normalize(newMedName)
  results = []

  for each rule in MOCK_RULES:
    if ruleMatches(rule, normalizedNew, existingMeds, userAllergies):
      results.push({ rule, severity: rule.severity })

  if results.isEmpty:
    return { result: 'clear' }
  
  highestSeverity = max(results.map(r => r.severity))
  
  if highestSeverity == 'critical':
    return { result: 'critical', rules: results }
  else:
    return { result: highestSeverity, rules: results }
```

### 5.6 Severity Routing

| Result | UI Behavior |
|---|---|
| `clear` | Save medication immediately, show confirmation |
| `low` or `moderate` | Show Safety Pre-Check view; user may cancel, remove, or save with caution after explicit confirmation |
| `critical` | Show Centered Danger Alert (civilian) or Clinical Danger Alert; medication NOT saved as active |

---

## 6. Component Architecture

All components live under `src/components/`. Shared UI primitives are in `src/components/ui/`. Feature-specific components are co-located with their route or in `src/components/features/`.

### 6.1 Layout Components

**`AppShell`** (`src/components/layout/AppShell.tsx`)
- Root layout wrapper for all authenticated views
- Renders `Sidebar` (desktop) or bottom nav (mobile) + `TopBar`
- Accepts `role` prop to conditionally render role-appropriate navigation items
- Manages `OfflineStateBanner` visibility via `navigator.onLine` listener

**`Sidebar`** (`src/components/layout/Sidebar.tsx`)
- Left-side navigation for desktop (≥ 1024px)
- Role-adaptive nav items derived from the role access matrix
- Highlights active route; collapses to icon-only mode at medium breakpoints
- Renders MedAware logo + tagline at top; user avatar + `RoleSwitcher` at bottom

**`TopBar`** (`src/components/layout/TopBar.tsx`)
- Top navigation bar showing current page title, alert badge count, and user menu
- Alert badge pulls unresolved critical alert count from server state
- Contains logout button and link to `/settings`

**`RoleSwitcher`** (`src/components/layout/RoleSwitcher.tsx`)
- Dropdown shown only when the authenticated user has multiple roles
- On selection, updates the active role in the session and redirects to the new role's landing view

**`OfflineStateBanner`** (`src/components/layout/OfflineStateBanner.tsx`)
- Sticky banner at the top of the viewport when `navigator.onLine === false`
- Shows "You are offline. Changes will sync when reconnected." with a sync status indicator
- Animates in/out with Framer Motion

### 6.2 Civilian Feature Components

**`MedicationCard`** (`src/components/features/civilian/MedicationCard.tsx`)
- Displays a single medication: name, dose, next scheduled time, status badge
- Shows interaction alert indicator if an active `medication_alert` exists
- Accepts `onMarkTaken` callback for dose logging
- Status badge colors: active = Success green, pending_review = Warning amber, inactive = muted gray

**`CountdownTimer`** (`src/components/features/civilian/CountdownTimer.tsx`)
- Client Component — uses `setInterval` to tick every second
- Displays `HH:MM:SS` countdown to next scheduled dose
- Clamps to `00:00:00` — never displays negative values (Property 1)
- On expiry, fires `onDoseTime` callback to trigger missed-dose logic

**`AdherenceRiskPanel`** (`src/components/features/civilian/AdherenceRiskPanel.tsx`)
- Displays Adherence_Score (0–100) as a circular progress ring
- Color-coded: ≥ 80 = Success, 50–79 = Warning, < 50 = Primary red
- Shows 7-day and 30-day dose history as a mini bar chart
- Displays risk category label and high-risk warning when score < 50

**`CareCirclePanel`** (`src/components/features/civilian/CareCirclePanel.tsx`)
- Lists current Care_Circle members with name, role, permission badge
- Invite form (email input + send button)
- Per-member permission toggle (view / manage) and remove button
- Pending invitations shown with status chip

**`InteractionTriagePanel`** (`src/components/features/civilian/InteractionTriagePanel.tsx`)
- Displays full interaction detail: conflicting medication names, severity badge, mock description
- Always shows disclaimer: "Demo/Academic Logic — Not Real Medical Advice"
- Action buttons: "Proceed with Caution" (moderate/low only), "Remove Medication", "Contact Health Professional"

**`WidgetMockup`** (`src/components/features/civilian/WidgetMockup.tsx`)
- Renders a static visual mockup of an iOS or Android widget
- Props: `platform` ('ios' | 'android'), `theme` ('light' | 'dark'), `medicationName`, `nextDoseTime`, `intakeNote`, `safetyStatus`
- Uses CSS to simulate the platform widget frame (rounded corners, shadow, platform font)
- Clearly labeled "Widget Preview — Not a real OS widget"

**`MobilePreview`** (`src/components/features/civilian/MobilePreview.tsx`)
- Wraps content in a phone-frame SVG for the widget mockup page
- Used only on the widget mockup page to simulate the home screen context

### 6.3 Clinical Feature Components

**`PatientCard`** (`src/components/features/clinical/PatientCard.tsx`)
- Displays patient name, room number, primary diagnosis, risk state badge, next medication action
- Risk state badge: safe = Success green, caution = Warning amber, critical = Primary red (pulsing animation)
- Clickable — navigates to `/clinical/patients/[id]`

**`AlertCard`** (`src/components/features/clinical/AlertCard.tsx`)
- Displays a single Interaction_Alert: patient name, room, conflicting medications, severity, time detected
- "Acknowledge" button triggers audit log entry
- Critical alerts have a red left border accent

**`AuditLogPanel`** (`src/components/features/admin/AuditLogPanel.tsx`)
- Paginated, filterable table of audit log entries
- Filters: user, action type, date range, role
- Export to CSV button
- Entries are read-only — no edit or delete controls rendered

### 6.4 Modal Components

**`CenteredDangerModal`** (`src/components/features/civilian/CenteredDangerModal.tsx`)
- Full-screen overlay with `pointer-events: all` — blocks all background interaction
- Heading: "DANGER ALERT" in Primary red, large bold
- Body: conflicting medication names + mock risk description
- Advisory: "Contact a health professional before continuing."
- Three buttons: "Contact Health Professional", "Remove Medication", "View Details"
- `onKeyDown` handler traps Escape key — modal cannot be dismissed without action
- `onClick` on backdrop does nothing — no dismiss on outside click
- Demo override link (small, muted): "Save anyway (demo override)" — saves medication as `status: 'pending_review'` and records `demo_override_used` in audit log

**`ClinicalDangerModal`** (`src/components/features/clinical/ClinicalDangerModal.tsx`)
- Same blocking behavior as `CenteredDangerModal`
- Heading: "DO NOT ADMINISTER" in Primary red
- Body: medication on hold explanation + conflicting medication names
- Three buttons: "Assign Review", "Notify Team", "Open Patient Record"
- "Assign Review" → adds to `clinical_reviews`, records in `audit_logs`
- "Notify Team" → creates in-app notification for assigned clinical staff
- No demo override — clinical alerts have no bypass

### 6.5 State Components

**`EmptyState`** (`src/components/ui/EmptyState.tsx`)
- Reusable empty state with icon, title, description, and optional CTA button
- Used when medication list is empty, patient board has no patients, queue is empty, etc.

**`LoadingState`** (`src/components/ui/LoadingState.tsx`)
- Skeleton loader matching the layout of the content being loaded
- Uses Tailwind `animate-pulse` with brand-colored shimmer

**`ErrorState`** (`src/components/ui/ErrorState.tsx`)
- Error boundary fallback with icon, message, and "Try again" button
- Logs error details to console in development

---

## 7. Phase-Based Implementation Design

### Phase 1 — MVP

**Goal**: A fully deployable application demonstrating the core civilian and clinical workflows.

**Included features:**
- Supabase Auth (email/password login, session management)
- Role selection flow (`/login` → `/role-select` → landing)
- Middleware-based route protection
- Civilian Medication Dashboard with countdown timer
- Guided Add Medication (multi-step form)
- Mock interaction engine (all seeded rules)
- Safety Pre-Check view (low/moderate interactions)
- Centered Danger Alert — Civilian (critical interactions)
- Interaction Detail and Triage view
- Hospital Patient Board
- Patient Medication Tracker (view + mark administered)
- Clinical Centered Danger Alert
- Admin Roles and Audit Logs view
- Seed data: 6 demo accounts, sample medications, sample patients, sample alerts, sample audit entries
- Vercel deployment with environment variable documentation
- README with setup instructions

**Out of scope for Phase 1:**
- Adherence Risk Dashboard (Phase 2)
- Care Circle (Phase 2)
- Pharmacist Review Queue (Phase 2)
- Outpatient Clinic Queue (Phase 2)
- Discharge Instructions (Phase 2)
- Mobile-specific views (Phase 2)
- Widget mockup pages (Phase 2)
- Offline sync (Phase 3)
- Supabase Realtime (Phase 3)
- Push notifications (Phase 3)
- PDF export (Phase 3)
- PWA (Phase 3)

### Phase 2 — Extended Features

**Goal**: Complete all 20 desktop views, 12 mobile views, and 4 widget mockups.

**Included features:**
- Adherence Risk Dashboard (`/adherence`) with score, history, 7-day/30-day trends
- Care Circle Sharing (`/care-circle`) — invite, permissions, revoke
- Caregiver shared dashboard view
- Pharmacist Review Queue (`/clinical/reviews`) — approve/flag medications
- Outpatient Clinic Queue (`/clinical/clinic`) — check-in flow
- Discharge Instructions (`/clinical/discharge/[id]`) — on-screen view
- Care Notes and Rounds (embedded in patient tracker)
- Mobile-responsive layouts for all 12 mobile views
- Widget mockup page with 4 designs (iOS light/dark, Android light/dark)
- Settings page — font size, high contrast, notification preferences
- Admin System Overview page

### Phase 3 — Advanced Features

**Goal**: Production-grade reliability and notification infrastructure.

**Included features:**
- Offline detection + `Offline_Queue` using `localStorage` or IndexedDB
- Sync-on-reconnect with conflict resolution (last-write-wins for civilian; manual review flag for clinical)
- Supabase Realtime subscriptions for live alert badge updates
- Push notification infrastructure (Web Push API or Supabase Edge Functions)
- PDF export for Discharge Instructions (using `@react-pdf/renderer` or Puppeteer)
- PWA manifest + service worker for installability

---

## 8. UI and Design System

### 8.1 Design Tokens

Defined in `tailwind.config.ts` under `theme.extend.colors`:

```typescript
colors: {
  brand: {
    primary:    '#FF3F4D',   // Primary red — CTAs, danger, brand
    coral:      '#FF6B74',   // Secondary coral — hover states, accents
    pink:       '#FFE8EC',   // Soft pink — alert backgrounds, highlights
    rose:       '#FFF6F7',   // Rose background — page sections
    bg:         '#F6F8FB',   // App background — main canvas
  },
  content: {
    DEFAULT:    '#101828',   // Primary text
    muted:      '#667085',   // Secondary/muted text
  },
  border: {
    DEFAULT:    '#E6EAF0',   // Default border color
  },
  status: {
    success:    '#12B76A',   // Safe, taken, approved
    warning:    '#F59E0B',   // Caution, moderate risk, pending
    info:       '#2E90FA',   // Informational, sync, notes
    danger:     '#FF3F4D',   // Critical alerts (same as brand.primary)
  }
}
```

### 8.2 Typography

- **Font**: Inter (Google Fonts via `next/font/google`)
- **Scale**: Tailwind default type scale
- **Weights**: 400 (body), 500 (labels), 600 (subheadings), 700 (headings, alert titles)
- **Font size settings**: Applied via CSS custom property `--font-size-base` set on `<html>` from user profile settings (default = 16px, large = 18px, xl = 20px)

### 8.3 Spacing and Radius

- **Spacing**: Tailwind default 4px base unit
- **Border radius**: `rounded-xl` (12px) for cards; `rounded-2xl` (16px) for modals; `rounded-full` for badges and avatars
- **Card shadow**: `shadow-sm` default; `shadow-md` on hover

### 8.4 Animation

All animations use Framer Motion:
- **Page transitions**: `AnimatePresence` with `opacity` + `y` slide (200ms ease-out)
- **Modal entrance**: scale from 0.95 + opacity (150ms spring)
- **Danger Alert entrance**: scale from 0.9 + opacity (200ms spring) — slightly slower for emphasis
- **Countdown timer**: digit flip animation on change
- **Risk badge pulse**: `animate-pulse` on critical risk state badges
- **Offline banner**: slide down from top (150ms ease-out)

### 8.5 Iconography

All icons from `lucide-react`. Key icon mappings:

| Concept | Icon |
|---|---|
| Medication | `Pill` |
| Alert / Danger | `AlertTriangle`, `ShieldAlert` |
| Countdown / Time | `Clock`, `Timer` |
| Adherence | `TrendingUp`, `BarChart2` |
| Care Circle | `Users` |
| Patient | `User`, `UserCheck` |
| Nurse/Doctor | `Stethoscope` |
| Pharmacist | `FlaskConical` |
| Admin | `ShieldCheck` |
| Audit Log | `ClipboardList` |
| Offline | `WifiOff` |
| Settings | `Settings` |
| Discharge | `FileText` |

### 8.6 Responsive Breakpoints

- **Mobile**: < 768px — single column, bottom navigation, full-screen modals
- **Tablet**: 768px–1023px — two-column layouts, collapsible sidebar
- **Desktop**: ≥ 1024px — full sidebar, multi-column dashboards

---

## 9. Testing Strategy

Tests are mapped directly to the Correctness Properties defined in requirements.md.

### 9.1 Test Stack

- **Unit / Property tests**: Vitest + `fast-check` (property-based testing)
- **Component tests**: React Testing Library + Vitest
- **Integration tests**: Vitest with Supabase local emulator
- **E2E tests**: Playwright (Phase 2+)

### 9.2 Property-to-Test Mapping

**Property 1 — Countdown Timer Non-Negativity**
- PBT: Generate arbitrary `scheduledAt` timestamps (past and future). Assert `computeCountdown(scheduledAt) >= 0` for all inputs.
- Unit: Test `computeCountdown` with a past timestamp returns `0`, not a negative number.

**Property 2 — Medication Data Round-Trip**
- PBT: Generate arbitrary medication objects (name, dose, unit, schedule, notes). Insert via Server Action. Fetch back. Assert deep equality.
- Integration: Run against Supabase local emulator.

**Property 3 — Adherence Score Monotonicity**
- PBT: Generate arbitrary dose history arrays. Compute score. Append a `missed` dose. Assert `score(history + [missed]) <= score(history)`.
- Unit: Test `computeAdherenceScore` with known sequences.

**Property 4 — Interaction Alert Completeness**
- PBT: Generate pairs of medication names. For each pair matching a mock rule, assert an alert is returned by `checkInteractions`.
- Unit: Test each seeded rule fires correctly for its trigger medications.

**Property 5 — Audit Log Append-Only Invariant**
- Integration: Perform a sequence of auditable actions. Assert `audit_logs` count only increases. Attempt DELETE via RLS — assert it is rejected.
- PBT: Generate sequences of N actions. Assert `|log| == N` after all actions.

**Property 6 — Idempotent Offline Sync**
- PBT: Generate arbitrary offline action queues. Sync once. Record server state. Sync same queue again. Assert server state is identical (no duplicates).
- Unit: Test `syncOfflineQueue` with a queue containing duplicate entries.

**Property 7 — Review Queue Membership Exclusivity**
- Integration: Add medication to review queue. Approve it. Assert it no longer appears in `clinical_reviews` with `status = 'pending'`.
- PBT: Generate sequences of approve/flag actions. Assert no medication appears in both approved state and pending queue simultaneously.

**Property 8 — Widget Data Consistency**
- Unit: Assert `WidgetMockup` receives the same `nextDoseTime` and `medicationName` as the `CountdownTimer` on the dashboard for the same user state.
- Integration: Fetch dashboard data and widget data for the same user. Assert equality of next-dose fields.

**Property 9 — Role Access Exclusivity**
- PBT: For each role × route combination outside the permitted set, assert middleware returns a redirect to `/unauthorized`.
- Integration: Test each forbidden route for each role using Supabase test client with role-specific session.

**Property 10 — Discharge Instructions Completeness**
- PBT: Generate patients with N active medications (N ≥ 1). Generate discharge instructions. Assert all N medications appear in the output.
- Unit: Test `generateDischargeInstructions` with known patient medication sets.

---

## 10. Deployment Plan

### 10.1 Environment Variables

All environment variables are defined in `.env.local` for development and set in Vercel project settings for production. `.env.example` contains placeholder names only — no real values.

```bash
# .env.example

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key   # server-side only, never exposed to client

# App
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app

# Optional (Phase 3)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
```

### 10.2 Supabase Project Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Copy the project URL and anon key to `.env.local`
3. Run the migration file: `supabase db push` or paste `supabase/migrations/001_initial_schema.sql` into the Supabase SQL editor
4. Run the seed file: paste `supabase/seed.sql` into the SQL editor
5. Enable Email Auth in Supabase Auth settings (disable email confirmation for demo accounts)

### 10.3 Seed Data

`supabase/seed.sql` creates:

**Demo accounts** (all with password `MedAware2024!` — documented in README):

| Email | Role |
|---|---|
| `civilian@medaware.demo` | Civilian_User |
| `caregiver@medaware.demo` | Caregiver |
| `nurse@medaware.demo` | Nurse |
| `doctor@medaware.demo` | Doctor |
| `pharmacist@medaware.demo` | Pharmacist |
| `admin@medaware.demo` | Admin |

**Sample data includes:**
- 3 medications for the civilian demo account (including one Warfarin + Ibuprofen pair to trigger the critical interaction demo)
- Medication schedules for the next 7 days
- 5 sample patients with room numbers, diagnoses, and risk states
- Patient assignments linking nurse/doctor demo accounts to patients
- 3 patient medications (one on hold for pharmacist review demo)
- 2 active clinical alerts
- 5 care notes
- 1 pending clinical review
- 10 audit log entries covering role assignments, alert acknowledgements, and medication approvals

### 10.4 Vercel Deployment

1. Push the repository to GitHub
2. Import the repository in Vercel
3. Set all environment variables in Vercel project settings (Settings → Environment Variables)
4. Deploy — Vercel auto-detects Next.js and configures the build
5. Set the production domain in Supabase Auth → URL Configuration → Site URL

### 10.5 README Requirements

The README must include:

1. **Project overview** — what MedAware is, the academic disclaimer, and the Figma prototype link
2. **Tech stack** — Next.js, TypeScript, Tailwind CSS, Framer Motion, Lucide React, Supabase, Vercel
3. **Prerequisites** — Node.js ≥ 18, a Supabase account, a Vercel account
4. **Local setup** — clone, `npm install`, copy `.env.example` to `.env.local`, fill in Supabase credentials, run migrations, run seed, `npm run dev`
5. **Demo accounts** — table of all 6 email/password pairs with role descriptions
6. **Deployment** — step-by-step Vercel deployment instructions
7. **Medical safety disclaimer** — prominent section stating this is an academic prototype using mock interaction logic only
8. **Project structure** — annotated directory tree
9. **Phase roadmap** — brief description of Phase 1/2/3 scope

---
