# Implementation Plan: MedAware

## Overview

MedAware is a medication safety and management platform with civilian, caregiver, clinical, and admin roles. This plan covers all implementation tasks across three phases: Phase 1 MVP (Tasks 1–19), Phase 2 Extended Features (Tasks 20–37), and Phase 3 Advanced Features (Tasks 38–43). All medication interaction logic is mock/demo only and does not constitute real medical advice.

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": [1] },
    { "wave": 2, "tasks": [2] },
    { "wave": 3, "tasks": [3] },
    { "wave": 4, "tasks": [4] },
    { "wave": 5, "tasks": [5] },
    { "wave": 6, "tasks": [6, 7, 8] },
    { "wave": 7, "tasks": [9, 15, 18] },
    { "wave": 8, "tasks": [10, 16, 19] },
    { "wave": 9, "tasks": [11] },
    { "wave": 10, "tasks": [12, 13, 14, 17] },
    { "wave": 11, "tasks": [20, 21, 23, 24, 25, 26, 27, 28, 29, 30, 31] },
    { "wave": 12, "tasks": [22] },
    { "wave": 13, "tasks": [32, 33, 34, 35, 36, 37] },
    { "wave": 14, "tasks": [38, 39, 40, 41, 42, 43] }
  ]
}
```

## Tasks

- [-] 1. Project Scaffolding and Tooling Setup
  - Description: Initialize the Next.js App Router project with all required dependencies, configuration files, and folder structure.
  - [ ] `npx create-next-app@latest` with TypeScript, Tailwind CSS, App Router, and `src/` directory
  - [ ] Install dependencies: `@supabase/ssr`, `@supabase/supabase-js`, `framer-motion`, `lucide-react`, `fast-check`, `vitest`, `@testing-library/react`, `@testing-library/user-event`
  - [ ] Configure `tailwind.config.ts` with MedAware design tokens (all brand, content, border, status colors)
  - [ ] Create `.env.example` with placeholder variable names only (no real values)
  - [ ] Create `src/lib/supabase/client.ts` (browser client) and `src/lib/supabase/server.ts` (server client)
  - [ ] Create folder structure: `src/components/layout/`, `src/components/ui/`, `src/components/features/civilian/`, `src/components/features/clinical/`, `src/components/features/admin/`, `src/lib/`, `src/types/`, `supabase/migrations/`, `supabase/`
  - [ ] Configure `vitest.config.ts` with jsdom environment and path aliases
  - [ ] Verify `npm run dev` starts without errors
  - [ ] Verify `npm run build` completes without errors
  - References: Design §1.2, §8.1, §10.1

- [ ] 2. Database Schema Migration
  - Description: Write the complete Supabase PostgreSQL migration creating all 21 tables with constraints and indexes.
  - [ ] Create `supabase/migrations/001_initial_schema.sql`
  - [ ] All 22 tables created: `profiles`, `roles`, `user_roles`, `medications`, `medication_schedules`, `medication_logs`, `medication_alerts`, `interaction_rules`, `interaction_checks`, `care_circle_members`, `patients`, `patient_assignments`, `patient_medications`, `patient_medication_schedules`, `patient_medication_administrations`, `clinical_alerts`, `care_notes`, `clinical_reviews`, `audit_logs`, `notifications`, `notification_preferences`, `outpatient_appointments`
- [ ] `outpatient_appointments` table created with columns: `id uuid PK DEFAULT gen_random_uuid()`, `patient_id uuid NOT NULL FK → patients(id) ON DELETE CASCADE`, `appointment_time timestamptz NOT NULL`, `reason_for_visit text NOT NULL`, `status text NOT NULL DEFAULT 'scheduled'` (`'scheduled'` | `'arrived'` | `'completed'` | `'cancelled'`), `created_at timestamptz NOT NULL DEFAULT now()`, `updated_at timestamptz NOT NULL DEFAULT now()`
- [ ] Index added on `outpatient_appointments(appointment_time, status)` for efficient daily queue queries
  - [ ] `profiles` table has trigger on `auth.users` INSERT to auto-create profile row
  - [ ] `audit_logs` table has no UPDATE or DELETE grants in schema (enforced at RLS level)
  - [ ] All foreign key constraints defined with appropriate ON DELETE behavior
  - [ ] `updated_at` columns have trigger to auto-update on row change
  - [ ] Migration runs cleanly against a fresh Supabase project via SQL editor
  - [ ] `current_user_roles()` helper function created
  - [ ] Explicit indexes created: `CREATE INDEX ON medications(user_id)`, `CREATE INDEX ON medication_logs(user_id)`, `CREATE INDEX ON medication_alerts(user_id, status)`, `CREATE INDEX ON patient_medications(patient_id)`, `CREATE INDEX ON clinical_alerts(patient_id, status)`, `CREATE INDEX ON clinical_reviews(status)`, `CREATE INDEX ON audit_logs(created_at DESC)`, `CREATE INDEX ON notifications(user_id, status)`
  - References: Design §3, §4.1

- [ ] 3. Row Level Security Policies
  - Description: Implement all RLS policies for all 21 tables as defined in the design.
  - [ ] Create `supabase/migrations/002_rls_policies.sql`
  - [ ] RLS enabled on all 21 tables (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`)
  - [ ] `profiles`: owner SELECT/UPDATE; Admin SELECT all
  - [ ] `user_roles`: owner SELECT; Admin full access
  - [ ] `medications`: owner + Caregiver (with care circle) SELECT; owner + Caregiver (manage) INSERT/UPDATE; owner DELETE
  - [ ] `medication_schedules`: inherits via `medication_id` join
  - [ ] `medication_logs`: owner + Caregiver SELECT; owner + Caregiver (manage) INSERT; no UPDATE/DELETE
  - [ ] `medication_alerts`: owner + Caregiver SELECT; server-side INSERT; owner UPDATE (acknowledge); no DELETE
  - [ ] `interaction_rules`: all authenticated SELECT; server-side only INSERT/UPDATE/DELETE
  - [ ] `interaction_checks`: owner SELECT; server-side INSERT
  - [ ] `care_circle_members`: owner + caregiver SELECT; owner INSERT/DELETE; owner + caregiver UPDATE
  - [ ] `patients`: all clinical roles SELECT (demo: all patients visible); Nurse/Doctor/Admin INSERT/UPDATE; Admin DELETE
  - [ ] `patient_assignments`: assigned user + Admin SELECT; Admin/Doctor INSERT/DELETE
  - [ ] `patient_medications`: clinical staff SELECT; Doctor/Admin INSERT; Doctor/Pharmacist/Admin UPDATE; no DELETE
  - [ ] `patient_medication_schedules`: inherits via `patient_medication_id` join
  - [ ] `patient_medication_administrations`: clinical staff SELECT; Nurse INSERT; no UPDATE/DELETE
  - [ ] `clinical_alerts`: clinical staff SELECT; server-side INSERT; clinical staff UPDATE (acknowledge)
  - [ ] `care_notes`: clinical staff SELECT; Nurse/Doctor INSERT; no UPDATE; Admin can set `archived = true`
  - [ ] `clinical_reviews`: Pharmacist + requester + Admin SELECT; Nurse/Doctor INSERT; Pharmacist/Admin UPDATE
  - [ ] `audit_logs`: Admin SELECT; server-side INSERT; no UPDATE/DELETE
  - [ ] `notifications`: owner SELECT/UPDATE; server-side INSERT; no DELETE
  - [ ] `notification_preferences`: owner SELECT/UPDATE
  - [ ] `outpatient_appointments`: Nurse/Doctor/Admin SELECT all; Nurse/Doctor/Admin UPDATE (appointment status); Admin INSERT/DELETE (for demo and admin management)
  - [ ] Property 9 (Role Access Exclusivity) verified: test that a civilian session cannot SELECT from `patients`
  - References: Design §4, Requirements §2, §38

