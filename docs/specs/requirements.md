# Requirements Document

## Introduction

MedAware is a role-adaptive medication safety and adherence full-stack web application built with Next.js (App Router), TypeScript, Tailwind CSS, Supabase, and deployed on Vercel. It serves two primary operational modes: a **Civilian mode** for personal medication management and a **Clinical mode** for hospital and clinic workflows. The application supports six distinct roles — Civilian User, Caregiver, Nurse, Doctor, Pharmacist, and Admin — each with tailored views and permissions.

MedAware delivers 20 desktop views, 12 mobile views, and 4 widget mockups. It enforces medication safety through mock interaction-checking logic (clearly labeled as academic/demo logic — not real medical advice), role-based access control, alert workflows, phased offline support, and a full audit trail. Supabase Realtime, push notifications, and advanced offline sync are planned as Phase 3 enhancements.

> **Medical Safety Disclaimer**: All medication interaction logic in MedAware is mock/demo logic for academic purposes only. It does NOT constitute real medical advice. Real deployment would require verified drug-interaction databases and licensed clinical review.

---

## GlossaryApproved. Proceed to generate design.md based on this requirements.md.

For design.md, include:

1. System architecture
- Next.js App Router architecture
- Supabase Auth
- Supabase PostgreSQL
- Row Level Security
- Server-side route protection
- Vercel deployment

2. Application routing
Clarify:
- /login handles authentication
- /role-select is only shown after login when a user has multiple roles
- civilian routes
- clinical routes
- admin routes
- unauthorized route behavior

3. Database schema
Include tables for:
- profiles
- roles
- user_roles
- medications
- medication_schedules
- medication_logs
- medication_alerts
- interaction_checks
- care_circle_members
- patients
- patient_assignments
- patient_medications
- care_notes
- clinical_reviews
- audit_logs
- notification_preferences

4. RLS policy design
Explain how each role accesses only its permitted data.

5. Mock medication safety engine
Include demo rules:
- Warfarin + Ibuprofen = critical/high risk
- duplicate medication name = caution
- allergy conflict = critical/high risk
- more than two missed doses in seven days = adherence risk

Clearly label this as academic/demo logic only.

6. Component architecture
Include:
- AppShell
- Sidebar
- TopBar
- RoleSwitcher
- MedicationCard
- PatientCard
- AlertCard
- CenteredDangerModal
- ClinicalDangerModal
- InteractionTriagePanel
- AdherenceRiskPanel
- CareCirclePanel
- WidgetMockup
- MobilePreview
- AuditLogPanel
- EmptyState
- LoadingState
- ErrorState
- OfflineStateBanner

7. Phase-based implementation design
Separate Phase 1 MVP, Phase 2 extended features, and Phase 3 advanced features.

8. UI and design system
Use the MedAware design tokens:
- Primary #FF3F4D
- Secondary coral #FF6B74
- Soft pink #FFE8EC
- Rose background #FFF6F7
- App background #F6F8FB
- Text #101828
- Muted #667085
- Border #E6EAF0
- Success #12B76A
- Warning #F59E0B
- Info #2E90FA

9. Testing strategy
Map tests to the correctness properties in requirements.md.

10. Deployment plan
Include environment variables, Supabase setup, seed data, Vercel deployment, and README requirements.

Do not implement code yet. Generate design.md first and wait for my approval.

- **MedAware**: The application described in this document.
- **Civilian_User**: A non-clinical end user managing their own medications.
- **Caregiver**: A trusted person managing medications on behalf of another user.
- **Nurse**: A clinical staff member responsible for administering medications to patients.
- **Doctor**: A licensed clinician who prescribes and oversees patient medication plans.
- **Pharmacist**: A licensed pharmacy professional who reviews and approves medication orders.
- **Admin**: A system administrator responsible for user management, role assignment, and audit oversight.
- **Medication**: A drug or supplement tracked within MedAware, including name, dose, schedule, and notes.
- **Dose**: A single scheduled intake event for a Medication.
- **Adherence_Score**: A calculated metric (0–100) representing how consistently a user has taken scheduled Doses.
- **Interaction_Alert**: A safety warning generated when two or more Medications have a mock-flagged conflict.
- **Danger_Alert**: A high-severity, interruptive modal alert triggered by a critical Interaction_Alert.
- **Care_Circle**: A group of users (Civilian_User and Caregivers) who share medication visibility for a single patient.
- **Patient_Board**: The clinical landing view listing all patients with their medication risk states.
- **Review_Queue**: A list of Medications pending Pharmacist approval.
- **Audit_Log**: An append-only record of all role changes, alert acknowledgements, and administrative actions.
- **Offline_Queue**: A local store of actions taken while the device has no network connectivity.
- **Sync**: The process of replaying the Offline_Queue to the server upon reconnection.
- **Widget**: A web-rendered prototype mockup of a future iOS or Android home screen widget. In this version, widgets are not real OS-level widgets and are used only to demonstrate the intended civilian next-dose glance experience.
- **RLS**: Row Level Security — Supabase database-level access control enforcing role permissions.
- **Session**: An authenticated user context established after successful login.
- **Mock_Interaction_Rule**: A hardcoded or seeded rule used to simulate drug interaction detection for demo purposes.

---

## Requirements

---

### Requirement 1: Authentication and Role Selection

**User Story:** As any user, I want to log in with my credentials and select my role, so that I am directed to the correct mode and views for my responsibilities.

#### Acceptance Criteria

1. THE MedAware SHALL present a Login and Role Selection view as the unauthenticated entry point.
2. WHEN a user submits valid credentials, THE MedAware SHALL create an authenticated Session and redirect the user to their role-appropriate landing view.
3. IF a user submits invalid credentials, THEN THE MedAware SHALL display an inline error message and SHALL NOT create a Session.
4. WHEN a Session is created, THE MedAware SHALL persist the Session across page refreshes until the user explicitly logs out or the Session expires.
5. WHEN a user with multiple roles logs in, THE MedAware SHALL present a role selection step before redirecting.
6. WHEN a user logs out, THE MedAware SHALL invalidate the Session and redirect to the Login view.
7. THE MedAware SHALL enforce Supabase Auth for all authentication operations.
8. IF an unauthenticated user attempts to access a protected route, THEN THE MedAware SHALL redirect the user to the Login view.

---

