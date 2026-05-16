import { PrintButton } from "@/components/features/clinical/PrintButton";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
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
  status: string;
};

type PatientMedication = {
  id: string;
  name: string;
  dose_amount: number;
  dose_unit: string;
  frequency: string;
  special_instructions: string | null;
  status: string;
  hold_reason: string | null;
};

type ClinicalAlert = {
  id: string;
  severity: "critical" | "moderate" | "low";
  rule_key: string;
  description: string;
  status: string;
};

function formatDate(value: string | null) {
  if (!value) return "Not recorded";

  return new Date(value).toLocaleDateString([], {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function getDischargeFileName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  const firstName = parts[0] ?? "patient";
  const lastName = parts.length > 1 ? parts[parts.length - 1] : "patient";

  return `${lastName}_${firstName}_medaware_discharge`
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "");
}

function getAlertVariant(severity: ClinicalAlert["severity"]) {
  if (severity === "critical") return "danger";
  if (severity === "moderate") return "warning";
  return "info";
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

async function recordDischargeGeneration(formData: FormData) {
  "use server";

  const user = await getCurrentUser();
  const admin = createAdminClient();

  const patientId = String(formData.get("patientId") ?? "");

  if (!patientId) {
    redirect("/clinical/patients?error=Missing patient id.");
  }

  const { error } = await admin.from("audit_logs").insert({
    actor_id: user.id,
    action: "discharge.instructions_generated",
    target_type: "patient",
    target_id: patientId,
    metadata: {
      generated_at: new Date().toISOString(),
      demo: true,
    },
  });

  if (error) {
    redirect(
      `/clinical/discharge/${patientId}?error=${encodeURIComponent(
        error.message
      )}`
    );
  }

  revalidatePath(`/clinical/discharge/${patientId}`);
  redirect(
    `/clinical/discharge/${patientId}?message=Discharge instructions generation recorded.`
  );
}

export default async function DischargeInstructionsPage({
  params,
  searchParams,
}: PageProps) {
  await getCurrentUser();

  const { patientId } = await params;
  const query = searchParams ? await searchParams : {};
  const supabase = await createClient();

  const [patientResponse, medicationsResponse, alertsResponse] =
    await Promise.all([
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
          "id, name, dose_amount, dose_unit, frequency, special_instructions, status, hold_reason"
        )
        .eq("patient_id", patientId)
        .neq("status", "discontinued")
        .order("created_at", { ascending: true }),

      supabase
        .from("clinical_alerts")
        .select("id, severity, rule_key, description, status")
        .eq("patient_id", patientId)
        .eq("status", "active")
        .order("created_at", { ascending: false }),
    ]);

  if (patientResponse.error || !patientResponse.data) {
    return (
      <AppShell
        title="Discharge Instructions"
        subtitle="The selected patient could not be loaded."
        activePath="/clinical/patients"
      >
        <Card>
          <Badge variant="danger">Patient not found</Badge>
          <h2 className="mt-4 text-2xl font-black">
            Could not load discharge record
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
  const alerts = (alertsResponse.data ?? []) as ClinicalAlert[];

  return (
    <AppShell
      title="Discharge Instructions"
      subtitle={`${patient.full_name} • ${
        patient.primary_diagnosis ?? "No diagnosis listed"
      }`}
      activePath="/clinical/patients"
    >
      {query.message ? (
        <Card className="mb-5 border-[#12B76A]/40 bg-[#EAFBF3] print:hidden">
          <Badge variant="success">Success</Badge>
          <p className="mt-3 text-sm font-bold text-[#101828]">
            {query.message}
          </p>
        </Card>
      ) : null}

      {query.error ? (
        <Card className="mb-5 border-[#FF3F4D]/40 bg-[#FFF6F7] print:hidden">
          <Badge variant="danger">Error</Badge>
          <p className="mt-3 text-sm font-bold text-[#FF3F4D]">
            {query.error}
          </p>
        </Card>
      ) : null}

      <div className="mb-5 flex flex-col gap-3 print:hidden md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/clinical/patients/${patient.id}`}
            className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-[#101828] shadow-sm"
          >
            Back to tracker
          </Link>

          <PrintButton fileName={getDischargeFileName(patient.full_name)} />
        </div>

        <form action={recordDischargeGeneration}>
          <input type="hidden" name="patientId" value={patient.id} />
          <button
            type="submit"
            className="rounded-2xl bg-[#FF3F4D] px-5 py-3 text-sm font-black text-white"
          >
            Record generation
          </button>
        </form>
      </div>

      {/* Screen-only app layout */}
      <section className="rounded-[2rem] border border-[#E6EAF0] bg-white p-8 shadow-sm print:hidden">
        <div className="border-b border-[#E6EAF0] pb-6">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#FF3F4D]">
            MedAware
          </p>
          <h2 className="mt-3 text-4xl font-black tracking-tight text-[#101828]">
            Discharge Medication Instructions
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#667085]">
            This document summarizes the patient’s active medication plan for
            discharge review. This is an academic prototype output only.
          </p>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <Card>
            <Badge variant="info">Patient</Badge>
            <h3 className="mt-4 text-2xl font-black">{patient.full_name}</h3>
            <p className="mt-2 text-sm leading-6 text-[#667085]">
              Date of birth: {formatDate(patient.date_of_birth)}
            </p>
            <p className="mt-1 text-sm leading-6 text-[#667085]">
              Room {patient.room_number ?? "N/A"} • {patient.ward ?? "No ward"}
            </p>
          </Card>

          <Card>
            <Badge variant="warning">Clinical summary</Badge>
            <p className="mt-4 text-sm leading-6 text-[#667085]">
              Diagnosis:{" "}
              <span className="font-bold text-[#101828]">
                {patient.primary_diagnosis ?? "No diagnosis listed"}
              </span>
            </p>
            <p className="mt-2 text-sm leading-6 text-[#667085]">
              Allergies:{" "}
              <span className="font-bold text-[#FF3F4D]">
                {patient.allergies.length > 0
                  ? patient.allergies.join(", ")
                  : "No allergies listed"}
              </span>
            </p>
          </Card>
        </div>

        <Card className="mt-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <Badge variant="success">Medication plan</Badge>
              <h3 className="mt-4 text-2xl font-black">
                Active discharge medications
              </h3>
            </div>

            <p className="text-sm font-bold text-[#667085]">
              {medications.length} medication(s)
            </p>
          </div>

          <div className="mt-6 space-y-4">
            {medications.length === 0 ? (
              <div className="rounded-3xl bg-[#F6F8FB] p-5 text-sm text-[#667085]">
                No active medications found for discharge.
              </div>
            ) : (
              medications.map((medication) => (
                <div
                  key={medication.id}
                  className="rounded-3xl border border-[#E6EAF0] bg-[#F6F8FB] p-5"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h4 className="text-xl font-black">{medication.name}</h4>
                      <p className="mt-2 text-sm text-[#667085]">
                        {medication.dose_amount} {medication.dose_unit} •{" "}
                        {medication.frequency}
                      </p>
                    </div>

                    <Badge
                      variant={
                        medication.status === "active" ||
                        medication.status === "approved"
                          ? "success"
                          : medication.status === "on_hold" ||
                              medication.status === "pending_review"
                            ? "warning"
                            : "default"
                      }
                    >
                      {medication.status.replace("_", " ")}
                    </Badge>
                  </div>

                  {medication.special_instructions ? (
                    <p className="mt-4 text-sm leading-6 text-[#667085]">
                      Instructions: {medication.special_instructions}
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
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="mt-6">
          <Badge variant={alerts.length > 0 ? "danger" : "success"}>
            Safety alerts
          </Badge>
          <h3 className="mt-4 text-2xl font-black">
            Active demo interaction alerts
          </h3>

          <div className="mt-6 space-y-4">
            {alerts.length === 0 ? (
              <div className="rounded-3xl bg-[#F6F8FB] p-5 text-sm text-[#667085]">
                No active demo interaction alerts are attached to this patient.
              </div>
            ) : (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="rounded-3xl border border-[#E6EAF0] bg-[#FFF6F7] p-5"
                >
                  <Badge variant={getAlertVariant(alert.severity)}>
                    {alert.severity}
                  </Badge>
                  <p className="mt-3 text-sm leading-6 text-[#667085]">
                    {alert.description}
                  </p>
                  <p className="mt-2 text-xs font-bold uppercase tracking-wide text-[#FF3F4D]">
                    Rule: {alert.rule_key}
                  </p>
                </div>
              ))
            )}
          </div>
        </Card>

        <div className="mt-8 rounded-3xl bg-[#FFF6F7] p-6">
          <p className="text-sm font-black text-[#FF3F4D]">
            Academic prototype disclaimer
          </p>
          <p className="mt-2 text-sm leading-6 text-[#667085]">
            This discharge instruction output uses demo/academic medication data
            and mock interaction logic. It does not provide real medical advice,
            discharge counseling, prescription authority, or clinical decision
            support.
          </p>
        </div>

        <div className="mt-8 border-t border-[#E6EAF0] pt-5 text-xs leading-5 text-[#667085]">
          Generated by MedAware prototype on{" "}
          {formatDate(new Date().toISOString())}. Review and validation by
          licensed clinical staff would be required for any real deployment.
        </div>
      </section>

      {/* Print-only formal layout */}
      <section className="print-document hidden bg-white text-[#111827]">
        <div className="border-b border-[#111827] pb-4">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em]">
                MedAware Academic Prototype
              </p>
              <h1 className="mt-2 text-2xl font-black">
                Discharge Medication Instructions
              </h1>
              <p className="mt-2 text-xs print-muted">
                Generated on {formatDate(new Date().toISOString())}
              </p>
            </div>

            <div className="text-right text-xs">
              <p className="font-bold">Medication Safety Notice</p>
              <p className="mt-1 max-w-[240px] print-muted">
                Demo/academic logic only. Not valid for real clinical use.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-6 text-sm">
          <div>
            <h2 className="text-sm font-black uppercase tracking-wide">
              Patient Information
            </h2>

            <table className="print-table mt-3">
              <tbody>
                <tr>
                  <th>Patient Name</th>
                  <td>{patient.full_name}</td>
                </tr>
                <tr>
                  <th>Date of Birth</th>
                  <td>{formatDate(patient.date_of_birth)}</td>
                </tr>
                <tr>
                  <th>Room / Ward</th>
                  <td>
                    Room {patient.room_number ?? "N/A"} •{" "}
                    {patient.ward ?? "No ward"}
                  </td>
                </tr>
                <tr>
                  <th>Status</th>
                  <td>{patient.status}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div>
            <h2 className="text-sm font-black uppercase tracking-wide">
              Clinical Summary
            </h2>

            <table className="print-table mt-3">
              <tbody>
                <tr>
                  <th>Primary Diagnosis</th>
                  <td>{patient.primary_diagnosis ?? "No diagnosis listed"}</td>
                </tr>
                <tr>
                  <th>Allergies</th>
                  <td>
                    {patient.allergies.length > 0
                      ? patient.allergies.join(", ")
                      : "No allergies listed"}
                  </td>
                </tr>
                <tr>
                  <th>Generated By</th>
                  <td>MedAware prototype discharge module</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-8">
          <h2 className="text-sm font-black uppercase tracking-wide">
            Discharge Medication Plan
          </h2>

          <table className="print-table mt-3">
            <thead>
              <tr>
                <th>Medication</th>
                <th>Dose</th>
                <th>Frequency</th>
                <th>Status</th>
                <th>Instructions / Hold Reason</th>
              </tr>
            </thead>

            <tbody>
              {medications.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    No active medications found for discharge.
                  </td>
                </tr>
              ) : (
                medications.map((medication) => (
                  <tr key={medication.id}>
                    <td>
                      <strong>{medication.name}</strong>
                    </td>
                    <td>
                      {medication.dose_amount} {medication.dose_unit}
                    </td>
                    <td>{medication.frequency}</td>
                    <td>{medication.status.replace("_", " ")}</td>
                    <td>
                      {medication.special_instructions
                        ? medication.special_instructions
                        : "No special instructions recorded."}

                      {medication.hold_reason ? (
                        <>
                          <br />
                          <strong>Hold reason:</strong>{" "}
                          {medication.hold_reason}
                        </>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-8">
          <h2 className="text-sm font-black uppercase tracking-wide">
            Active Medication Safety Alerts
          </h2>

          <table className="print-table mt-3">
            <thead>
              <tr>
                <th>Severity</th>
                <th>Rule</th>
                <th>Description</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {alerts.length === 0 ? (
                <tr>
                  <td colSpan={4}>
                    No active demo medication alerts recorded.
                  </td>
                </tr>
              ) : (
                alerts.map((alert) => (
                  <tr key={alert.id}>
                    <td>
                      <strong>{alert.severity}</strong>
                    </td>
                    <td>{alert.rule_key}</td>
                    <td>{alert.description}</td>
                    <td>{alert.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-8 rounded-lg border border-[#d0d5dd] bg-[#f9fafb] p-4 text-xs leading-5">
          <p className="font-black uppercase tracking-wide">
            Academic Prototype Disclaimer
          </p>
          <p className="mt-2 print-muted">
            This document was generated by MedAware as an academic HCI
            prototype. It uses seeded demo medication data and mock interaction
            logic only. It does not provide real medical advice, prescription
            authority, discharge counseling, or clinical decision support.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-12 text-xs">
          <div>
            <div className="print-signature-line">Prepared / Reviewed By</div>
          </div>

          <div>
            <div className="print-signature-line">Date and Time</div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}