- [ ] 4. Seed Data
  - Description: Create seed data for all 6 demo accounts, sample clinical and civilian data, and interaction rules. Demo user creation uses the Supabase Admin API (via a Node.js seed script) rather than direct SQL insertion into `auth.users`, which is unsafe and unsupported in hosted Supabase.
  - [ ] Create `supabase/seed-users.ts` — a Node.js script using `@supabase/supabase-js` with the service role key to call `supabase.auth.admin.createUser()` for each demo account
  - [ ] Script creates 6 demo accounts: `civilian@medaware.demo`, `caregiver@medaware.demo`, `nurse@medaware.demo`, `doctor@medaware.demo`, `pharmacist@medaware.demo`, `admin@medaware.demo`
  - [ ] Each account created with `email_confirm: true` (skip email confirmation for demo)
  - [ ] Demo passwords documented in `README.md` only — NOT in `.env.example` or committed secrets
  - [ ] Create `supabase/seed.sql` for all non-auth seed data (runs after `seed-users.ts`): all 6 role types in `roles` table; each demo account assigned correct role in `user_roles` (using email lookup to resolve UUIDs); 7 interaction rules in `interaction_rules` (all `is_demo = true`); 3 civilian medications for `civilian@medaware.demo` including Warfarin + Ibuprofen pair; medication schedules for the next 7 days; 1 active `medication_alert` (critical) for the Warfarin + Ibuprofen pair; 5 sample patients with room numbers, diagnoses, and risk states; `patient_assignments` linking nurse and doctor demo accounts to patients; 3 `patient_medications` (one `status = 'on_hold'` for pharmacist review demo); `patient_medication_schedules` for each patient medication; 2 active `clinical_alerts`; 1 pending `clinical_reviews` entry; 5 `care_notes`; 10 `audit_logs` entries; `notification_preferences` row for each demo account; 3 sample `outpatient_appointments` for today's date linked to seeded patients with distinct `reason_for_visit` values and `status = 'scheduled'`
  - [ ] `README.md` documents the two-step seed process: run `seed-users.ts` first, then apply `seed.sql`
  - [ ] Seed runs cleanly after migrations with no FK violations
  - References: Design §10.3, Requirements §43