### Requirement 2: Role-Based Access Control

**User Story:** As a system operator, I want each role to access only its permitted views and data, so that patient privacy and clinical safety are maintained.

#### Role Access Matrix

**Civilian User** can access:
- Civilian Dashboard
- Add Medication
- Safety Pre-Check
- Danger Alert
- Interaction Detail
- Adherence Risk
- Care Circle
- Offline State
- Settings
- Widget mockups (web/prototype mockups only — see Requirement 34)

**Caregiver** can access:
- Shared Civilian Dashboard (for users in their Care Circle)
- Shared Adherence Risk
- Shared Alerts
- Care Circle
- Add/Edit Medication ONLY when manage permission is granted by the Civilian User

**Nurse** can access:
- Hospital Patient Board
- Hospital Alert Center
- Patient Medication Tracker
- Clinical Danger Alert
- Care Notes and Rounds
- Outpatient Clinic Queue

**Doctor** can access:
- Hospital Patient Board
- Hospital Alert Center
- Patient Medication Tracker
- Clinical Danger Alert
- Care Notes and Rounds
- Outpatient Clinic Queue
- Discharge Instructions

**Pharmacist** can access:
- Hospital Alert Center
- Patient Medication Tracker
- Clinical Danger Alert
- Pharmacist Review Queue

**Admin** can access:
- Admin Roles and Audit Logs
- System Overview
- All views (for oversight and demo purposes)

#### Acceptance Criteria

1. THE MedAware SHALL enforce role-based access control on all routes using Supabase RLS and server-side middleware.
2. WHEN a Civilian_User is authenticated, THE MedAware SHALL grant access to: Civilian Dashboard, Add Medication, Safety Pre-Check, Danger Alert, Interaction Detail, Adherence Risk, Care Circle, Offline State, Settings, and Widget mockup views. THE MedAware SHALL deny access to all Clinical mode views.
3. WHEN a Caregiver is authenticated, THE MedAware SHALL grant access to: the Shared Civilian Dashboard for users in their Care_Circle, Shared Adherence Risk, Shared Alerts, and Care Circle management. THE MedAware SHALL grant Add/Edit Medication access ONLY when the Civilian_User has explicitly granted manage permission to that Caregiver.
4. WHEN a Nurse is authenticated, THE MedAware SHALL grant access to: Hospital Patient Board, Hospital Alert Center, Patient Medication Tracker, Clinical Danger Alert, Care Notes and Rounds, and Outpatient Clinic Queue. THE MedAware SHALL deny access to Civilian mode views and Discharge Instructions.
5. WHEN a Doctor is authenticated, THE MedAware SHALL grant access to: Hospital Patient Board, Hospital Alert Center, Patient Medication Tracker, Clinical Danger Alert, Care Notes and Rounds, Outpatient Clinic Queue, and Discharge Instructions. THE MedAware SHALL deny access to Civilian mode views.
6. WHEN a Pharmacist is authenticated, THE MedAware SHALL grant access to: Hospital Alert Center, Patient Medication Tracker, Clinical Danger Alert, and Pharmacist Review Queue. THE MedAware SHALL deny access to Civilian mode views and Discharge Instructions.
7. WHEN an Admin is authenticated, THE MedAware SHALL grant access to: Admin Roles and Audit Logs, System Overview, and all other views for oversight and demo purposes.
8. IF a user attempts to access a route outside their permitted role, THEN THE MedAware SHALL return an unauthorized response and display an access-denied message.
9. THE MedAware SHALL apply Supabase RLS policies so that database queries automatically filter data to the authenticated user's permitted scope.

---

### Requirement 3: Civilian Medication Dashboard (Desktop View 2)

**User Story:** As a Civilian_User, I want a personal medication dashboard, so that I can see my next dose countdown, medication details, adherence status, and any active safety alerts at a glance.

#### Acceptance Criteria

1. WHEN a Civilian_User is authenticated, THE MedAware SHALL display the Civilian Medication Dashboard as the landing view.
2. THE MedAware SHALL display a countdown timer showing the time remaining until the next scheduled Dose.
3. THE MedAware SHALL display the medication name, dose amount, scheduled time, and procedure notes for the next Dose.
4. THE MedAware SHALL display the current Adherence_Score for the authenticated Civilian_User.
5. WHEN one or more active Interaction_Alerts exist for the user's Medications, THE MedAware SHALL display a safety alert indicator on the dashboard.
6. WHILE the countdown timer is active, THE MedAware SHALL update the displayed time remaining at least once per minute.
7. THE countdown timer value displayed SHALL be greater than or equal to zero at all times.
8. WHEN a Dose time passes without the user marking it as taken, THE MedAware SHALL update the Adherence_Score to reflect the missed Dose.

---

### Requirement 4: Guided Add Medication (Desktop View 3)

**User Story:** As a Civilian_User or Caregiver, I want a guided multi-step form to add a new medication, so that I can enter all required details accurately and trigger safety checks before saving.

#### Acceptance Criteria

1. WHEN a user initiates adding a medication, THE MedAware SHALL present a multi-step guided form collecting: medication name, dose amount, dose unit, schedule (frequency and times), start date, end date (optional), and procedure notes.
2. THE MedAware SHALL validate that medication name, dose amount, dose unit, and schedule are provided before allowing progression to the next step.
3. IF a required field is empty when the user attempts to advance, THEN THE MedAware SHALL display a field-level validation error and SHALL NOT advance the step.
4. WHEN the user completes all required fields and submits, THE MedAware SHALL trigger the Safety Pre-Check before saving the Medication.
5. WHEN a Medication is saved successfully, THE MedAware SHALL display a confirmation and return the user to the Civilian Medication Dashboard.
6. FOR ALL Medications saved and then retrieved, THE MedAware SHALL return data equivalent to the data submitted (round-trip correctness).

---

### Requirement 5: Safety Pre-Check (Desktop View 4)

**User Story:** As a Civilian_User or Caregiver, I want the system to check for medication interactions before I add a new medication, so that I am warned of potential conflicts before they affect my health.

#### Acceptance Criteria

