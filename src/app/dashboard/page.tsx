import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { CountdownTimer } from "@/components/features/civilian/CountdownTimer";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ArchiveMedicationForm } from "@/components/features/civilian/ArchiveMedicationForm";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{
    message?: string;
    error?: string;
  }>;
};

type Medication = {
  id: string;
  name: string;
  dose_amount: number;
  dose_unit: string;
  frequency: string;
  notes: string | null;
  status: string;
};

type MedicationSchedule = {
  id: string;
  medication_id: string;
  scheduled_time: string;
};

type MedicationAlert = {
  id: string;
  severity: "critical" | "moderate" | "low";
  rule_key: string;
  description: string;
  status: string;
};

type MedicationLog = {
  id: string;
  status: "taken" | "missed" | "skipped";
};

function getNextDose(
  medications: Medication[],
  schedules: MedicationSchedule[]
) {
  const now = new Date();

  const candidates = schedules
    .map((schedule) => {
      const medication = medications.find(
        (item) => item.id === schedule.medication_id
      );

      if (!medication) return null;

      const [hour, minute] = schedule.scheduled_time.split(":").map(Number);

      const scheduledToday = new Date(now);
      scheduledToday.setHours(hour, minute, 0, 0);

      const scheduledAt =
        scheduledToday.getTime() <= now.getTime()
          ? new Date(scheduledToday.getTime() + 24 * 60 * 60 * 1000)
          : scheduledToday;

      return {
        medication,
        scheduledAt,
        scheduledTime: schedule.scheduled_time,
      };
    })
    .filter(Boolean) as Array<{
    medication: Medication;
    scheduledAt: Date;
    scheduledTime: string;
  }>;

  return candidates.sort(
    (a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime()
  )[0];
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

function getAdherenceScore(logs: MedicationLog[]) {
  if (logs.length === 0) return 100;

  const taken = logs.filter((log) => log.status === "taken").length;

  return Math.round((taken / logs.length) * 100);
}

function getAlertVariant(severity: MedicationAlert["severity"]) {
  if (severity === "critical") return "danger";
  if (severity === "moderate") return "warning";
  return "info";
}

async function archiveMedication(formData: FormData) {
  "use server";

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const medicationId = String(formData.get("medicationId") ?? "");

  if (!medicationId) {
    redirect("/dashboard?error=Missing medication id.");
  }

  const { data, error } = await supabase
    .from("medications")
    .update({
      status: "inactive",
      updated_at: new Date().toISOString(),
    })
    .eq("id", medicationId)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    redirect(`/dashboard?error=${encodeURIComponent(error.message)}`);
  }

  if (!data) {
    redirect(
      `/dashboard?error=${encodeURIComponent(
        "Medication could not be found for this account."
      )}`
    );
  }

  revalidatePath("/dashboard");
  redirect("/dashboard?message=Medication removed from active list.");
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {};
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [
    medicationsResponse,
    schedulesResponse,
    alertsResponse,
    logsResponse,
  ] = await Promise.all([
    supabase
      .from("medications")
      .select("id, name, dose_amount, dose_unit, frequency, notes, status")
      .eq("user_id", user.id)
      .neq("status", "inactive")
      .order("created_at", { ascending: true }),

    supabase
      .from("medication_schedules")
      .select("id, medication_id, scheduled_time"),

    supabase
      .from("medication_alerts")
      .select("id, severity, rule_key, description, status")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false }),

    supabase
      .from("medication_logs")
      .select("id, status")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  const medications = (medicationsResponse.data ?? []) as Medication[];
  const allSchedules = (schedulesResponse.data ?? []) as MedicationSchedule[];
  const alerts = (alertsResponse.data ?? []) as MedicationAlert[];
  const logs = (logsResponse.data ?? []) as MedicationLog[];

  const medicationIds = new Set(medications.map((medication) => medication.id));
  const schedules = allSchedules.filter((schedule) =>
    medicationIds.has(schedule.medication_id)
  );

  const nextDose = getNextDose(medications, schedules);

  const adherenceScore = getAdherenceScore(logs);
  const criticalAlert = alerts.find((alert) => alert.severity === "critical");
  const activeMedicationCount = medications.filter(
    (medication) => medication.status === "active"
  ).length;

  return (
    <AppShell
      title="Civilian Medication Dashboard"
      subtitle="Track your next dose, adherence status, and active safety alerts."
      activePath="/dashboard"
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

      {medicationsResponse.error ||
      schedulesResponse.error ||
      alertsResponse.error ||
      logsResponse.error ? (
        <Card className="mb-5">
          <Badge variant="danger">Load warning</Badge>
          <p className="mt-3 text-sm leading-6 text-[#667085]">
            {medicationsResponse.error?.message ??
              schedulesResponse.error?.message ??
              alertsResponse.error?.message ??
              logsResponse.error?.message}
          </p>
        </Card>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1.4fr_0.8fr]">
        <Card>
          {nextDose ? (
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <Badge variant={criticalAlert ? "danger" : "success"}>
                  Next dose
                </Badge>

                <h2 className="mt-5 text-4xl font-black tracking-tight">
                  {nextDose.medication.name}
                </h2>

                <p className="mt-2 text-[#667085]">
                  {nextDose.medication.dose_amount}{" "}
                  {nextDose.medication.dose_unit} • Scheduled at{" "}
                  {formatTime(nextDose.scheduledTime)}
                </p>

                <div className="mt-8 rounded-3xl bg-[#F6F8FB] p-5">
                  <p className="text-sm font-black text-[#101828]">
                    Intake procedure
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[#667085]">
                    {nextDose.medication.notes ??
                      "No intake procedure notes were added."}
                  </p>
                </div>
              </div>

              <CountdownTimer targetTime={nextDose.scheduledAt.toISOString()} />
            </div>
          ) : (
            <div>
              <Badge variant="info">No schedule</Badge>
              <h2 className="mt-5 text-3xl font-black">
                No upcoming dose found
              </h2>
              <p className="mt-2 text-sm text-[#667085]">
                Add medication schedules to display the next dose timer.
              </p>
            </div>
          )}
        </Card>

        <Card>
          {criticalAlert ? (
            <>
              <Badge variant="danger">Danger alert</Badge>
              <h2 className="mt-4 text-2xl font-black">
                Possible interaction
              </h2>
              <p className="mt-3 text-sm leading-6 text-[#667085]">
                {criticalAlert.description}
              </p>

              <div className="mt-5 rounded-3xl bg-[#FFF6F7] p-4">
                <p className="text-xs font-black uppercase tracking-wide text-[#FF3F4D]">
                  Contact a health professional before continuing.
                </p>
                <p className="mt-2 text-xs leading-5 text-[#667085]">
                  This warning is generated using demo academic logic only.
                </p>
              </div>

              <Link
                href="/interactions"
                className="mt-6 block rounded-2xl bg-[#FF3F4D] px-4 py-3 text-center text-sm font-black text-white"
              >
                View details
              </Link>
            </>
          ) : (
            <>
              <Badge variant="success">Safety status</Badge>
              <h2 className="mt-4 text-2xl font-black">
                No active danger alert
              </h2>
              <p className="mt-3 text-sm leading-6 text-[#667085]">
                No critical demo interaction is currently active for this
                account.
              </p>
            </>
          )}
        </Card>
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-3">
        <Card>
          <Badge
            variant={
              adherenceScore >= 80
                ? "success"
                : adherenceScore >= 50
                  ? "warning"
                  : "danger"
            }
          >
            Adherence
          </Badge>
          <p className="mt-4 text-3xl font-black">{adherenceScore}%</p>
          <p className="mt-2 text-sm text-[#667085]">
            Based on recent logged doses
          </p>
        </Card>

        <Card>
          <Badge variant="info">Medications</Badge>
          <p className="mt-4 text-3xl font-black">{activeMedicationCount}</p>
          <p className="mt-2 text-sm text-[#667085]">
            Active medications in your tracker
          </p>
        </Card>

        <Card>
          <Badge variant={alerts.length > 0 ? "danger" : "success"}>
            Alerts
          </Badge>
          <p className="mt-4 text-3xl font-black">{alerts.length}</p>
          <p className="mt-2 text-sm text-[#667085]">
            Active demo safety alerts
          </p>
        </Card>
      </div>

      <Card className="mt-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-black">Medication list</h2>
            <p className="mt-2 text-sm text-[#667085]">
              These medications are loaded from your Supabase demo data.
            </p>
          </div>

          <Link
            href="/medications/new"
            className="rounded-2xl bg-[#FF3F4D] px-5 py-3 text-sm font-black text-white"
          >
            Add medication
          </Link>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {medications.length === 0 ? (
            <div className="rounded-3xl bg-[#F6F8FB] p-5 text-sm text-[#667085] md:col-span-2 xl:col-span-3">
              No active medications found. Add a medication to begin tracking.
            </div>
          ) : (
            medications.map((medication) => (
              <div
                key={medication.id}
                className="rounded-3xl border border-[#E6EAF0] bg-[#F6F8FB] p-5"
              >
                <Badge
                  variant={
                    medication.status === "pending_review"
                      ? "warning"
                      : medication.status === "active"
                        ? "success"
                        : "default"
                  }
                >
                  {medication.status.replace("_", " ")}
                </Badge>

                <h3 className="mt-4 text-xl font-black">{medication.name}</h3>
                <p className="mt-2 text-sm text-[#667085]">
                  {medication.dose_amount} {medication.dose_unit} •{" "}
                  {medication.frequency}
                </p>
                <p className="mt-4 text-sm leading-6 text-[#667085]">
                  {medication.notes ?? "No notes added."}
                </p>

                <ArchiveMedicationForm
                  action={archiveMedication}
                  medicationId={medication.id}
                  medicationName={medication.name}
                />
              </div>
            ))
          )}
        </div>
      </Card>
    </AppShell>
  );
}