- [ ] 5. Authentication Middleware and Session Management
  - Description: Implement Next.js middleware for session validation and route protection, plus Supabase Auth helpers.
  - [ ] Create `middleware.ts` at project root using `@supabase/ssr` `createServerClient`
  - [ ] Middleware runs on all routes except `/_next/`, `/favicon.ico`, and static assets
  - [ ] If authenticated user visits `/login` → redirect to role landing view
  - [ ] If unauthenticated user visits any protected route → redirect to `/login`
  - [ ] If authenticated user with multiple roles has no active role in session → redirect to `/role-select`
  - [ ] If authenticated user visits a route outside their role's permitted set → redirect to `/unauthorized`
  - [ ] Session cookie refreshed on every request (Supabase SSR pattern)
  - [ ] Create `src/lib/auth/get-session.ts` — server-side session + role resolver
  - [ ] Create `src/lib/auth/role-permissions.ts` — route permission map for all 17 routes
  - [ ] Property 9 test: write Vitest integration test asserting each forbidden role/route combination redirects to `/unauthorized`
  - References: Design §1.2, §2.3, Requirements §1, §2, §42

- [ ] 6. Login Page (/login)
  - Description: Build the login page with email/password form, medical disclaimer, and MedAware branding.
  - [ ] Route: `app/(auth)/login/page.tsx`
  - [ ] MedAware logo, app name, and tagline "Your health. On time." displayed
  - [ ] Medical safety disclaimer displayed prominently: "⚠️ Academic Prototype — This application uses mock/demo medication interaction rules only..."
  - [ ] Email and password fields with accessible labels and ARIA attributes
  - [ ] "Sign In" button submits via Server Action calling `supabase.auth.signInWithPassword()`
  - [ ] Inline error message displayed on invalid credentials (no Session created)
  - [ ] On success: redirect to `/role-select` if multiple roles, else redirect to role landing view
  - [ ] Loading state on submit button during auth request
  - [ ] Full keyboard navigation (Tab order, Enter to submit)
  - [ ] WCAG 2.1 AA color contrast on all text and interactive elements
  - [ ] Framer Motion fade-in on page load
  - References: Design §2.2, Requirements §1, §35.4, §39.6

- [ ] 7. Role Selection Page (/role-select)
  - Description: Build the role selection step shown only when a user has multiple assigned roles.
  - [ ] Route: `app/(auth)/role-select/page.tsx`
  - [ ] Only accessible to authenticated users with 2+ roles; single-role users are redirected away by middleware
  - [ ] Displays all roles assigned to the current user as selectable cards with role name and description
  - [ ] On role selection: stores active role in session cookie and redirects to role landing view
  - [ ] `RoleSwitcher` component also uses this logic for mid-session role switching
  - [ ] Accessible: role cards are keyboard-navigable and have ARIA roles
  - References: Design §2.2, §2.4, Requirements §1.5

- [ ] 8. AppShell, Sidebar, TopBar, and Navigation
  - Description: Build the authenticated layout shell with role-adaptive navigation.
  - [ ] `AppShell` (`src/components/layout/AppShell.tsx`) wraps all authenticated pages
  - [ ] `Sidebar` renders on desktop (≥ 1024px) with role-appropriate nav items derived from the route permission map
  - [ ] Sidebar collapses to icon-only at tablet breakpoint (768–1023px)
  - [ ] Bottom navigation bar renders on mobile (< 768px) with top 4 role-appropriate routes
  - [ ] `TopBar` shows current page title, unresolved critical alert badge count, and user menu (logout + settings link)
  - [ ] `RoleSwitcher` dropdown shown in sidebar footer only when user has multiple roles
  - [ ] `OfflineStateBanner` (`src/components/layout/OfflineStateBanner.tsx`) listens to `navigator.onLine` and slides in/out with Framer Motion
  - [ ] Active route highlighted in sidebar
  - [ ] MedAware logo and tagline in sidebar header
  - [ ] All nav items have ARIA labels and keyboard focus styles
  - [ ] Logout action calls `supabase.auth.signOut()` and redirects to `/login`
  - References: Design §6.1, Requirements §11.1