1. WHEN a new Medication is submitted, THE MedAware SHALL evaluate it against all existing Medications for the user using Mock_Interaction_Rules.
2. IF no interactions are detected, THEN THE MedAware SHALL save the Medication and display a confirmation.
3. IF one or more interactions are detected, THEN THE MedAware SHALL display the Safety Pre-Check view listing each detected interaction with its severity level.
4. THE MedAware SHALL label all interaction logic as "Demo/Academic Logic — Not Real Medical Advice" on the Safety Pre-Check view.
5. WHEN an interaction of critical severity is detected, THE MedAware SHALL trigger the Centered Danger Alert (Requirement 6) instead of the standard Safety Pre-Check view.
6. FOR ALL pairs of Medications flagged by a Mock_Interaction_Rule, THE MedAware SHALL surface an Interaction_Alert whenever both Medications are active for the same user.
7. WHEN only low or moderate interactions are detected, THE MedAware SHALL allow the user to cancel, remove the new medication, or save the medication with caution after explicit confirmation.

---

### Requirement 6: Centered Danger Alert — Civilian (Desktop View 5)

**User Story:** As a Civilian_User, I want a full-screen interruptive alert when a critical medication conflict is detected, so that I cannot accidentally proceed without acknowledging the danger.

#### Acceptance Criteria

1. WHEN a critical Interaction_Alert is triggered, THE MedAware SHALL display a centered, modal Danger_Alert that blocks all background interaction.
2. THE Danger_Alert SHALL display the text "DANGER ALERT" as the primary heading.
3. THE Danger_Alert SHALL display a clear explanation of the detected medication conflict using the names of the conflicting Medications.
4. THE Danger_Alert SHALL display the advisory text "Contact a health professional before continuing."
5. THE Danger_Alert SHALL present three action buttons: "Contact Health Professional", "Remove Medication", and "View Details".
6. WHEN the user selects "Remove Medication", THE MedAware SHALL remove the newly added Medication and dismiss the Danger_Alert.
7. WHEN the user selects "View Details", THE MedAware SHALL navigate to the Interaction Detail and Triage view (Requirement 7).
8. WHEN the user selects "Contact Health Professional", THE MedAware SHALL display contact guidance and SHALL NOT save the conflicting Medication until the user explicitly confirms.
9. THE MedAware SHALL NOT allow the Danger_Alert to be dismissed by clicking outside the modal or pressing Escape without selecting an action.
10. WHEN a critical interaction is detected, THE MedAware SHALL NOT create an active medication schedule for the conflicting Medication unless the user explicitly chooses a demo override. IF saved through override, THE Medication SHALL be marked as inactive/pending review and SHALL continue displaying an active Danger_Alert.

---

### Requirement 7: Interaction Detail and Triage (Desktop View 6)

**User Story:** As a Civilian_User or Caregiver, I want to view the full details of a medication interaction, so that I can understand the risk and decide how to proceed.

#### Acceptance Criteria

1. WHEN a user navigates to the Interaction Detail view, THE MedAware SHALL display the names of all conflicting Medications.
2. THE MedAware SHALL display the severity level of the interaction (e.g., critical, moderate, low).
3. THE MedAware SHALL display a description of the mock interaction risk.
4. THE MedAware SHALL display the disclaimer "This is demo/academic logic — not real medical advice."
5. THE MedAware SHALL present triage options: proceed with caution, remove the new medication, or contact a health professional.
6. WHEN the user selects "Remove Medication" from this view, THE MedAware SHALL remove the conflicting Medication and return to the dashboard.

---

### Requirement 8: Adherence Risk Dashboard (Desktop View 7)

**User Story:** As a Civilian_User or Caregiver, I want to see a detailed adherence risk breakdown, so that I can identify patterns of missed doses and take corrective action.

#### Acceptance Criteria

1. THE MedAware SHALL display the Adherence_Score as a numeric value between 0 and 100 inclusive.
2. THE MedAware SHALL display a history of Doses showing taken, missed, and upcoming statuses.
3. THE MedAware SHALL categorize adherence risk as low (score ≥ 80), moderate (score 50–79), or high (score < 50).
4. WHEN the Adherence_Score falls below 50, THE MedAware SHALL display a high-risk adherence warning.
5. FOR ALL sequences of Dose history, THE MedAware SHALL compute the Adherence_Score such that adding a missed Dose does not increase the score (monotonicity invariant).
6. THE MedAware SHALL display adherence trends over the past 7 days and 30 days.

---

### Requirement 9: Care Circle Sharing (Desktop View 8)

**User Story:** As a Civilian_User, I want to share my medication information with trusted caregivers, so that they can monitor my adherence and help manage my health.

#### Acceptance Criteria

1. THE MedAware SHALL allow a Civilian_User to invite other users to their Care_Circle by email address.
2. WHEN an invitation is accepted, THE MedAware SHALL grant the invited user Caregiver access to the inviting user's medication data.
3. THE MedAware SHALL display all current Care_Circle members with their names and roles.
4. WHEN a Caregiver is removed from the Care_Circle, THE MedAware SHALL immediately revoke their access to the user's medication data.
5. THE MedAware SHALL allow a Civilian_User to set per-member visibility permissions (view-only vs. manage).
6. WHEN a Caregiver has manage permissions, THE MedAware SHALL allow the Caregiver to add and edit Medications on behalf of the Civilian_User.

---

### Requirement 10: Offline and Sync State (Desktop View 9)

**User Story:** As a Civilian_User, I want the app to remain functional when I have no internet connection, so that I can still view and log my medications during connectivity outages.

#### Acceptance Criteria

1. WHILE the device has no network connectivity, THE MedAware SHALL allow the user to view their existing Medications and Dose schedule from local cache.
2. WHILE the device has no network connectivity, THE MedAware SHALL allow the user to mark Doses as taken and queue the action in the Offline_Queue.
3. THE MedAware SHALL display a visible offline status indicator when the device has no network connectivity.
4. WHEN network connectivity is restored, THE MedAware SHALL automatically replay all actions in the Offline_Queue to the server.
5. IF a conflict is detected during Sync for a **civilian Dose log** (e.g., a Dose was already marked server-side), THEN THE MedAware SHALL resolve the conflict using a last-write-wins strategy and SHALL notify the user of the resolution.
5b. IF a conflict is detected during Sync for a **clinical medication administration record**, THEN THE MedAware SHALL NOT silently overwrite the existing record. THE MedAware SHALL flag the conflict for manual review, display a conflict notification to the clinical user, and record the conflict event in the Audit_Log.
6. FOR ALL actions queued offline and then synced, THE MedAware SHALL produce a final server state equivalent to performing those actions online (idempotent sync property).
7. WHEN Sync completes successfully, THE MedAware SHALL clear the Offline_Queue and update the local cache.

