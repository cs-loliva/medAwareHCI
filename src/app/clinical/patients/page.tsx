import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/server";
import { getEffectiveRole, isRole, type Role } from "@/lib/auth/roles";
import {
  getAccessiblePatientIds,
  getCurrentUserWithRoles,
  isAdmin,
} from "@/lib/auth/clinicalAccess";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

type Patient = {
  id: string;
  full_name: string;
  room_number: string | null;
  ward: string | null;
  primary_diagnosis: string | null;
  allergies: string[];
  status: "admitted" | "discharged" | "outpatient";
  admission_date: string | null;
};

type ClinicalAlert = {
  id: string;
  patient_id: string;
  severity: "critical" | "moderate" | "low";
  description: string;
  status: string;
  created_at: string;
};

type PatientMedication = {
  id: string;
  patient_id: string;
  name: string;
  dose_amount: number;
  dose_unit: string;
  frequency: string;
  status: string;
};

type PatientSchedule = {
  id: string;
  patient_medication_id: string;
  scheduled_time: string;
};

function getRiskState(patientId: string, alerts: ClinicalAlert[]) {
  const patientAlerts = alerts.filter((alert) => alert.patient_id === patientId);

  if (patientAlerts.some((alert) => alert.severity === "critical")) {
    return "critical";
  }

  if (patientAlerts.some((alert) => alert.severity === "moderate")) {
    return "caution";
  }

  return "safe";
}

function getRiskVariant(risk: "critical" | "caution" | "safe") {
  if (risk === "critical") return "danger";
  if (risk === "caution") return "warning";
  return "success";
}

function formatTime(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  const date = new Date();
  date.setHours(hour, minute, 0, 0);

  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function getNextMedicationAction(
  patientId: string,
  medications: PatientMedication[],
  schedules: PatientSchedule[]
) {
  const patientMedications = medications.filter(
    (medication) =>
      medication.patient_id === patientId &&
      medication.status !== "discontinued"
  );

  const candidates = patientMedications.flatMap((medication) => {
    const medicationSchedules = schedules.filter(
      (schedule) => schedule.patient_medication_id === medication.id
    );

    return medicationSchedules.map((schedule) => ({
      medication,
      scheduledTime: schedule.scheduled_time,
    }));
  });

  if (candidates.length === 0) {
    return "No scheduled medication action";
  }

  const now = new Date();

  const next = candidates
    .map((candidate) => {
      const [hour, minute] = candidate.scheduledTime.split(":").map(Number);
      const scheduledToday = new Date(now);
      scheduledToday.setHours(hour, minute, 0, 0);

      const scheduledAt =
        scheduledToday.getTime() <= now.getTime()
          ? new Date(scheduledToday.getTime() + 24 * 60 * 60 * 1000)
          : scheduledToday;

      return {
        ...candidate,
        scheduledAt,
      };
    })
    .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())[0];

  return `${next.medication.name} ${next.medication.dose_amount} ${
    next.medication.dose_unit
  } at ${formatTime(next.scheduledTime)}`;
}