- [ ] 9. Civilian Medication Dashboard (/dashboard)
  - Description: Build the civilian landing view with countdown timer, medication list, adherence score, and alert indicator.
  - [ ] Route: `app/(app)/dashboard/page.tsx` (Server Component for data fetch + Client Component for timer)
  - [ ] `CountdownTimer` Client Component ticks every second, clamps to `00:00:00` (never negative — Property 1)
  - [ ] Next scheduled dose: medication name, dose amount, scheduled time, and procedure notes displayed
  - [ ] Current `Adherence_Score` displayed (computed from `medication_logs`)
  - [ ] Safety alert indicator shown when active `medication_alerts` exist for the user
  - [ ] Full medication list rendered as `MedicationCard` components
  - [ ] Each `MedicationCard` shows: name, dose, next scheduled time, status badge, interaction alert indicator
  - [ ] "Mark as Taken" button on each card triggers Server Action to insert `medication_log` row
  - [ ] When dose time passes without marking taken, `Adherence_Score` recalculates (server-side cron or on-load check)
  - [ ] `EmptyState` shown when no medications exist, with CTA to `/medications/new`
  - [ ] `LoadingState` skeleton shown during data fetch
  - [ ] Framer Motion stagger animation on medication card list
  - References: Design §6.2, Requirements §3, Property 1

- [ ] 10. Guided Add Medication Form (/medications/new)
  - Description: Build the multi-step guided form for adding a new medication with validation. Phase 1 scope covers Civilian User only. Caregiver add/edit behavior is implemented in Task 22 after Care Circle permissions are established.
  - [ ] Route: `app/(app)/medications/new/page.tsx`
  - [ ] Multi-step form: Step 1 (name, dose amount, dose unit), Step 2 (frequency, scheduled times, start date, end date), Step 3 (procedure notes, review)
  - [ ] Step progression blocked if required fields are empty — field-level validation errors displayed inline
  - [ ] Step indicator shows current step and total steps
  - [ ] "Back" button returns to previous step without losing data
  - [ ] On final step submit: Server Action triggers interaction check before saving
  - [ ] On successful save (no interactions): insert `medications` + `medication_schedules` rows with `user_id = auth.uid()`, show confirmation toast, redirect to `/dashboard`
  - [ ] Property 2 test: write Vitest test asserting saved medication data equals submitted data on retrieval
  - [ ] Phase 1 only: form submits for the authenticated Civilian User's own account; Caregiver submission on behalf of a Care Circle member is out of scope until Task 22
  - [ ] Full keyboard navigation; all inputs have accessible labels
  - References: Design §6.2, Requirements §4, Property 2

- [ ] 11. Mock Interaction Engine
  - Description: Implement the server-side mock interaction checking engine as a pure TypeScript module.
  - [ ] Create `src/lib/interaction-engine.ts`
  - [ ] `checkInteractions(newMedName, existingMeds, patientAllergies?)` function — pure, no side effects
  - [ ] Loads rules from `interaction_rules` table (fetched server-side, cached per request)
  - [ ] Normalizes medication names to lowercase before comparison
  - [ ] Returns `{ result: 'clear' | 'low' | 'moderate' | 'critical', rules: MatchedRule[] }`
  - [ ] All 7 seeded rules evaluated correctly
  - [ ] Duplicate name detection (same normalized name = moderate)
  - [ ] Adherence risk check: `computeAdherenceRisk(logs)` returns flag when > 2 missed doses in 7 days
  - [ ] `computeAdherenceScore(logs)` returns integer 0–100; Property 3 test: adding a missed dose never increases score
  - [ ] Property 4 test: for each seeded rule pair, `checkInteractions` returns the correct severity
  - [ ] All functions exported and unit-tested with Vitest
  - [ ] Module has no imports from Next.js or React — pure TypeScript only
  - References: Design §5, Requirements §5, Properties 3, 4