---

### Requirement 11: Accessibility and Settings (Desktop View 10)

**User Story:** As any user, I want to configure accessibility preferences and app settings, so that the application is usable regardless of my visual or motor abilities.

#### Acceptance Criteria

1. THE MedAware SHALL provide a Settings view accessible from all authenticated views via a persistent navigation element.
2. THE MedAware SHALL allow users to select a preferred font size from at least three options: default, large, and extra-large.
3. THE MedAware SHALL allow users to enable a high-contrast display mode.
4. WHEN a user saves accessibility settings, THE MedAware SHALL persist those settings to the user's profile and apply them on all subsequent Sessions.
5. THE MedAware SHALL meet WCAG 2.1 AA color contrast requirements in both default and high-contrast modes.
6. THE MedAware SHALL support full keyboard navigation for all interactive elements.
7. THE MedAware SHALL provide ARIA labels for all interactive elements, icons, and status indicators.
8. THE MedAware SHALL allow users to configure notification preferences including dose reminder timing (e.g., 15 minutes, 30 minutes, 1 hour before scheduled Dose).

---

### Requirement 12: Hospital Patient Board (Desktop View 11)

**User Story:** As a Nurse or Doctor, I want a patient board showing all patients with their room numbers, diagnoses, medication risk states, and next medication actions, so that I can prioritize care efficiently.

#### Acceptance Criteria

1. WHEN a Nurse or Doctor is authenticated, THE MedAware SHALL display the Hospital Patient Board as the landing view.
2. THE Patient_Board SHALL display each patient's name, room number, primary diagnosis, and current medication risk state.
3. THE MedAware SHALL categorize medication risk state as: safe, caution, or critical.
4. WHEN a patient has one or more active critical Interaction_Alerts, THE MedAware SHALL display that patient's risk state as critical on the Patient_Board.
5. THE Patient_Board SHALL display the next scheduled medication action for each patient.
6. WHEN a user selects a patient on the Patient_Board, THE MedAware SHALL navigate to the Patient Medication Tracker for that patient (Requirement 14).
7. THE Patient_Board SHALL be sortable by room number, risk state, and next medication time.
8. FOR ALL patients with active critical alerts, THE MedAware SHALL display those patients in the Hospital Alert Center (Requirement 13).

---

### Requirement 13: Hospital Alert Center (Desktop View 12)

**User Story:** As a Nurse or Doctor, I want a centralized alert center showing all active medication alerts across all patients, so that I can respond to critical situations without missing any.

#### Acceptance Criteria

1. THE MedAware SHALL display all active Interaction_Alerts across all patients in the Hospital Alert Center.
2. THE MedAware SHALL sort alerts by severity (critical first) and then by time of detection.
3. THE MedAware SHALL display for each alert: patient name, room number, conflicting medication names, severity level, and time detected.
4. WHEN a user acknowledges an alert, THE MedAware SHALL record the acknowledgement with the user's identity and timestamp in the Audit_Log.
5. THE MedAware SHALL display the count of unresolved critical alerts as a badge on the Alert Center navigation element.
6. FOR ALL active Interaction_Alerts across all patients, THE MedAware SHALL display each alert exactly once in the Alert Center (no duplicates, no omissions).

---

### Requirement 14: Patient Medication Tracker (Desktop View 13)

**User Story:** As a Nurse, Doctor, or Pharmacist, I want to view and manage a specific patient's full medication schedule and history, so that I can ensure safe and timely administration.

#### Acceptance Criteria

1. WHEN a clinical user opens a patient record, THE MedAware SHALL display the Patient Medication Tracker showing all active Medications for that patient.
2. THE MedAware SHALL display for each Medication: name, dose, frequency, scheduled times, last administered time, and next scheduled time.
3. THE MedAware SHALL display the administration history for each Medication for the past 7 days.
4. WHEN a Nurse marks a Dose as administered, THE MedAware SHALL record the administration with the Nurse's identity and timestamp.
5. IF a Medication has an active critical Interaction_Alert, THEN THE MedAware SHALL display a prominent warning on that Medication's entry in the tracker.
6. FOR ALL Medications added to a patient and then retrieved, THE MedAware SHALL return data equivalent to the data submitted (round-trip correctness).

---

### Requirement 15: Clinical Centered Danger Alert (Desktop View 14)

**User Story:** As a Nurse or Doctor, I want a full-screen interruptive alert when a critical medication conflict is detected for a patient, so that I cannot accidentally administer a dangerous medication.

#### Acceptance Criteria

1. WHEN a critical Interaction_Alert is triggered for a patient in a clinical context, THE MedAware SHALL display a centered, modal clinical Danger_Alert that blocks all background interaction.
2. THE clinical Danger_Alert SHALL display the text "DO NOT ADMINISTER" as the primary heading.
3. THE clinical Danger_Alert SHALL display an explanation that the medication is on hold due to a detected conflict.
4. THE clinical Danger_Alert SHALL display the names of the conflicting Medications.
5. THE clinical Danger_Alert SHALL present three action buttons: "Assign Review", "Notify Team", and "Open Patient Record".
6. WHEN the user selects "Assign Review", THE MedAware SHALL add the Medication to the Pharmacist Review_Queue and record the action in the Audit_Log.
7. WHEN the user selects "Notify Team", THE MedAware SHALL create a notification visible to all clinical staff assigned to that patient.
8. WHEN the user selects "Open Patient Record", THE MedAware SHALL navigate to the Patient Medication Tracker for that patient.
9. THE MedAware SHALL NOT allow the clinical Danger_Alert to be dismissed without selecting one of the three actions.
10. IN Clinical mode, a Medication with a critical Interaction_Alert SHALL remain on hold and SHALL NOT be marked administrable until a Pharmacist has reviewed and approved it.

---

### Requirement 16: Care Notes and Rounds (Desktop View 15)

**User Story:** As a Nurse or Doctor, I want to write and review care notes for each patient, so that the care team has a shared record of observations and round decisions.

#### Acceptance Criteria

