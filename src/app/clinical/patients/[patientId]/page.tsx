import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { AdministerMedicationForm } from "@/components/features/clinical/AdministerMedicationForm";
import { createClient } from "@/lib/supabase/server";
import { canAccessPatient, getCurrentUserWithRoles } from "@/lib/auth/clinicalAccess";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    patientId: string;
  }>;
  searchParams?: Promise<{
    message?: string;
    error?: string;
  }>;
};

type Patient = {
  id: string;
  full_name: string;
  date_of_birth: string | null;
  room_number: string | null;
  ward: string | null;
  primary_diagnosis: string | null;
  allergies: string[];
  status: "admitted" | "discharged" | "outpatient";
};

type PatientMedication = {
  id: string;
  patient_id: string;
  name: string;
  dose_amount: number;
  dose_unit: string;
  frequency: string;
  special_instructions: string | null;
  status: "active" | "on_hold" | "pending_review" | "approved" | "discontinued";
  hold_reason: string | null;
};

type PatientSchedule = {
  id: string;
  patient_medication_id: string;
  scheduled_time: string;
};

type ClinicalAlert = {
  id: string;
  patient_id: string;
  patient_medication_id_a: string;
  patient_medication_id_b: string;
  severity: "critical" | "moderate" | "low";
  rule_key: string;
  description: string;
  status: "active" | "acknowledged" | "resolved";
};

type Administration = {
  id: string;
  patient_medication_id: string;
  scheduled_at: string;
  administered_at: string | null;
  status: "administered" | "missed" | "held" | "skipped";
  notes: string | null;
};

function getStatusVariant(status: PatientMedication["status"]) {
  if (status === "active" || status === "approved") return "success";
  if (status === "on_hold" || status === "pending_review") return "warning";
  return "default";
}

function getAlertVariant(severity: ClinicalAlert["severity"]) {
  if (severity === "critical") return "danger";
  if (severity === "moderate") return "warning";
  return "info";
}