- [ ] 12. Safety Pre-Check View
  - Description: Build the Safety Pre-Check view shown when low or moderate interactions are detected.
  - [ ] Rendered as a step within the Add Medication flow (not a separate route) when `result` is `'low'` or `'moderate'`
  - [ ] Lists each detected interaction with: conflicting medication names, severity badge, mock description
  - [ ] Disclaimer displayed prominently: "Demo/Academic Logic — Not Real Medical Advice"
  - [ ] Three action buttons: "Cancel" (discard new medication), "Remove Medication" (same as cancel), "Save with Caution" (requires explicit confirmation checkbox before enabling)
  - [ ] "Save with Caution" inserts medication with `status = 'active'` and records interaction check in `interaction_checks`
  - [ ] Severity badge colors: low = Info blue, moderate = Warning amber
  - References: Design §5.6, Requirements §5.3, §5.7

- [ ] 13. Civilian Centered Danger Modal
  - Description: Build the `CenteredDangerModal` component shown when a critical interaction is detected.
  - [ ] `CenteredDangerModal` (`src/components/features/civilian/CenteredDangerModal.tsx`) — Client Component
  - [ ] Full-screen overlay with `pointer-events: all`; backdrop click does nothing
  - [ ] Escape key trapped — modal cannot be dismissed without selecting an action
  - [ ] Heading: "DANGER ALERT" in `brand.primary` (#FF3F4D), large bold
  - [ ] Body: conflicting medication names + mock risk description
  - [ ] Advisory text: "Contact a health professional before continuing."
  - [ ] Three action buttons: "Contact Health Professional", "Remove Medication", "View Details"
  - [ ] "Remove Medication": Server Action discards the pending/newly added medication that has not yet been saved as active — it does NOT delete any existing active medication. Dismisses modal and redirects to `/dashboard`.
  - [ ] "View Details": navigates to `/interactions` with interaction data passed via URL params or session
  - [ ] "Contact Health Professional": shows contact guidance panel within modal; medication NOT saved
  - [ ] Demo override link (small, muted text below buttons): "Save anyway (demo override)" — saves medication as `status: 'pending_review'`, records `demo_override_used` in `audit_logs`, keeps Danger_Alert active
  - [ ] Medication is NOT saved as active unless demo override is explicitly chosen (Requirement 6.10)
  - [ ] Framer Motion spring entrance animation
  - [ ] ARIA `role="alertdialog"`, `aria-modal="true"`, focus trapped inside modal
  - References: Design §6.4, Requirements §6, §35

- [ ] 14. Interaction Detail and Triage View (/interactions)
  - Description: Build the full interaction detail view with triage options.
  - [ ] Route: `app/(app)/interactions/page.tsx`
  - [ ] Displays: conflicting medication names, severity badge, mock interaction description
  - [ ] Disclaimer: "This is demo/academic logic — not real medical advice."
  - [ ] Triage action buttons: "Proceed with Caution" (moderate/low only), "Remove Medication", "Contact Health Professional"
  - [ ] "Remove Medication": Server Action discards the pending/newly added medication that triggered the interaction check — it does NOT delete any existing active medication from the user's list. Redirects to `/dashboard`.
  - [ ] "Proceed with Caution": only available for non-critical severity; saves medication with `status = 'active'`
  - [ ] Accessible: all buttons have ARIA labels; severity badge has `role="status"`
  - References: Requirements §7

- [ ] 15. Hospital Patient Board (/clinical/patients)
  - Description: Build the clinical landing view showing all patients with risk states.
  - [ ] Route: `app/(clinical)/clinical/patients/page.tsx` (Server Component)
  - [ ] Fetches all patients visible to the current clinical user (all patients for demo; `patient_assignments` used in production RLS)
  - [ ] Renders `PatientCard` for each patient: name, room number, primary diagnosis, risk state badge, next medication action
  - [ ] Risk state computed server-side: `critical` if active `clinical_alerts` exist; `caution` if any `patient_medications` are `on_hold`; `safe` otherwise
  - [ ] Critical risk badge pulses with `animate-pulse`
  - [ ] Sortable by room number, risk state, and next medication time (client-side sort)
  - [ ] Clicking a `PatientCard` navigates to `/clinical/patients/[id]`
  - [ ] `EmptyState` shown when no patients
  - [ ] `LoadingState` skeleton during fetch
  - References: Design §6.3, Requirements §12

- [ ] 16. Patient Medication Tracker (/clinical/patients/[id])
  - Description: Build the per-patient medication tracker with administration logging.
  - [ ] Route: `app/(clinical)/clinical/patients/[id]/page.tsx`
  - [ ] Fetches patient details, all `patient_medications`, `patient_medication_schedules`, and 7-day `patient_medication_administrations`
  - [ ] Displays for each medication: name, dose, frequency, scheduled times, last administered time, next scheduled time
  - [ ] 7-day administration history shown per medication (taken/missed/held/skipped)
  - [ ] "Mark Administered" button: Server Action inserts `patient_medication_administrations` row with `administered_by = auth.uid()` and timestamp
  - [ ] If medication has active `clinical_alerts` entry: prominent warning badge shown; "Mark Administered" button disabled (Requirement 15.10)
  - [ ] Medications with `status = 'on_hold'` or `'pending_review'` show hold badge; "Mark Administered" disabled
  - [ ] Property 2 test: patient medication data round-trip correctness
  - [ ] Accessible: all action buttons have ARIA labels
  - References: Design §6.3, Requirements §14, §15.10, Property 2

- [ ] 17. Clinical Centered Danger Modal
  - Description: Build the `ClinicalDangerModal` component for clinical critical interaction alerts.
  - [ ] `ClinicalDangerModal` (`src/components/features/clinical/ClinicalDangerModal.tsx`) — Client Component
  - [ ] Same blocking behavior as `CenteredDangerModal` (no backdrop dismiss, Escape trapped)
  - [ ] Heading: "DO NOT ADMINISTER" in `brand.primary`
  - [ ] Body: medication on hold explanation + conflicting medication names from `clinical_alerts`
  - [ ] Three action buttons: "Assign Review", "Notify Team", "Open Patient Record"
  - [ ] "Assign Review": Server Action inserts `clinical_reviews` row, sets `patient_medications.status = 'pending_review'`, records in `audit_logs`
  - [ ] "Notify Team": Server Action inserts `notifications` rows for all clinical staff assigned to the patient
  - [ ] "Open Patient Record": navigates to `/clinical/patients/[id]`
  - [ ] No demo override — clinical alerts have no bypass
  - [ ] ARIA `role="alertdialog"`, `aria-modal="true"`, focus trapped
  - References: Design §6.4, Requirements §15

- [ ] 18. Admin Roles and Audit Log (/admin)
  - Description: Build the admin view with user role management and paginated audit log.
  - [ ] Route: `app/(admin)/admin/page.tsx`
  - [ ] User list with current role badges; "Change Role" and "Revoke Role" actions per user
  - [ ] Role change: Server Action updates `user_roles`, inserts `audit_logs` entry with `{old_role, new_role, affected_user_id}`
  - [ ] `AuditLogPanel` component: paginated table (20 rows/page), sorted by `created_at` DESC
  - [ ] Filters: user (search), action type (dropdown), date range (date pickers), role (dropdown)
  - [ ] "Export CSV" button: generates and downloads CSV of filtered audit log
  - [ ] Audit log entries are read-only — no edit or delete controls
  - [ ] Property 5 test: write Vitest integration test asserting `audit_logs` count only increases; DELETE attempt returns RLS error
  - [ ] Accessible: table has proper `<thead>`, `<th scope>`, and ARIA sort attributes
  - References: Design §6.3, Requirements §20, Property 5

- [ ] 19. README, Environment Guide, and Vercel Deployment
  - Description: Write the README, deployment documentation, and verify Vercel deployment.
  - [ ] `README.md` includes: project overview, academic disclaimer, Figma prototype link, tech stack, prerequisites, local setup steps, demo accounts table (all 6 roles with email + password `MedAware2024!`), Vercel deployment steps, medical safety disclaimer section, annotated project structure, Phase 1/2/3 roadmap
  - [ ] `.env.example` contains only placeholder variable names — no real passwords or secrets
  - [ ] `supabase/migrations/` contains `001_initial_schema.sql` and `002_rls_policies.sql`
  - [ ] `supabase/seed.sql` runs cleanly after migrations
  - [ ] Application deploys to Vercel without build errors
  - [ ] All 6 demo accounts can log in on the deployed URL
  - [ ] Civilian demo account lands on `/dashboard`
  - [ ] Nurse/Doctor demo accounts land on `/clinical/patients`
  - [ ] Pharmacist demo account lands on `/clinical/reviews`
  - [ ] Admin demo account lands on `/admin`
  - References: Design §10, Requirements §40, §43

- [ ] 20. Adherence Risk Dashboard (/adherence)
  - Description: Build the adherence risk view with score, dose history, and trend charts.
  - [ ] Route: `app/(app)/adherence/page.tsx`
  - [ ] `AdherenceRiskPanel` displays Adherence_Score (0–100) as circular progress ring
  - [ ] Score color: ≥ 80 = Success green, 50–79 = Warning amber, < 50 = Primary red
  - [ ] Risk category label: "Low Risk", "Moderate Risk", "High Risk"
  - [ ] High-risk warning banner when score < 50
  - [ ] 7-day dose history bar chart (taken = green, missed = red, upcoming = muted)
  - [ ] 30-day trend line chart
  - [ ] Property 3 test: Vitest PBT asserting `computeAdherenceScore(history + [missed]) <= computeAdherenceScore(history)` for arbitrary histories
  - References: Requirements §8, Property 3

- [ ] 21. Care Circle Sharing (/care-circle)
  - Description: Build the Care Circle management view for Civilian Users.
  - [ ] Route: `app/(app)/care-circle/page.tsx`
  - [ ] `CareCirclePanel` lists current members with name, role, permission badge (view/manage)
  - [ ] Invite form: email input + "Send Invite" button; Server Action inserts `care_circle_members` row with `status = 'pending'`
  - [ ] Per-member permission toggle (view ↔ manage): Server Action updates `care_circle_members.permission`
  - [ ] "Remove" button: Server Action sets `care_circle_members.status = 'revoked'`, immediately revokes RLS access
  - [ ] Pending invitations shown with "Pending" chip
  - [ ] Caregiver can accept invitation from their own dashboard (sets `status = 'active'`)
  - References: Requirements §9, §36

- [ ] 22. Caregiver Shared Dashboard View
  - Description: Extend `/dashboard` to support Caregiver viewing a Care Circle member's data, and extend `/medications/new` to support Caregiver adding/editing medications on behalf of a member when manage permission is granted. Depends on Task 21 (Care Circle permissions).
  - [ ] When Caregiver is authenticated, `/dashboard` shows a member selector (dropdown of Care Circle members)
  - [ ] Selected member's medications, countdown timer, and adherence score displayed
  - [ ] View-only mode: "Mark as Taken" and "Add Medication" buttons hidden when permission is `'view'`
  - [ ] Manage mode: "Mark as Taken" and "Add Medication" available when permission is `'manage'`
  - [ ] When Caregiver with manage permission submits Add Medication form, `medications.user_id` is set to the Care Circle member's id (not the Caregiver's id)
  - [ ] RLS enforced: Caregiver can only fetch and write data for members in their active Care Circle with `permission = 'manage'`
  - [ ] Caregiver cannot access Add Medication for a member with `permission = 'view'` — route returns unauthorized
  - References: Requirements §2.3, §36