1. THE MedAware SHALL allow Nurses and Doctors to create care notes for any patient in their assigned ward.
2. WHEN a care note is saved, THE MedAware SHALL record the author's identity, role, and timestamp.
3. THE MedAware SHALL display care notes in reverse chronological order on the patient's record.
4. THE MedAware SHALL allow filtering of care notes by author role (Nurse, Doctor).
5. WHEN a care note is saved, THE MedAware SHALL make it immediately visible to all clinical users with access to that patient.
6. THE MedAware SHALL NOT allow care notes to be deleted; only the Admin may archive notes.

---

### Requirement 17: Pharmacist Review Queue (Desktop View 16)

**User Story:** As a Pharmacist, I want a queue of medications pending my review, so that I can approve or flag medications before they are administered to patients.

#### Acceptance Criteria

1. WHEN a Pharmacist is authenticated, THE MedAware SHALL display the Pharmacist Review Queue as the landing view.
2. THE Review_Queue SHALL display all Medications that have been flagged for pharmacist review, including those escalated via the clinical Danger_Alert.
3. THE MedAware SHALL display for each queued Medication: patient name, medication name, dose, prescribing Doctor, reason for review, and time added to queue.
4. WHEN a Pharmacist approves a Medication, THE MedAware SHALL remove it from the Review_Queue and record the approval in the Audit_Log.
5. WHEN a Pharmacist flags a Medication as unsafe, THE MedAware SHALL place a hold on the Medication, notify the prescribing Doctor, and record the action in the Audit_Log.
6. FOR ALL Medications added to the Review_Queue and then approved, THE MedAware SHALL remove them from the queue (queue membership is mutually exclusive with approved status).

---

### Requirement 18: Outpatient Clinic Queue (Desktop View 17)

**User Story:** As a Nurse or Doctor, I want an outpatient clinic queue showing scheduled patient visits and their medication needs, so that I can prepare for each appointment efficiently.

#### Acceptance Criteria

1. THE MedAware SHALL display a list of scheduled outpatient appointments for the current day, sorted by appointment time.
2. THE MedAware SHALL display for each appointment: patient name, appointment time, reason for visit, and any active Medication flags.
3. WHEN a patient is checked in, THE MedAware SHALL update their status in the queue to "arrived".
4. WHEN a user selects a patient in the clinic queue, THE MedAware SHALL navigate to the Patient Medication Tracker for that patient.

---

### Requirement 19: Discharge Instructions (Desktop View 18)

**User Story:** As a Doctor, I want to generate discharge medication instructions for a patient, so that the patient leaves with a clear, accurate record of their ongoing medication plan.

#### Acceptance Criteria

1. THE MedAware SHALL allow a Doctor to generate discharge instructions for a patient from the Patient Medication Tracker.
2. THE discharge instructions SHALL list all active Medications with name, dose, frequency, and special instructions.
3. THE discharge instructions SHALL include any active Interaction_Alerts with the disclaimer "Demo/Academic Logic — Not Real Medical Advice."
4. WHEN discharge instructions are generated, THE MedAware SHALL record the generating Doctor's identity and timestamp in the Audit_Log.
5. THE MedAware SHALL allow discharge instructions to be exported as a printable PDF or displayed as a formatted on-screen view.
6. FOR ALL patients with active Medications at discharge, THE discharge instructions SHALL reference every active Medication without omission.

---

### Requirement 20: Admin Roles and Audit Logs (Desktop View 19)

**User Story:** As an Admin, I want to manage user roles and review a complete audit log of system actions, so that I can maintain security, compliance, and accountability.

#### Acceptance Criteria

1. WHEN an Admin is authenticated, THE MedAware SHALL display the Admin Roles and Audit Logs view.
2. THE MedAware SHALL allow an Admin to assign, change, or revoke roles for any user.
3. WHEN a role change is made, THE MedAware SHALL record the change in the Audit_Log with the Admin's identity, the affected user, the old role, the new role, and a timestamp.
4. THE MedAware SHALL display the Audit_Log as a paginated, filterable table sorted by timestamp descending.
5. THE Audit_Log SHALL be append-only; THE MedAware SHALL NOT allow any user, including Admin, to delete or modify Audit_Log entries.
6. THE MedAware SHALL allow filtering the Audit_Log by user, action type, date range, and role.
7. FOR ALL role changes and alert acknowledgements performed in the system, THE MedAware SHALL produce exactly one corresponding Audit_Log entry (completeness invariant).
8. THE MedAware SHALL allow an Admin to export the Audit_Log as a CSV file.

---

### Requirement 21: Admin System Overview (Desktop View 20)

**User Story:** As an Admin, I want a deployment architecture and system overview view, so that I can monitor system health and understand the deployment topology.

#### Acceptance Criteria

1. THE MedAware SHALL provide a system overview view accessible only to Admin users.
2. THE system overview SHALL display the deployment architecture including: Next.js frontend, Supabase backend, and Vercel hosting.
3. THE system overview SHALL display current system status indicators for: database connectivity, authentication service, and sync service.
4. WHEN any system component reports an unhealthy status, THE MedAware SHALL display a warning indicator on the system overview.

---

### Requirement 22: Mobile Home Timer (Mobile View 1)

**User Story:** As a Civilian_User on a mobile device, I want a mobile-optimized home screen showing my next dose countdown, so that I can quickly check my medication schedule from my phone.

#### Acceptance Criteria

1. THE MedAware SHALL provide a mobile-responsive home view displaying the next Dose countdown timer prominently.
2. THE mobile home view SHALL display the medication name, dose, and scheduled time for the next Dose.
3. THE mobile home view SHALL display a safety alert indicator when active Interaction_Alerts exist.
4. THE countdown timer value displayed on mobile SHALL be greater than or equal to zero at all times.
5. WHEN a Dose time passes on mobile, THE MedAware SHALL update the countdown to the next scheduled Dose.

---

### Requirement 23: Mobile Add Medication (Mobile View 2)

**User Story:** As a Civilian_User on a mobile device, I want to add a new medication from my phone, so that I can update my medication list on the go.

#### Acceptance Criteria

1. THE MedAware SHALL provide a mobile-optimized version of the Guided Add Medication flow.
2. THE mobile add medication flow SHALL use full-screen steps optimized for touch interaction.
3. THE MedAware SHALL apply the same validation and Safety Pre-Check logic on mobile as on desktop (Requirement 4 and 5).

---

