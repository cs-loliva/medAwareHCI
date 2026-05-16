import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{
    message?: string;
    error?: string;
  }>;
};

type AppointmentStatus =
  | "scheduled"
  | "arrived"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show";

type OutpatientAppointment = {
  id: string;
  patient_id: string;
  appointment_time: string;
  reason_for_visit: string | null;
  status: AppointmentStatus;
  patient: {
    id: string;
    full_name: string;
    room_number: string | null;
    ward: string | null;
    primary_diagnosis: string | null;
    allergies: string[];
    status: string;
  } | null;
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

type ClinicalAlert = {
  id: string;
  patient_id: string;
  severity: "critical" | "moderate" | "low";
  status: string;
};

function formatAppointmentTime(value: string) {
  return new Date(value).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatAppointmentDate(value: string) {
  return new Date(value).toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getStatusVariant(status: AppointmentStatus) {
  if (status === "arrived" || status === "in_progress") return "warning";
  if (status === "completed") return "success";
  if (status === "cancelled" || status === "no_show") return "danger";
  return "info";
}

function getMedicationFlag(patientId: string, alerts: ClinicalAlert[]) {
  const patientAlerts = alerts.filter(
    (alert) => alert.patient_id === patientId && alert.status === "active"
  );

  if (patientAlerts.some((alert) => alert.severity === "critical")) {
    return {
      label: "critical medication flag",
      variant: "danger" as const,
    };
  }

  if (patientAlerts.length > 0) {
    return {
      label: "medication caution",
      variant: "warning" as const,
    };
  }

  return {
    label: "no active flags",
    variant: "success" as const,
  };
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

async function updateAppointmentStatus(formData: FormData) {
  "use server";

  await getCurrentUser();

  const supabase = await createClient();

  const appointmentId = String(formData.get("appointmentId") ?? "");
  const status = String(formData.get("status") ?? "") as AppointmentStatus;

  const validStatuses: AppointmentStatus[] = [
    "scheduled",
    "arrived",
    "in_progress",
    "completed",
    "cancelled",
    "no_show",
  ];

  if (!appointmentId || !validStatuses.includes(status)) {
    redirect("/clinical/clinic?error=Invalid appointment update.");
  }

  const { error } = await supabase
    .from("outpatient_appointments")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", appointmentId);

  if (error) {
    redirect(`/clinical/clinic?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/clinical/clinic");
  redirect(`/clinical/clinic?message=Appointment marked ${status.replace("_", " ")}.`);
}

export default async function ClinicQueuePage({ searchParams }: PageProps) {
  await getCurrentUser();

  const params = searchParams ? await searchParams : {};
  const supabase = await createClient();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);

  const [appointmentsResponse, medicationsResponse, alertsResponse] =
    await Promise.all([
      supabase
        .from("outpatient_appointments")
        .select(
          `
          id,
          patient_id,
          appointment_time,
          reason_for_visit,
          status,
          patient:patient_id (
            id,
            full_name,
            room_number,
            ward,
            primary_diagnosis,
            allergies,
            status
          )
        `
        )
        .gte("appointment_time", todayStart.toISOString())
        .lt("appointment_time", tomorrowStart.toISOString())
        .order("appointment_time", { ascending: true }),

      supabase
        .from("patient_medications")
        .select("id, patient_id, name, dose_amount, dose_unit, frequency, status")
        .neq("status", "discontinued"),

      supabase
        .from("clinical_alerts")
        .select("id, patient_id, severity, status")
        .eq("status", "active"),
    ]);

  const appointments =
    (appointmentsResponse.data ?? []) as unknown as OutpatientAppointment[];
  const medications = (medicationsResponse.data ?? []) as PatientMedication[];
  const alerts = (alertsResponse.data ?? []) as ClinicalAlert[];

  const arrivedCount = appointments.filter(
    (appointment) =>
      appointment.status === "arrived" || appointment.status === "in_progress"
  ).length;

  const completedCount = appointments.filter(
    (appointment) => appointment.status === "completed"
  ).length;

  const flaggedCount = appointments.filter((appointment) => {
    const flag = getMedicationFlag(appointment.patient_id, alerts);
    return flag.variant === "danger" || flag.variant === "warning";
  }).length;

  return (
    <AppShell
      title="Outpatient Clinic Queue"
      subtitle="Track scheduled visits, arrival status, medication flags, and patient preparation."
      activePath="/clinical/clinic"
    >
      {params.message ? (
        <Card className="mb-5 border-[#12B76A]/40 bg-[#EAFBF3]">
          <Badge variant="success">Success</Badge>
          <p className="mt-3 text-sm font-bold text-[#101828]">
            {params.message}
          </p>
        </Card>
      ) : null}

      {params.error ? (
        <Card className="mb-5 border-[#FF3F4D]/40 bg-[#FFF6F7]">
          <Badge variant="danger">Error</Badge>
          <p className="mt-3 text-sm font-bold text-[#FF3F4D]">
            {params.error}
          </p>
        </Card>
      ) : null}

      {appointmentsResponse.error ||
      medicationsResponse.error ||
      alertsResponse.error ? (
        <Card className="mb-5">
          <Badge variant="danger">Load warning</Badge>
          <p className="mt-3 text-sm leading-6 text-[#667085]">
            {appointmentsResponse.error?.message ??
              medicationsResponse.error?.message ??
              alertsResponse.error?.message}
          </p>
        </Card>
      ) : null}

      <div className="grid gap-5 md:grid-cols-3">
        <Card>
          <Badge variant="info">Today</Badge>
          <p className="mt-4 text-3xl font-black">{appointments.length}</p>
          <p className="mt-2 text-sm text-[#667085]">
            Scheduled outpatient visits
          </p>
        </Card>

        <Card>
          <Badge variant={arrivedCount > 0 ? "warning" : "info"}>Arrived</Badge>
          <p className="mt-4 text-3xl font-black">{arrivedCount}</p>
          <p className="mt-2 text-sm text-[#667085]">
            Patients currently in queue
          </p>
        </Card>

        <Card>
          <Badge variant={flaggedCount > 0 ? "danger" : "success"}>
            Medication flags
          </Badge>
          <p className="mt-4 text-3xl font-black">{flaggedCount}</p>
          <p className="mt-2 text-sm text-[#667085]">
            Visits with active medication cautions
          </p>
        </Card>
      </div>

      <Card className="mt-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-black">Clinic queue</h2>
            <p className="mt-2 text-sm text-[#667085]">
              Appointments are sorted by scheduled time.
            </p>
          </div>

          <Link
            href="/clinical/patients"
            className="rounded-2xl bg-[#101828] px-5 py-3 text-sm font-black text-white"
          >
            Back to patient board
          </Link>
        </div>

        <div className="mt-6 space-y-4">
          {appointments.length === 0 ? (
            <div className="rounded-3xl bg-[#F6F8FB] p-5 text-sm text-[#667085]">
              No outpatient appointments scheduled for today.
            </div>
          ) : (
            appointments.map((appointment) => {
              const patientMedications = medications.filter(
                (medication) => medication.patient_id === appointment.patient_id
              );
              const flag = getMedicationFlag(appointment.patient_id, alerts);

              return (
                <div
                  key={appointment.id}
                  className="rounded-[2rem] border border-[#E6EAF0] bg-[#F6F8FB] p-5"
                >
                  <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <Badge variant="info">
                          {formatAppointmentTime(appointment.appointment_time)}
                        </Badge>

                        <Badge variant={getStatusVariant(appointment.status)}>
                          {appointment.status.replace("_", " ")}
                        </Badge>

                        <Badge variant={flag.variant}>{flag.label}</Badge>
                      </div>

                      <h3 className="mt-4 text-2xl font-black">
                        {appointment.patient?.full_name ?? "Unknown patient"}
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-[#667085]">
                        {formatAppointmentDate(appointment.appointment_time)} •{" "}
                        {appointment.patient?.primary_diagnosis ??
                          "No diagnosis listed"}
                      </p>

                      <p className="mt-3 text-sm leading-6 text-[#667085]">
                        Reason:{" "}
                        <span className="font-bold text-[#101828]">
                          {appointment.reason_for_visit ??
                            "No reason provided"}
                        </span>
                      </p>

                      {appointment.patient?.allergies &&
                      appointment.patient.allergies.length > 0 ? (
                        <p className="mt-3 text-sm font-bold text-[#FF3F4D]">
                          Allergies: {appointment.patient.allergies.join(", ")}
                        </p>
                      ) : null}

                      <div className="mt-5 rounded-3xl bg-white p-5">
                        <p className="text-xs font-black uppercase tracking-wide text-[#667085]">
                          Medication preparation
                        </p>

                        {patientMedications.length === 0 ? (
                          <p className="mt-3 text-sm text-[#667085]">
                            No medications found for this patient.
                          </p>
                        ) : (
                          <div className="mt-3 space-y-3">
                            {patientMedications.map((medication) => (
                              <div
                                key={medication.id}
                                className="rounded-2xl bg-[#F6F8FB] p-4"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <div>
                                    <p className="font-black">
                                      {medication.name}
                                    </p>
                                    <p className="mt-1 text-sm text-[#667085]">
                                      {medication.dose_amount}{" "}
                                      {medication.dose_unit} •{" "}
                                      {medication.frequency}
                                    </p>
                                  </div>

                                  <Badge
                                    variant={
                                      medication.status === "active" ||
                                      medication.status === "approved"
                                        ? "success"
                                        : medication.status === "on_hold" ||
                                            medication.status ===
                                              "pending_review"
                                          ? "warning"
                                          : "default"
                                    }
                                  >
                                    {medication.status.replace("_", " ")}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <aside className="rounded-[2rem] bg-white p-5 shadow-sm">
                      <p className="text-xs font-black uppercase tracking-wide text-[#667085]">
                        Queue actions
                      </p>

                      <div className="mt-5 space-y-3">
                        <form action={updateAppointmentStatus}>
                          <input
                            type="hidden"
                            name="appointmentId"
                            value={appointment.id}
                          />
                          <input type="hidden" name="status" value="arrived" />
                          <button
                            type="submit"
                            disabled={appointment.status === "arrived"}
                            className="w-full rounded-2xl bg-[#FF3F4D] px-4 py-3 text-sm font-black text-white disabled:opacity-50"
                          >
                            Mark arrived
                          </button>
                        </form>

                        <form action={updateAppointmentStatus}>
                          <input
                            type="hidden"
                            name="appointmentId"
                            value={appointment.id}
                          />
                          <input
                            type="hidden"
                            name="status"
                            value="in_progress"
                          />
                          <button
                            type="submit"
                            disabled={appointment.status === "in_progress"}
                            className="w-full rounded-2xl bg-[#101828] px-4 py-3 text-sm font-black text-white disabled:opacity-50"
                          >
                            Start visit
                          </button>
                        </form>

                        <form action={updateAppointmentStatus}>
                          <input
                            type="hidden"
                            name="appointmentId"
                            value={appointment.id}
                          />
                          <input
                            type="hidden"
                            name="status"
                            value="completed"
                          />
                          <button
                            type="submit"
                            disabled={appointment.status === "completed"}
                            className="w-full rounded-2xl bg-[#12B76A] px-4 py-3 text-sm font-black text-white disabled:opacity-50"
                          >
                            Complete visit
                          </button>
                        </form>

                        <Link
                          href={`/clinical/patients/${appointment.patient_id}`}
                          className="block w-full rounded-2xl bg-[#FFE8EC] px-4 py-3 text-center text-sm font-black text-[#FF3F4D]"
                        >
                          Open patient tracker
                        </Link>
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
        <p className="text-sm font-black text-[#FF3F4D]">
          Academic prototype disclaimer
        </p>
        <p className="mt-2 text-sm leading-6 text-[#667085]">
          This outpatient clinic queue uses seeded demo appointments and
          medication data only. It is not a real clinical scheduling or
          decision-support tool.
        </p>
      </Card>
    </AppShell>
  );
}