- [ ] 23. Pharmacist Review Queue (/clinical/reviews)
  - Description: Build the Pharmacist Review Queue view.
  - [ ] Route: `app/(clinical)/clinical/reviews/page.tsx`
  - [ ] Fetches all `clinical_reviews` with `status = 'pending'` joined with `patient_medications` and `patients`
  - [ ] Displays per queued item: patient name, medication name, dose, prescribing doctor, reason for review, time added
  - [ ] "Approve" button: Server Action sets `clinical_reviews.status = 'approved'`, sets `patient_medications.status = 'active'`, inserts `audit_logs` entry
  - [ ] "Flag Unsafe" button: Server Action sets `clinical_reviews.status = 'flagged_unsafe'`, sets `patient_medications.status = 'on_hold'`, inserts `notifications` for prescribing doctor, inserts `audit_logs` entry
  - [ ] Property 7 test: after approval, medication no longer appears in pending queue
  - References: Requirements §17, Property 7

- [ ] 24. Outpatient Clinic Queue (/clinical/clinic)
  - Description: Build the outpatient clinic queue view. Depends on `outpatient_appointments` table created in Task 2.
  - [ ] Route: `app/(clinical)/clinical/clinic/page.tsx`
  - [ ] Fetches `outpatient_appointments` joined with `patients` for the current calendar day (`appointment_time::date = CURRENT_DATE`), sorted by `appointment_time` ASC
  - [ ] Displays per appointment: patient name, appointment time, reason for visit, active medication flags from `clinical_alerts`
  - [ ] "Check In" button: Server Action sets `outpatient_appointments.status = 'arrived'`
  - [ ] Clicking a patient row navigates to `/clinical/patients/[id]`
  - [ ] `EmptyState` shown when no appointments for today
  - References: Requirements §18