### Requirement 24: Mobile Danger Alert (Mobile View 3)

**User Story:** As a Civilian_User on a mobile device, I want a full-screen danger alert when a critical interaction is detected, so that I cannot miss a critical safety warning on my phone.

#### Acceptance Criteria

1. WHEN a critical Interaction_Alert is triggered on mobile, THE MedAware SHALL display a full-screen Danger_Alert.
2. THE mobile Danger_Alert SHALL include all required elements from Requirement 6 (heading, explanation, advisory text, three action buttons).
3. THE mobile Danger_Alert SHALL be optimized for touch interaction with buttons meeting a minimum touch target size of 44×44 CSS pixels.

---

### Requirement 25: Mobile Interaction Detail (Mobile View 4)

**User Story:** As a Civilian_User on a mobile device, I want to view interaction details in a mobile-optimized layout, so that I can read and act on the information comfortably on a small screen.

#### Acceptance Criteria

1. THE MedAware SHALL provide a mobile-optimized version of the Interaction Detail and Triage view (Requirement 7).
2. THE mobile interaction detail view SHALL display all information from the desktop version in a single-column, scrollable layout.

---

### Requirement 26: Mobile Adherence Risk (Mobile View 5)

**User Story:** As a Civilian_User on a mobile device, I want to view my adherence risk summary on my phone, so that I can monitor my medication habits anywhere.

#### Acceptance Criteria

1. THE MedAware SHALL provide a mobile-optimized version of the Adherence Risk Dashboard (Requirement 8).
2. THE mobile adherence view SHALL display the Adherence_Score, risk category, and a 7-day dose history in a touch-friendly layout.

---

### Requirement 27: Mobile Care Circle (Mobile View 6)

**User Story:** As a Civilian_User on a mobile device, I want to manage my Care Circle from my phone, so that I can add or remove caregivers while away from a desktop.

#### Acceptance Criteria

1. THE MedAware SHALL provide a mobile-optimized version of the Care Circle Sharing view (Requirement 9).
2. THE mobile care circle view SHALL allow inviting, viewing, and removing Care_Circle members.

---

### Requirement 28: Mobile Offline State (Mobile View 7)

**User Story:** As a Civilian_User on a mobile device with no connectivity, I want the app to remain usable and clearly indicate offline status, so that I can still log doses during outages.

#### Acceptance Criteria

1. THE MedAware SHALL display a persistent offline banner on mobile when the device has no network connectivity.
2. WHILE offline on mobile, THE MedAware SHALL allow the user to mark Doses as taken and queue the action in the Offline_Queue.
3. WHEN connectivity is restored on mobile, THE MedAware SHALL sync the Offline_Queue as described in Requirement 10.

---

### Requirement 29: Mobile Hospital Board (Mobile View 8)

**User Story:** As a Nurse or Doctor on a mobile device, I want a mobile-optimized patient board, so that I can check patient statuses during rounds without a desktop.

#### Acceptance Criteria

1. THE MedAware SHALL provide a mobile-optimized version of the Hospital Patient Board (Requirement 12).
2. THE mobile patient board SHALL display patient name, room number, and risk state in a card-based layout.
3. WHEN a user selects a patient card on mobile, THE MedAware SHALL navigate to the mobile Patient Tracker for that patient.

---

### Requirement 30: Mobile Patient Tracker (Mobile View 9)

**User Story:** As a Nurse or Doctor on a mobile device, I want to view and update a patient's medication tracker from my phone, so that I can record administrations at the bedside.

#### Acceptance Criteria

1. THE MedAware SHALL provide a mobile-optimized version of the Patient Medication Tracker (Requirement 14).
2. THE mobile patient tracker SHALL allow a Nurse to mark a Dose as administered with a single tap.
3. THE MedAware SHALL apply the same data recording rules on mobile as on desktop (Requirement 14, criteria 4).

---

### Requirement 31: Mobile Clinic Queue (Mobile View 10)

**User Story:** As a Nurse or Doctor on a mobile device, I want to view the outpatient clinic queue on my phone, so that I can prepare for patient visits while moving between rooms.

#### Acceptance Criteria

1. THE MedAware SHALL provide a mobile-optimized version of the Outpatient Clinic Queue (Requirement 18).
2. THE mobile clinic queue SHALL display appointments in a scrollable list sorted by time.

---

### Requirement 32: Mobile Pharmacist Queue (Mobile View 11)

**User Story:** As a Pharmacist on a mobile device, I want to review and act on my medication review queue from my phone, so that I can approve or flag medications without being at a desktop.

#### Acceptance Criteria

1. THE MedAware SHALL provide a mobile-optimized version of the Pharmacist Review Queue (Requirement 17).
2. THE mobile pharmacist queue SHALL allow approving or flagging a Medication with a single tap.

---

### Requirement 33: Mobile Settings (Mobile View 12)

**User Story:** As any user on a mobile device, I want to access and update my settings from my phone, so that I can manage accessibility preferences and notifications on the go.

#### Acceptance Criteria

1. THE MedAware SHALL provide a mobile-optimized version of the Accessibility and Settings view (Requirement 11).
2. THE mobile settings view SHALL allow updating font size, contrast mode, and notification preferences.
3. WHEN settings are saved on mobile, THE MedAware SHALL persist them to the user's profile identically to the desktop flow.

---

### Requirement 34: Widget Mockups (4 Widget Designs)

**User Story:** As a Civilian_User, I want to see iOS and Android home screen widget mockups showing my next dose countdown, so that I can understand what a future native widget experience would look like.

#### Acceptance Criteria

1. THE MedAware SHALL provide four widget mockup designs rendered as in-app web views: iOS light, iOS dark, Android light, and Android dark.
2. EACH widget mockup SHALL display: next Dose countdown, medication name, scheduled time, intake note, and safety status (if an active Interaction_Alert exists).
3. THE widget countdown value displayed SHALL be greater than or equal to zero at all times.
4. THE widget mockup data SHALL be consistent with the data displayed on the Civilian Medication Dashboard for the same user.
5. THE MedAware SHALL display widget mockups only for Civilian_User accounts; clinical roles SHALL NOT have widget mockup access.
6. WHEN no active Interaction_Alert exists, THE MedAware SHALL display a safe status indicator on the widget mockup.
7. WHEN an active Interaction_Alert exists, THE MedAware SHALL display a warning indicator on the widget mockup.
8. **Scope Note:** iOS and Android OS-level widgets are OUT OF SCOPE for this web deployment. The widget mockups in this version are web-rendered prototype views only. Real OS-level widget support would require a future native mobile implementation (Swift/WidgetKit for iOS, Jetpack Glance for Android).

