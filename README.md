# MedAware

MedAware is an academic healthcare technology prototype for medication adherence, safety awareness, caregiver coordination, and clinical medication workflow support.

It supports multiple user roles:

- Civilian users
- Caregivers
- Nurses
- Doctors
- Pharmacists
- Admins

MedAware demonstrates how a medication system can help users track doses, identify demo medication conflicts, coordinate care, support hospital medication review, and generate discharge medication instructions.

> **Important:** MedAware is an academic prototype only. It does not provide real medical advice, prescription authority, diagnosis, treatment recommendations, or clinical decision support.

---

## Table of Contents

1. [Features](#features)
2. [Tech Stack](#tech-stack)
3. [Local Setup](#local-setup)
4. [Supabase Setup](#supabase-setup)
5. [Demo Accounts](#demo-accounts)
6. [Main Routes](#main-routes)
7. [Demo Walkthrough](#demo-walkthrough)
8. [Testing Checklist](#testing-checklist)
9. [Safety and Ethics Notice](#safety-and-ethics-notice)
10. [Known Prototype Limitations](#known-prototype-limitations)
11. [Future Work](#future-work)

---

## Features

### Civilian Features

- Medication dashboard
- Next-dose countdown
- Medication list
- Guided add-medication flow
- Demo safety checks
- Centered critical danger alert
- Interaction detail and triage page
- Adherence risk dashboard
- Care circle sharing
- Offline dose queue and sync state
- Accessibility and notification settings
- iOS and Android-style widget mockups

### Clinical Features

- Hospital patient board
- Clinical alert center
- Patient medication tracker
- Clinical centered danger alert
- Care notes and rounds
- Pharmacist review queue
- Outpatient clinic queue
- Discharge medication instructions
- Professional print layout for discharge instructions

### Admin Features

- Role management
- Audit log review
- System overview dashboard
- Supabase table health checks
- Environment readiness indicators
- Deployment readiness checklist

---

## Tech Stack

- Next.js
- TypeScript
- Tailwind CSS
- Supabase Auth
- Supabase Postgres
- Supabase Row Level Security
- Server Actions
- Local browser storage for offline queue simulation

---

## Local Setup

### 1. Clone the repository

```bash
git clone <your-repository-url>
cd medAwareHCI
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create `.env.local`

Create a `.env.local` file in the project root.

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
DEMO_USER_PASSWORD=your_demo_password
```

Do **not** commit `.env.local`.

---

## Supabase Setup

Run the SQL and seed files in this order:

```text
1. supabase/migrations/001_initial_schema.sql
2. supabase/migrations/002_rls_policies.sql
3. npx tsx supabase/seed-users.ts
4. supabase/seed.sql
```

The migration files create the schema and policies.

The seed user script creates Supabase Auth users.

The seed SQL file creates demo roles, profiles, medications, patients, alerts, reviews, notifications, audit logs, and appointments.

### Important Supabase Notes

- `SUPABASE_SERVICE_ROLE_KEY` must only be used on the server.
- Never expose the service role key to client components.
- `.env.local` should remain uncommitted.
- Make sure demo users exist in Supabase Auth before testing login.
- Make sure `seed.sql` has been run after migrations.

---

## Demo Accounts

All demo accounts use the password stored in:

```text
DEMO_USER_PASSWORD
```

### Civilian

```text
civilian@medaware.demo
```

### Caregiver

```text
caregiver@medaware.demo
```

### Nurse

```text
nurse@medaware.demo
```

### Doctor

```text
doctor@medaware.demo
```

### Pharmacist

```text
pharmacist@medaware.demo
```

### Admin

```text
admin@medaware.demo
```

---

## Run Locally

```bash
npm run dev
```

Then open:

```text
http://localhost:3000
```

---

## Build

```bash
npm run build
```

A successful production build means the app is ready for deployment testing.

---


## Google Account QA Checklist

- Continue with Google
- Complete profile setup
- Confirm civilian role
- Add medication
- View dashboard
- Edit medication
- View safety evidence
- Archive medication
- Restore medication
- Sign out and sign back in

---

## Main Routes

### Public Routes

```text
/
/login
/role-select
```

### Civilian Routes

```text
/dashboard
/medications/new
/interactions
/adherence
/care-circle
/offline
/settings
/widgets
```

### Clinical Routes

```text
/clinical/patients
/clinical/patients/[patientId]
/clinical/patients/[patientId]/notes
/clinical/alerts
/clinical/alerts/[alertId]
/clinical/reviews
/clinical/clinic
/clinical/discharge/[patientId]
```

### Admin Routes

```text
/admin
/admin/system
```

---

# Demo Walkthrough

This section can be used for a class demo, panel presentation, or project walkthrough.

---

## 1. Opening

MedAware is an academic healthcare technology prototype focused on medication adherence, safety awareness, and care coordination.

It supports both civilian and clinical workflows through role-based dashboards.

The core design goal is to reduce medication-related confusion by making dose schedules, alerts, caregiver visibility, and clinical escalation easier to understand.

Important disclaimer: MedAware is not a real medical device or clinical decision support tool. It uses mock safety logic for academic demonstration only.

---

## 2. Civilian User Flow

Login as:

```text
civilian@medaware.demo
```

Use the demo password from `.env.local`.

### Civilian Dashboard

Open:

```text
/dashboard
```

Show:

- Next dose countdown
- Medication list
- Active danger alert
- Adherence score
- Add medication button

### Guided Add Medication

Open:

```text
/medications/new
```

Safe test case:

```text
Medication: Paracetamol
Dose: 500
Unit: mg
```

Critical test case:

```text
Medication: Ibuprofen
Dose: 200
Unit: mg
```

Show:

- Multi-step guided entry
- Demo safety review
- Centered DANGER ALERT modal
- Pending-review behavior

### Interaction Detail

Open:

```text
/interactions
```

Show:

- Medication conflict summary
- Health professional guidance
- Academic safety disclaimer

### Adherence Dashboard

Open:

```text
/adherence
```

Show:

- Adherence score
- Taken/missed/skipped breakdown
- Recent dose history

### Care Circle

Open:

```text
/care-circle
```

Show:

- Caregiver sharing
- View/manage permissions
- Revoke access

### Offline Sync

Open:

```text
/offline
```

Show:

- Browser online/offline detection
- Local queued dose action
- Sync to Supabase medication logs

### Settings

Open:

```text
/settings
```

Show:

- Font size
- High contrast mode
- Reminder preferences

### Widgets

Open:

```text
/widgets
```

Show:

- iOS light widget mockup
- iOS dark widget mockup
- Android light widget mockup
- Android dark widget mockup
- Danger alert state in widget preview

---

## 3. Clinical User Flow

Login as:

```text
nurse@medaware.demo
```

or:

```text
doctor@medaware.demo
```

### Patient Board

Open:

```text
/clinical/patients
```

Show:

- Patient risk labels
- Room and diagnosis
- Medication action preview
- Open tracker button

### Patient Medication Tracker

Open a patient record, such as Maria Santos or Pedro Reyes.

Show:

- Medications
- Schedule times
- Administration history
- Disabled administer button for held or conflicted medications

### Alert Center

Open:

```text
/clinical/alerts
```

Show:

- Critical alerts first
- Patient and medication details
- Acknowledge alert
- Open danger alert

### Clinical Danger Alert

Open a critical alert.

Show:

- DO NOT ADMINISTER layout
- Assign review
- Notify team
- Open patient record

### Care Notes

Open:

```text
/clinical/patients/[patientId]/notes
```

Show:

- Nurse and doctor notes
- Role filter
- Append-only documentation style

### Clinic Queue

Open:

```text
/clinical/clinic
```

Show:

- Outpatient appointments
- Arrival flow
- Start visit
- Complete visit
- Medication preparation section

### Discharge Instructions

Open:

```text
/clinical/discharge/[patientId]
```

Show:

- Patient summary
- Medication plan
- Active alerts
- Professional print layout
- Suggested PDF filename using patient name

---

## 4. Pharmacist Flow

Login as:

```text
pharmacist@medaware.demo
```

Open:

```text
/clinical/reviews
```

Show:

- Pending medication reviews
- Approve medication
- Flag unsafe
- Medication status updates
- Audit log generation

---

## 5. Admin Flow

Login as:

```text
admin@medaware.demo
```

### Admin Dashboard

Open:

```text
/admin
```

Show:

- Users
- Roles
- Assign role
- Remove role
- Audit logs

### System Overview

Open:

```text
/admin/system
```

Show:

- Environment variable status
- Supabase table counts
- Critical alerts
- Pending reviews
- Recent audit events
- Deployment checklist

---

## 6. Closing

MedAware demonstrates how HCI principles can improve medication safety workflows through clear visibility, role-sensitive interfaces, strong warning design, and care coordination.

The prototype is not medically validated, but it shows how a production healthcare system could be designed around safety, accountability, accessibility, and user trust.

---

# Testing Checklist

Use this checklist before deployment or presentation.

---

## General

- [ ] `npm install` completes
- [ ] `.env.local` exists
- [ ] `.env.local` is not committed
- [ ] `npm run build` passes
- [ ] `npm run dev` runs locally
- [ ] Login page loads
- [ ] Role selection works
- [ ] Sign out works on desktop
- [ ] Sign out works on mobile

---

## Supabase

- [ ] `001_initial_schema.sql` has been run
- [ ] `002_rls_policies.sql` has been run
- [ ] `npx tsx supabase/seed-users.ts` has been run
- [ ] `seed.sql` has been run
- [ ] Auth users exist
- [ ] Profiles exist
- [ ] Roles exist
- [ ] User roles exist
- [ ] Patients exist
- [ ] Medications exist
- [ ] Clinical alerts exist
- [ ] Clinical reviews exist
- [ ] Outpatient appointment exists for current day
- [ ] Audit logs exist

---

## Civilian Flow

Login as:

```text
civilian@medaware.demo
```

- [ ] `/dashboard` loads
- [ ] Next dose appears
- [ ] Medication list appears
- [ ] Active safety alert appears
- [ ] `/medications/new` works
- [ ] Safe medication can be added
- [ ] Critical medication shows danger modal
- [ ] Critical medication saves as pending review
- [ ] `/interactions` loads
- [ ] `/adherence` loads
- [ ] Offline queue works
- [ ] Offline queue syncs
- [ ] `/care-circle` loads
- [ ] Caregiver can be invited
- [ ] Caregiver permission can be changed
- [ ] Caregiver can be revoked
- [ ] `/settings` saves preferences
- [ ] Font size preference applies
- [ ] High contrast preference applies
- [ ] `/widgets` loads

---

## Caregiver Flow

Login as:

```text
caregiver@medaware.demo
```

- [ ] `/care-circle` loads
- [ ] Shared-with-me section appears if invited
- [ ] Access reflects civilian sharing settings

---

## Nurse Flow

Login as:

```text
nurse@medaware.demo
```

- [ ] `/clinical/patients` loads
- [ ] Patient board displays seeded patients
- [ ] Patient tracker opens
- [ ] Care notes page opens
- [ ] Nurse can add care note
- [ ] `/clinical/alerts` loads
- [ ] Critical alert appears
- [ ] Alert can be acknowledged
- [ ] Clinical danger alert opens
- [ ] `/clinical/clinic` loads
- [ ] Clinic queue status updates work

---

## Doctor Flow

Login as:

```text
doctor@medaware.demo
```

- [ ] Patient board loads
- [ ] Patient tracker loads
- [ ] Doctor can add care note
- [ ] Clinical danger alert loads
- [ ] Discharge instructions load
- [ ] Print instructions opens browser print
- [ ] Printed output shows formal layout only
- [ ] Record generation writes audit log

---

## Pharmacist Flow

Login as:

```text
pharmacist@medaware.demo
```

- [ ] `/clinical/reviews` loads
- [ ] Pending review appears
- [ ] Approve medication works
- [ ] Flag unsafe works
- [ ] Review action writes audit log
- [ ] Review action updates medication status

---

## Admin Flow

Login as:

```text
admin@medaware.demo
```

- [ ] `/admin` loads
- [ ] Profiles appear
- [ ] Roles appear
- [ ] Role assignment works
- [ ] Role removal works
- [ ] Last admin role cannot be removed
- [ ] Audit logs appear
- [ ] `/admin/system` loads
- [ ] Environment status appears
- [ ] Table counts appear
- [ ] Deployment checklist appears

---

## Mobile Responsiveness

Test in browser dev tools:

- [ ] iPhone SE
- [ ] iPhone 12/13/14
- [ ] Pixel 7
- [ ] iPad Mini

Check:

- [ ] Mobile menu appears
- [ ] Mobile navigation works
- [ ] Mobile sign out works
- [ ] Forms do not overflow
- [ ] Cards do not horizontally scroll
- [ ] Tables are readable or contained
- [ ] Print layout still works

---

## Safety and Ethics Notice

MedAware uses mock medication safety logic for academic demonstration only.

The interaction warnings, adherence scoring, clinical alerts, pharmacist review queue, discharge instructions, and widget previews are not validated medical tools.

This project must not be used for real medication decisions.

A real deployment would require:

- Clinical validation
- Pharmacist and physician review
- Privacy and security assessment
- Regulatory review
- Accessibility testing
- Incident response planning
- Secure audit logging
- Data retention policies
- Compliance review

---

## Academic Purpose

This project demonstrates healthcare HCI concepts such as:

- Error prevention
- Visibility of system status
- Role-based workflows
- Safety-critical alerting
- Progressive disclosure
- Accessibility preferences
- Offline state handling
- Shared care coordination
- Auditability
- Medication adherence support

---

## Known Prototype Limitations

- Demo safety logic only
- No real drug database
- No real medical advice
- No real push notifications
- No native mobile widgets
- Offline queue uses localStorage only
- Discharge instructions are prototype documents only
- No production-grade monitoring
- No clinical validation
- No regulatory approval
- No real patient data should be entered

---

## Future Work

Future improvements may include:

- Real drug interaction API integration
- Push notifications
- Native mobile widgets
- Encrypted offline storage
- Clinical validation
- Role-specific dashboards
- Production monitoring
- Deployment hardening
- Advanced audit reporting
- More robust consent and privacy flows
- Real appointment scheduling integrations
- PDF generation service for discharge documents
- Automated medication reminder engine

---

## Project Status

MedAware is currently an MVP academic prototype.

Completed modules include:

- Civilian medication tracking
- Medication safety warnings
- Care circle sharing
- Offline sync simulation
- Clinical patient board
- Clinical alert center
- Patient medication tracker
- Care notes and rounds
- Pharmacist review queue
- Outpatient clinic queue
- Discharge instruction generation
- Admin role management
- Audit log review
- System readiness overview
- Widget mockups
- Mobile responsive navigation

## Supabase Migration Runbook

- GitHub migration files are not automatically applied to Supabase unless a migration pipeline is configured.
- After pulling or merging migration changes, run the new SQL manually in Supabase SQL Editor.
- After schema changes, run:

```sql
select pg_notify('pgrst', 'reload schema');
```

- Check `/admin/schema` after deployment.
- If medication creation fails with schema cache errors, verify the medication metadata columns (`rxcui`, `normalized_name`, `normalization_source`, `normalization_confidence`, `safety_evidence`, `safety_checked_at`).