- [ ] 26. Discharge Instructions (/clinical/discharge/[id])
  - Description: Build the discharge instructions view for Doctors.
  - [ ] Route: `app/(clinical)/clinical/discharge/[id]/page.tsx`
  - [ ] Fetches all active `patient_medications` for the patient
  - [ ] Displays: medication name, dose, frequency, special instructions for each active medication
  - [ ] Active `clinical_alerts` listed with disclaimer: "Demo/Academic Logic — Not Real Medical Advice"
  - [ ] Medical safety disclaimer displayed prominently
  - [ ] "Generate Instructions" Server Action: inserts `audit_logs` entry with `action = 'discharge_generated'`
  - [ ] On-screen formatted view with print-friendly CSS (`@media print`)
  - [ ] Property 10 test: all active medications appear in output without omission
  - References: Requirements §19, Property 10

- [ ] 27. Care Notes and Rounds
  - Description: Add care notes panel to the Patient Medication Tracker.
  - [ ] Care notes panel embedded in `/clinical/patients/[id]` page (tab or collapsible section)
  - [ ] Displays notes in reverse chronological order with author name, role badge, and timestamp
  - [ ] Filter by author role (Nurse / Doctor)
  - [ ] "Add Note" form: textarea + submit button; Server Action inserts `care_notes` row with `author_id`, `role_name`, `content`
  - [ ] Notes are immediately visible after save (optimistic update or revalidation)
  - [ ] No delete button rendered — notes are immutable; Admin archive action available in admin view only
  - References: Requirements §16