export default async function PatientBoardPage() {
  const { user, roleNames: roles, supabase } = await getCurrentUserWithRoles();

  const activeRole = (await cookies()).get("medaware_active_role")?.value;
  const effectiveRole = getEffectiveRole(roles, activeRole);
  const dashboardTitle =
    effectiveRole === "doctor"
      ? "Doctor Dashboard"
      : effectiveRole === "pharmacist"
      ? "Pharmacist Dashboard"
      : "Nurse Dashboard";
  const dashboardSubtitle =
    effectiveRole === "doctor"
      ? "Review patient medication plans, clinical alerts, and discharge workflows."
      : effectiveRole === "pharmacist"
      ? "Review escalated medications, approve safe therapies, and flag unsafe orders."
      : "Review assigned patients, medication schedules, and active clinical alerts.";
  const accessiblePatientIds = await getAccessiblePatientIds(user.id, roles);
  const canViewAllPatients = isAdmin(roles);

  const [
    patientsResponse,
    alertsResponse,
    medicationsResponse,
    schedulesResponse,
  ] = await Promise.all([
    (canViewAllPatients
      ? supabase
      .from("patients")
      .select(
        "id, full_name, room_number, ward, primary_diagnosis, allergies, status, admission_date"
      )
      : supabase
          .from("patients")
          .select(
            "id, full_name, room_number, ward, primary_diagnosis, allergies, status, admission_date"
          )
          .in("id", accessiblePatientIds ?? ["__none__"]))
      .order("room_number", { ascending: true }),

    supabase
      .from("clinical_alerts")
      .select("id, patient_id, severity, description, status, created_at")
      .eq("status", "active")
      .order("created_at", { ascending: false }),

    supabase
      .from("patient_medications")
      .select("id, patient_id, name, dose_amount, dose_unit, frequency, status"),

    supabase
      .from("patient_medication_schedules")
      .select("id, patient_medication_id, scheduled_time"),
  ]);

  const patients = (patientsResponse.data ?? []) as Patient[];
  const alerts = (alertsResponse.data ?? []) as ClinicalAlert[];
  const medications = (medicationsResponse.data ?? []) as PatientMedication[];
  const schedules = (schedulesResponse.data ?? []) as PatientSchedule[];

  const criticalCount = alerts.filter(
    (alert) => alert.severity === "critical"
  ).length;

  const admittedCount = patients.filter(
    (patient) => patient.status === "admitted"
  ).length;

  const outpatientCount = patients.filter(
    (patient) => patient.status === "outpatient"
  ).length;

  return (
    <AppShell
      title={dashboardTitle}
      subtitle={dashboardSubtitle}
      activePath="/clinical/patients"
    >
      <div className="grid gap-5 md:grid-cols-3">
        <Card>
          <Badge variant="info">Admitted</Badge>
          <p className="mt-4 text-3xl font-black">{admittedCount}</p>
          <p className="mt-2 text-sm text-[#667085]">Current inpatients</p>
        </Card>

        <Card>
          <Badge variant="warning">Outpatient</Badge>
          <p className="mt-4 text-3xl font-black">{outpatientCount}</p>
          <p className="mt-2 text-sm text-[#667085]">Clinic-linked patients</p>
        </Card>

        <Card>
          <Badge variant={criticalCount > 0 ? "danger" : "success"}>
            Critical alerts
          </Badge>
          <p className="mt-4 text-3xl font-black">{criticalCount}</p>
          <p className="mt-2 text-sm text-[#667085]">Active clinical dangers</p>
        </Card>
      </div>

      {patientsResponse.error ||
      alertsResponse.error ||
      medicationsResponse.error ||
      schedulesResponse.error ? (
        <Card className="mt-5">
          <Badge variant="danger">Load warning</Badge>
          <p className="mt-3 text-sm leading-6 text-[#667085]">
            {patientsResponse.error?.message ??
              alertsResponse.error?.message ??
              medicationsResponse.error?.message ??
              schedulesResponse.error?.message}
          </p>
        </Card>
      ) : null}

      <Card className="mt-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-black">Patient board</h2>
            <p className="mt-2 text-sm text-[#667085]">
              Loaded from Supabase demo patient, medication, and alert records.
            </p>
          </div>

          <Link
            href="/clinical/reviews"
            className="rounded-2xl bg-[#FF3F4D] px-5 py-3 text-sm font-black text-white"
          >
            Open review queue
          </Link>
        </div>

        <div className="mt-6 space-y-4">
  {patients.length === 0 ? (
    <div className="rounded-3xl bg-[#F6F8FB] p-5 text-sm text-[#667085]">
      No assigned patients found.
    </div>
  ) : (
    patients.map((patient) => {
      const risk = getRiskState(patient.id, alerts);
      const patientAlerts = alerts.filter(
        (alert) => alert.patient_id === patient.id
      );
      const nextAction = getNextMedicationAction(
        patient.id,
        medications,
        schedules
      );

      return (
        <div
          key={patient.id}
          className="rounded-[2rem] border border-[#E6EAF0] bg-[#F6F8FB] p-5"
        >
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-2xl font-black">
                  {patient.full_name}
                </h3>

                <Badge variant={getRiskVariant(risk)}>{risk}</Badge>

                <Badge variant="default">{patient.status}</Badge>
              </div>

              <p className="mt-2 text-sm leading-6 text-[#667085]">
                Room {patient.room_number ?? "N/A"} •{" "}
                {patient.ward ?? "No ward"} •{" "}
                {patient.primary_diagnosis ?? "No diagnosis listed"}
              </p>

              {patient.allergies.length > 0 ? (
                <p className="mt-2 text-sm font-bold text-[#FF3F4D]">
                  Allergies: {patient.allergies.join(", ")}
                </p>
              ) : null}
            </div>

            <div className="rounded-3xl bg-white p-5 xl:w-96">
              <p className="text-xs font-black uppercase tracking-wide text-[#667085]">
                Next medication action
              </p>
              <p className="mt-2 text-sm font-bold text-[#101828]">
                {nextAction}
              </p>

              <Link
                href={`/clinical/patients/${patient.id}`}
                className="mt-4 inline-block rounded-2xl bg-[#FF3F4D] px-4 py-2 text-sm font-black text-white"
              >
                Open tracker
              </Link>
            </div>
          </div>

          {patientAlerts.length > 0 ? (
            <div className="mt-5 rounded-3xl bg-[#FFF6F7] p-5">
              <p className="text-sm font-black text-[#FF3F4D]">
                Active alerts
              </p>
              <div className="mt-3 space-y-3">
                {patientAlerts.map((alert) => (
                  <div key={alert.id}>
                    <Badge variant={getRiskVariant(risk)}>
                      {alert.severity}
                    </Badge>
                    <p className="mt-2 text-sm leading-6 text-[#667085]">
                      {alert.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      );
    })
  )}
</div>
      </Card>

      <Card className="mt-5">
        <p className="text-sm font-black text-[#FF3F4D]">
          Academic prototype disclaimer
        </p>
        <p className="mt-2 text-sm leading-6 text-[#667085]">
          Clinical risk labels use seeded demo medication alerts only. This app
          does not provide real clinical decision support.
        </p>
      </Card>
    </AppShell>
  );
}