---

### Requirement 35: Medical Safety and Disclaimer Compliance

**User Story:** As a product owner, I want the application to clearly communicate that all interaction logic is academic/demo only, so that users are never misled into treating the app as a substitute for professional medical advice.

#### Acceptance Criteria

1. THE MedAware SHALL display the disclaimer "This application uses demo/academic logic for medication interaction detection. It does NOT provide real medical advice." on the Safety Pre-Check view, Interaction Detail view, and Danger Alert views.
2. THE MedAware SHALL label all Mock_Interaction_Rules as "Demo Logic" in any view that displays interaction results.
3. THE MedAware SHALL NOT claim or imply that its interaction detection is clinically validated.
4. THE MedAware SHALL display the medical safety disclaimer on the Login view.
5. WHEN discharge instructions are generated, THE MedAware SHALL include the medical safety disclaimer in the output.
6. THE MedAware SHALL display the medical safety disclaimer prominently on the Login view, Safety Pre-Check view, Interaction Detail view, all Danger Alert views, and Discharge Instructions.
7. THE disclaimer text SHALL read: "⚠️ Academic Prototype — This application uses mock/demo medication interaction rules only. It does NOT provide real medical advice and must NOT be used for real clinical decision-making. Real deployment requires verified drug-interaction databases and licensed clinical review."

---

### Requirement 36: Caregiver Role Capabilities

**User Story:** As a Caregiver, I want to manage medications and monitor adherence for the users in my Care Circle, so that I can support their health without requiring them to manage everything themselves.

#### Acceptance Criteria

1. WHEN a Caregiver is authenticated, THE MedAware SHALL display the Civilian Medication Dashboard for each user in their Care_Circle.
2. WHERE a Caregiver has manage permissions for a user, THE MedAware SHALL allow the Caregiver to add, edit, and mark Doses for that user's Medications.
3. WHERE a Caregiver has view-only permissions, THE MedAware SHALL display the user's dashboard in read-only mode.
4. THE MedAware SHALL send a notification to the Caregiver when a user in their Care_Circle has a missed Dose or a new Interaction_Alert.
5. THE MedAware SHALL NOT allow a Caregiver to access any data outside their assigned Care_Circle.

---

### Requirement 37: Notification and Dose Reminders

**User Story:** As a Civilian_User or Caregiver, I want to receive dose reminders before scheduled times, so that I never miss a medication.

#### Acceptance Criteria

1. THE MedAware SHALL send a dose reminder notification to the user at the configured reminder interval before each scheduled Dose.
2. THE MedAware SHALL support reminder intervals of 15 minutes, 30 minutes, and 60 minutes before the scheduled Dose time.
3. WHEN a user marks a Dose as taken, THE MedAware SHALL cancel any pending reminder for that Dose.
4. THE MedAware SHALL allow users to disable dose reminders for individual Medications.
5. WHEN a Dose is missed (scheduled time passes without being marked taken), THE MedAware SHALL send a missed-dose notification.

---

### Requirement 38: Data Persistence and Supabase Integration

**User Story:** As a developer, I want all application data persisted in Supabase PostgreSQL with RLS enforced, so that data is secure, consistent, and accessible across devices.

#### Acceptance Criteria

1. THE MedAware SHALL persist all Medications, Doses, Interaction_Alerts, Care_Circle memberships, care notes, and Audit_Log entries in Supabase PostgreSQL.
2. THE MedAware SHALL enforce Supabase RLS policies on all tables so that users can only read and write data within their permitted scope.
3. THE MedAware SHALL use Supabase Auth for all authentication and Session management.
4. FOR ALL data written to Supabase and then read back, THE MedAware SHALL return data equivalent to the data written (round-trip correctness).
5. THE MedAware SHALL use database transactions for operations that modify multiple related records (e.g., adding a Medication and triggering an Interaction_Alert check).

---

### Requirement 39: Brand and Visual Design Compliance

**User Story:** As a product owner, I want the application to consistently apply the MedAware brand identity, so that the product feels premium, cohesive, and trustworthy.

#### Acceptance Criteria

1. THE MedAware SHALL use the following color tokens throughout the application: Primary #FF3F4D, Secondary coral #FF6B74, Soft pink #FFE8EC, Rose background #FFF6F7, App background #F6F8FB, Text #101828, Muted #667085, Border #E6EAF0, Success #12B76A, Warning #F59E0B, Info #2E90FA.
2. THE MedAware SHALL apply a modern, premium healthcare visual style: clean, spacious, rounded corners, and calm typography.
3. THE MedAware SHALL use Tailwind CSS utility classes for all styling, with design tokens defined in the Tailwind configuration.
4. THE MedAware SHALL use Framer Motion for all animated transitions and micro-interactions.
5. THE MedAware SHALL use Lucide React for all iconography.
6. THE MedAware SHALL display the tagline "Your health. On time." on the Login view.

---

### Requirement 40: Deployment and Environment

**User Story:** As a developer, I want the application to be fully deployable on Vercel with a documented setup process, so that the school deliverable can be demonstrated in a live environment.

#### Acceptance Criteria

1. THE MedAware SHALL be deployable to Vercel using the Next.js App Router build output.
2. THE MedAware SHALL include a README with step-by-step setup instructions covering: environment variable configuration, Supabase project setup, database schema migration, seed data loading, and Vercel deployment.
3. THE MedAware SHALL include a `.env.example` file listing all required environment variables without exposing secret values.
4. THE MedAware SHALL include demo accounts for each of the six roles with documented credentials in the README.
5. THE MedAware SHALL include a Supabase SQL migration file that creates all required tables, RLS policies, and seed data.

---

### Requirement 41: Implementation Phases

**User Story:** As a developer, I want a phased implementation plan, so that a working MVP can be deployed first and additional features can be added incrementally.

#### Acceptance Criteria