- [ ] 28. Accessibility Settings and Notification Preferences (/settings)
  - Description: Build the settings page for font size, contrast mode, and notification preferences.
  - [ ] Route: `app/(app)/settings/page.tsx`
  - [ ] Font size selector: Default / Large / Extra-Large; Server Action updates `profiles.font_size`; CSS custom property `--font-size-base` applied on `<html>` via layout
  - [ ] High contrast toggle: Server Action updates `profiles.high_contrast`; Tailwind `dark:` variant or CSS class applied globally
  - [ ] Notification preferences: reminder interval (15/30/60 min), reminders enabled toggle, missed dose alerts toggle; Server Action updates `notification_preferences`
  - [ ] Settings persisted to profile and applied on all subsequent sessions
  - [ ] WCAG 2.1 AA contrast verified in both default and high-contrast modes
  - References: Requirements §11

- [ ] 29. Mobile-Responsive Views
  - Description: Ensure all Phase 1 and Phase 2 views are fully responsive for mobile (< 768px).
  - [ ] Bottom navigation bar renders on mobile with top 4 role-appropriate routes
  - [ ] Civilian Dashboard: single-column layout; countdown timer prominent at top
  - [ ] Add Medication: full-screen step layout; touch targets ≥ 44×44 CSS pixels
  - [ ] Danger Alert (civilian): full-screen modal on mobile; buttons ≥ 44×44px
  - [ ] Hospital Patient Board: card-based layout on mobile
  - [ ] Patient Medication Tracker: single-column; "Mark Administered" as large tap target
  - [ ] Clinic Queue: scrollable list
  - [ ] Pharmacist Queue: approve/flag as single-tap actions
  - [ ] Settings: stacked form layout
  - [ ] All modals are full-screen on mobile
  - References: Requirements §22–§33

- [ ] 30. Widget Mockup Page (/widgets)
  - Description: Build the widget mockup page showing 4 prototype widget designs.
  - [ ] Route: `app/(app)/widgets/page.tsx`
  - [ ] Page heading: "Widget Previews — Not real OS widgets. These are prototype mockups of a future native widget experience."
  - [ ] 4 `WidgetMockup` components rendered: iOS light, iOS dark, Android light, Android dark
  - [ ] Each mockup shows: next dose countdown, medication name, scheduled time, intake note, safety status indicator
  - [ ] Widget data sourced from the same next-dose query as the Civilian Dashboard (Property 8 consistency)
  - [ ] `MobilePreview` phone frame wraps each widget mockup
  - [ ] Property 8 test: widget `nextDoseTime` and `medicationName` match dashboard data for same user
  - References: Requirements §34, Property 8

- [ ] 31. Admin System Overview
  - Description: Add the system overview tab to the admin page.
  - [ ] System overview section added to `/admin` (tab or separate section)
  - [ ] Deployment architecture diagram displayed (static SVG or Mermaid diagram): Next.js → Vercel → Supabase
  - [ ] System status indicators: database connectivity (Supabase health check ping), auth service, sync service
  - [ ] Warning indicator shown when any component reports unhealthy status
  - [ ] Status checks run server-side on page load
  - References: Requirements §21

- [ ] 32. Notifications Table and In-App Notification UI
  - Description: Implement in-app notifications for missed doses, alerts, and clinical team events.
  - [ ] Notification bell icon in `TopBar` with unread count badge
  - [ ] Notification dropdown/panel lists recent notifications sorted by `created_at` DESC
  - [ ] "Mark as read" action: Server Action updates `notifications.status = 'read'` and sets `read_at`
  - [ ] Server Actions that create notifications: missed dose (on-load check), interaction alert created, clinical team notify, sync conflict flagged, medication approved/flagged
  - [ ] Notification types styled distinctly: missed_dose = Warning amber, interaction_alert = Primary red, clinical_team = Info blue
  - References: Requirements §37, Design §3.20