function getAdministrationVariant(status: Administration["status"]) {
  if (status === "administered") return "success";
  if (status === "missed" || status === "held") return "danger";
  return "warning";
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

function formatDateTime(value: string | null) {
  if (!value) return "Not recorded";

  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

async function getCurrentUser() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

async function markDoseAdministered(formData: FormData) {
  "use server";

  const user = await getCurrentUser();
  const supabase = await createClient();

  const patientId = String(formData.get("patientId") ?? "");
  const medicationId = String(formData.get("medicationId") ?? "");

  if (!patientId || !medicationId) {
    redirect(`/clinical/patients/${patientId}?error=Missing medication details.`);
  }

  const { error } = await supabase
    .from("patient_medication_administrations")
    .insert({
      patient_id: patientId,
      patient_medication_id: medicationId,
      administered_by: user.id,
      scheduled_at: new Date().toISOString(),
      administered_at: new Date().toISOString(),
      status: "administered",
      notes: "Marked administered from MedAware clinical tracker.",
    });

  if (error) {
    redirect(
      `/clinical/patients/${patientId}?error=${encodeURIComponent(
        error.message
      )}`
    );
  }

  revalidatePath(`/clinical/patients/${patientId}`);
  redirect(`/clinical/patients/${patientId}?message=Dose marked administered.`);
}

export default async function PatientMedicationTrackerPage({
  params,
  searchParams,
}: PageProps) {
  const { patientId } = await params;
  const query = searchParams ? await searchParams : {};
  const { user, roleNames, supabase } = await getCurrentUserWithRoles();
  const hasAccess = await canAccessPatient(user.id, roleNames, patientId);
  if (!hasAccess) {
    redirect("/clinical/patients?error=Patient access denied.");
  }

  const [
    patientResponse,
    medicationsResponse,
    schedulesResponse,
    alertsResponse,
    administrationsResponse,
  ] = await Promise.all([
    supabase
      .from("patients")
      .select(
        "id, full_name, date_of_birth, room_number, ward, primary_diagnosis, allergies, status"
      )
      .eq("id", patientId)
      .single(),

    supabase
      .from("patient_medications")
      .select(
        "id, patient_id, name, dose_amount, dose_unit, frequency, special_instructions, status, hold_reason"
      )
      .eq("patient_id", patientId)
      .order("created_at", { ascending: true }),

    supabase
      .from("patient_medication_schedules")
      .select("id, patient_medication_id, scheduled_time")
      .order("scheduled_time", { ascending: true }),

    supabase
      .from("clinical_alerts")
      .select(
        "id, patient_id, patient_medication_id_a, patient_medication_id_b, severity, rule_key, description, status"
      )
      .eq("patient_id", patientId)
      .eq("status", "active")
      .order("created_at", { ascending: false }),

    supabase
      .from("patient_medication_administrations")
      .select("id, patient_medication_id, scheduled_at, administered_at, status, notes")
      .eq("patient_id", patientId)
      .order("scheduled_at", { ascending: false })
      .limit(20),
  ]);

  if (patientResponse.error || !patientResponse.data) {
    return (
      <AppShell
        title="Patient Medication Tracker"
        subtitle="The selected patient could not be loaded."
        activePath="/clinical/patients"
      >
        <Card>
          <Badge variant="danger">Patient not found</Badge>
          <h2 className="mt-4 text-2xl font-black">
            Could not load patient record
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#667085]">
            {patientResponse.error?.message ??
              "The patient record does not exist or cannot be accessed."}
          </p>
          <Link
            href="/clinical/patients"
            className="mt-6 inline-block rounded-2xl bg-[#FF3F4D] px-5 py-3 text-sm font-black text-white"
          >
            Back to patient board
          </Link>
        </Card>
      </AppShell>
    );
  }

  const patient = patientResponse.data as Patient;
  const medications = (medicationsResponse.data ?? []) as PatientMedication[];
  const allSchedules = (schedulesResponse.data ?? []) as PatientSchedule[];
  const alerts = (alertsResponse.data ?? []) as ClinicalAlert[];
  const administrations =
    (administrationsResponse.data ?? []) as Administration[];

  const medicationIds = new Set(medications.map((medication) => medication.id));
  const schedules = allSchedules.filter((schedule) =>
    medicationIds.has(schedule.patient_medication_id)
  );

  const criticalAlerts = alerts.filter((alert) => alert.severity === "critical");

  return (
    <AppShell
      title="Patient Medication Tracker"
      subtitle={`${patient.full_name} • Room ${
        patient.room_number ?? "N/A"
      } • ${patient.primary_diagnosis ?? "No diagnosis listed"}`}
      activePath="/clinical/patients"
    >
      {query.message ? (
        <Card className="mb-5 border-[#12B76A]/40 bg-[#EAFBF3]">
          <Badge variant="success">Success</Badge>
          <p className="mt-3 text-sm font-bold text-[#101828]">
            {query.message}
          </p>
        </Card>
      ) : null}

      {query.error ? (
        <Card className="mb-5 border-[#FF3F4D]/40 bg-[#FFF6F7]">
          <Badge variant="danger">Error</Badge>
          <p className="mt-3 text-sm font-bold text-[#FF3F4D]">
            {query.error}
          </p>
        </Card>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <Badge variant="info">Patient</Badge>
          <h2 className="mt-4 text-2xl font-black">{patient.full_name}</h2>
          <p className="mt-2 text-sm leading-6 text-[#667085]">
            Room {patient.room_number ?? "N/A"} • {patient.ward ?? "No ward"}
          </p>
        </Card>

        <Card>
          <Badge variant={criticalAlerts.length > 0 ? "danger" : "success"}>
            Critical alerts
          </Badge>
          <p className="mt-4 text-3xl font-black">{criticalAlerts.length}</p>
          <p className="mt-2 text-sm text-[#667085]">
            Active critical medication risks
          </p>
        </Card>

        <Card>
          <Badge variant="warning">Allergies</Badge>
          <p className="mt-4 text-lg font-black">
            {patient.allergies.length > 0
              ? patient.allergies.join(", ")
              : "No allergies listed"}
          </p>
          <p className="mt-2 text-sm text-[#667085]">Seeded demo data</p>
        </Card>
      </div>

      {criticalAlerts.length > 0 ? (
        <Card className="mt-5 border-[#FF3F4D]/40 bg-[#FFF6F7]">
          <Badge variant="danger">DO NOT ADMINISTER</Badge>
          <h2 className="mt-4 text-3xl font-black tracking-tight">
            Medication is on hold due to detected conflict
          </h2>
          <p className="mt-3 text-sm leading-6 text-[#667085]">
            This patient has an active critical demo medication alert. Review the
            alert center or pharmacist review queue before administration.
          </p>
          <Link
            href="/clinical/alerts"
            className="mt-6 inline-block rounded-2xl bg-[#FF3F4D] px-5 py-3 text-sm font-black text-white"
          >
            Open alert center
          </Link>
        </Card>
      ) : null}

      <Card className="mt-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-black">Medication schedule</h2>
            <p className="mt-2 text-sm text-[#667085]">
              Active medications, schedule times, status, and safety indicators.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
  <Link
    href={`/clinical/patients/${patient.id}/notes`}
    className="rounded-2xl bg-[#FF3F4D] px-5 py-3 text-sm font-black text-white"
  >
    Care notes
  </Link>

  <Link
  href={`/clinical/discharge/${patient.id}`}
  className="rounded-2xl bg-[#12B76A] px-5 py-3 text-sm font-black text-white"
>
  Discharge instructions
</Link>

  <Link
    href="/clinical/patients"
    className="rounded-2xl bg-[#101828] px-5 py-3 text-sm font-black text-white"
  >
    Back to board
  </Link>
</div>
        </div>

        <div className="mt-6 space-y-4">
          {medications.length === 0 ? (
            <div className="rounded-3xl bg-[#F6F8FB] p-5 text-sm text-[#667085]">
              No medications found for this patient.
            </div>
          ) : (
            medications.map((medication) => {
              const medicationSchedules = schedules.filter(
                (schedule) => schedule.patient_medication_id === medication.id
              );

              const medicationAlerts = alerts.filter(
                (alert) =>
                  alert.patient_medication_id_a === medication.id ||
                  alert.patient_medication_id_b === medication.id
              );

              const latestAdministration = administrations.find(
                (administration) =>
                  administration.patient_medication_id === medication.id
              );

              return (
                <div
                  key={medication.id}
                  className="rounded-[2rem] border border-[#E6EAF0] bg-[#F6F8FB] p-5"
                >
                  <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-2xl font-black">
                          {medication.name}
                        </h3>

                        <Badge variant={getStatusVariant(medication.status)}>
                          {medication.status.replace("_", " ")}
                        </Badge>

                        {medicationAlerts.map((alert) => (
                          <Badge
                            key={alert.id}
                            variant={getAlertVariant(alert.severity)}
                          >
                            {alert.severity}
                          </Badge>
                        ))}
                      </div>

                      <p className="mt-2 text-sm text-[#667085]">
                        {medication.dose_amount} {medication.dose_unit} •{" "}
                        {medication.frequency}
                      </p>

                      {medication.special_instructions ? (
                        <p className="mt-4 text-sm leading-6 text-[#667085]">
                          {medication.special_instructions}
                        </p>
                      ) : null}

                      {medication.hold_reason ? (
                        <div className="mt-4 rounded-3xl bg-[#FFF6F7] p-4">
                          <p className="text-sm font-black text-[#FF3F4D]">
                            Hold reason
                          </p>
                          <p className="mt-2 text-sm leading-6 text-[#667085]">
                            {medication.hold_reason}
                          </p>
                        </div>
                      ) : null}

                      {medicationAlerts.length > 0 ? (
                        <div className="mt-4 space-y-3">
                          {medicationAlerts.map((alert) => (
                            <div
                              key={alert.id}
                              className="rounded-3xl bg-white p-4"
                            >
                              <Badge variant={getAlertVariant(alert.severity)}>
                                {alert.rule_key}
                              </Badge>
                              <p className="mt-2 text-sm leading-6 text-[#667085]">
                                {alert.description}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <aside className="rounded-3xl bg-white p-5">
                      <p className="text-xs font-black uppercase tracking-wide text-[#667085]">
                        Scheduled times
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {medicationSchedules.length === 0 ? (
                          <span className="text-sm text-[#667085]">
                            No schedule
                          </span>
                        ) : (
                          medicationSchedules.map((schedule) => (
                            <Badge key={schedule.id} variant="info">
                              {formatTime(schedule.scheduled_time)}
                            </Badge>
                          ))
                        )}
                      </div>

                      <div className="mt-5 rounded-3xl bg-[#F6F8FB] p-4">
                        <p className="text-xs font-black uppercase tracking-wide text-[#667085]">
                          Last recorded
                        </p>
                        {latestAdministration ? (
                          <>
                            <p className="mt-2 text-sm font-bold">
                              {formatDateTime(
                                latestAdministration.administered_at ??
                                  latestAdministration.scheduled_at
                              )}
                            </p>
                            <div className="mt-2">
                              <Badge
                                variant={getAdministrationVariant(
                                  latestAdministration.status
                                )}
                              >
                                {latestAdministration.status}
                              </Badge>
                            </div>
                          </>
                        ) : (
                          <p className="mt-2 text-sm text-[#667085]">
                            No administration history yet.
                          </p>
                        )}
                      </div>

                      <div className="mt-5">
                        <AdministerMedicationForm
                          patientId={patient.id}
                          medicationId={medication.id}
                          medicationName={medication.name}
                          doseLabel={`${medication.dose_amount} ${medication.dose_unit} • ${medication.frequency}`}
                          action={markDoseAdministered}
                          disabled={
                            medication.status === "on_hold" ||
                            medication.status === "pending_review" ||
                            medicationAlerts.some(
                              (alert) => alert.severity === "critical"
                            )
                          }
                          disabledReason={
                            medication.status === "on_hold"
                              ? "Medication is on hold and cannot be administered."
                              : medication.status === "pending_review"
                              ? "Medication is pending pharmacist review."
                              : medicationAlerts.some(
                                  (alert) => alert.severity === "critical"
                                )
                              ? "Medication has an active critical safety alert."
                              : undefined
                          }
                        />
                      </div>
                    </aside>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>

      <Card className="mt-5">
        <h2 className="text-2xl font-black">Administration history</h2>
        <p className="mt-2 text-sm text-[#667085]">
          Recent medication administration events for this patient.
        </p>

        <div className="mt-6 space-y-3">
          {administrations.length === 0 ? (
            <div className="rounded-3xl bg-[#F6F8FB] p-5 text-sm text-[#667085]">
              No administration history available.
            </div>
          ) : (
            administrations.map((administration) => (
              <div
                key={administration.id}
                className="rounded-3xl border border-[#E6EAF0] bg-[#F6F8FB] p-5"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-black text-[#101828]">
                      {formatDateTime(administration.scheduled_at)}
                    </p>
                    <p className="mt-1 text-sm text-[#667085]">
                      {administration.notes ?? "No notes recorded."}
                    </p>
                  </div>

                  <Badge
                    variant={getAdministrationVariant(administration.status)}
                  >
                    {administration.status}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      <Card className="mt-5">
        <p className="text-sm font-black text-[#FF3F4D]">
          Academic prototype disclaimer
        </p>
        <p className="mt-2 text-sm leading-6 text-[#667085]">
          This patient medication tracker uses seeded demo records and mock
          clinical alerts only. It does not provide real medical or clinical
          decision support.
        </p>
      </Card>
    </AppShell>
  );
}