**Phase 1 — MVP (must be complete for initial deployment):**
1. THE MedAware Phase 1 SHALL implement: Supabase Auth, role selection, Civilian Dashboard, Guided Add Medication, mock interaction checks, Centered Danger Alert (civilian), Interaction Detail, Hospital Patient Board, Patient Medication Tracker, Admin Audit Log, seed data for all six demo accounts, and Vercel deployment.
2. ALL Phase 1 features SHALL be fully functional and deployable before Phase 2 work begins.

**Phase 2 — Extended Features:**
3. THE MedAware Phase 2 SHALL implement: Adherence Risk Dashboard, Care Circle Sharing, Outpatient Clinic Queue, Pharmacist Review Queue, Discharge Instructions, mobile-responsive views, and widget mockup pages.

**Phase 3 — Advanced Features:**
4. THE MedAware Phase 3 SHALL implement: offline sync with Offline_Queue, real-time alerts via Supabase Realtime, push notification infrastructure, PDF export for discharge instructions, and PWA installability.

---

### Requirement 42: Application Routes

**User Story:** As a developer, I want a defined set of application routes, so that navigation, access control, and deep-linking are consistent and predictable.

#### Acceptance Criteria

1. THE MedAware SHALL implement the following routes:
   - `/login` — Login and Role Selection (unauthenticated entry point)
   - `/role-select` — Role selection step (for users with multiple roles)
   - `/dashboard` — Civilian Medication Dashboard (Civilian_User and Caregiver)
   - `/medications/new` — Guided Add Medication
   - `/interactions` — Interaction Detail and Triage
   - `/adherence` — Adherence Risk Dashboard
   - `/care-circle` — Care Circle Sharing
   - `/settings` — Accessibility and Settings
   - `/clinical/patients` — Hospital Patient Board (Nurse, Doctor)
   - `/clinical/alerts` — Hospital Alert Center (Nurse, Doctor, Pharmacist)
   - `/clinical/patients/[id]` — Patient Medication Tracker (Nurse, Doctor, Pharmacist)
   - `/clinical/pharmacist` — Pharmacist Review Queue (Pharmacist)
   - `/clinical/clinic` — Outpatient Clinic Queue (Nurse, Doctor)
   - `/clinical/discharge/[id]` — Discharge Instructions (Doctor)
   - `/admin` — Admin Roles and Audit Logs (Admin)
2. THE MedAware SHALL enforce role-based access on each route as defined in Requirement 2.
3. IF an unauthenticated user accesses any route other than `/login`, THE MedAware SHALL redirect to `/login`.

---

### Requirement 43: Seeded Demo Accounts

**User Story:** As a developer or evaluator, I want pre-seeded demo accounts for each role, so that the application can be demonstrated without manual account setup.

#### Acceptance Criteria

1. THE MedAware SHALL include seeded demo accounts for all six roles with the following credentials documented in the README:
   - Civilian User: `civilian@medaware.demo`
   - Caregiver: `caregiver@medaware.demo`
   - Nurse: `nurse@medaware.demo`
   - Doctor: `doctor@medaware.demo`
   - Pharmacist: `pharmacist@medaware.demo`
   - Admin: `admin@medaware.demo`
2. EACH demo account SHALL have a documented password in the README for academic demonstration purposes. THE `.env.example` file SHALL contain only placeholder environment variable names and SHALL NOT contain real passwords or secrets.
3. THE seed data SHALL include sample medications, dose schedules, interaction alerts, care notes, and audit log entries sufficient to demonstrate all Phase 1 features.
4. THE MedAware SHALL include a Supabase SQL seed file that creates all demo accounts, sample data, and RLS-compliant records.

---

## Correctness Properties for Testing

The following properties define testable invariants and round-trip behaviors that MUST hold across all inputs. These are intended for property-based testing.

### Property 1: Countdown Timer Non-Negativity

FOR ALL scheduled Doses, THE MedAware SHALL compute a countdown value that is greater than or equal to zero. A countdown value SHALL never be displayed as a negative number.

### Property 2: Medication Data Round-Trip

FOR ALL Medications submitted through the add medication flow, THE MedAware SHALL store and retrieve data such that the retrieved Medication is equivalent to the submitted Medication (same name, dose, dose unit, schedule, notes). This applies to both civilian and clinical contexts.

### Property 3: Adherence Score Monotonicity

FOR ALL sequences of Dose history for a given user, THE MedAware SHALL compute the Adherence_Score such that adding a missed Dose to the history does not increase the score. Formally: `score(history + [missed]) ≤ score(history)`.

### Property 4: Interaction Alert Completeness

FOR ALL pairs of active Medications for a given user where a Mock_Interaction_Rule flags the pair as conflicting, THE MedAware SHALL surface an Interaction_Alert. No conflicting pair SHALL be silently ignored.

### Property 5: Audit Log Append-Only Invariant

FOR ALL sequences of system actions (role changes, alert acknowledgements, approvals), THE MedAware SHALL produce an Audit_Log such that the number of entries only ever increases. No entry SHALL be removed or modified after creation. Formally: `|log(t2)| ≥ |log(t1)|` for all `t2 > t1`.

### Property 6: Idempotent Offline Sync

FOR ALL sets of actions queued in the Offline_Queue and then synced, THE MedAware SHALL produce a server state equivalent to performing those actions online. Syncing the same Offline_Queue twice SHALL NOT produce duplicate records or double-counted Dose markings.

### Property 7: Review Queue Membership Exclusivity

FOR ALL Medications in the Pharmacist Review_Queue, once a Medication is approved or rejected, THE MedAware SHALL remove it from the queue. A Medication SHALL NOT appear in both the approved state and the Review_Queue simultaneously.

### Property 8: Widget Data Consistency

FOR ALL Civilian_Users with an active Medication schedule, THE MedAware SHALL display widget data (next Dose countdown, medication name, scheduled time) that is consistent with the data on the Civilian Medication Dashboard for the same user at the same point in time.

### Property 9: Role Access Exclusivity

FOR ALL authenticated users, THE MedAware SHALL grant access only to routes permitted for the user's assigned role as defined in Requirements 2 and 42. For any role R and any route outside R's permitted set, an access attempt SHALL return an unauthorized response. This property must hold for all valid role values and all defined routes.

### Property 10: Discharge Instructions Completeness

FOR ALL patients with one or more active Medications at the time of discharge instruction generation, THE MedAware SHALL include every active Medication in the generated discharge instructions. No active Medication SHALL be omitted.
