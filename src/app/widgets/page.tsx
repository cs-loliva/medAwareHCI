import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

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
  description: string;
  status: string;
};

function formatTime(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  const date = new Date();
  date.setHours(hour, minute, 0, 0);

  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

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

function getMinutesUntil(date: Date) {
  const diff = Math.max(date.getTime() - Date.now(), 0);
  return Math.round(diff / 60000);
}

function getAlertLabel(alerts: MedicationAlert[]) {
  if (alerts.some((alert) => alert.severity === "critical")) {
    return "Danger alert";
  }

  if (alerts.length > 0) {
    return "Caution";
  }

  return "Safe";
}

function getAlertVariant(alerts: MedicationAlert[]) {
  if (alerts.some((alert) => alert.severity === "critical")) {
    return "danger";
  }

  if (alerts.length > 0) {
    return "warning";
  }

  return "success";
}

type WidgetPreviewProps = {
  platform: "iOS" | "Android";
  theme: "light" | "dark";
  medicationName: string;
  doseLabel: string;
  timeLabel: string;
  minutesUntil: number;
  alertLabel: string;
  hasDangerAlert: boolean;
};

function WidgetPreview({
  platform,
  theme,
  medicationName,
  doseLabel,
  timeLabel,
  minutesUntil,
  alertLabel,
  hasDangerAlert,
}: WidgetPreviewProps) {
  const isDark = theme === "dark";
  const isIOS = platform === "iOS";

  return (
    <div
      className={`rounded-[2rem] p-5 ${
        isDark ? "bg-[#101828]" : "bg-[#F6F8FB]"
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p
            className={`text-xs font-black uppercase tracking-[0.2em] ${
              isDark ? "text-white/60" : "text-[#667085]"
            }`}
          >
            {platform} {theme}
          </p>
          <h3
            className={`mt-1 text-xl font-black ${
              isDark ? "text-white" : "text-[#101828]"
            }`}
          >
            Next dose
          </h3>
        </div>

        <div
          className={`flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-black ${
            hasDangerAlert
              ? "bg-[#FF3F4D] text-white"
              : isDark
                ? "bg-white/10 text-white"
                : "bg-white text-[#FF3F4D]"
          }`}
        >
          M+
        </div>
      </div>

      <div
        className={`mt-5 rounded-[1.6rem] p-5 ${
          isDark ? "bg-white/10" : "bg-white"
        } ${isIOS ? "shadow-sm" : "border border-black/5"}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p
              className={`text-xs font-black uppercase tracking-wide ${
                hasDangerAlert
                  ? "text-[#FF3F4D]"
                  : isDark
                    ? "text-white/60"
                    : "text-[#667085]"
              }`}
            >
              {alertLabel}
            </p>

            <h4
              className={`mt-3 text-2xl font-black ${
                isDark ? "text-white" : "text-[#101828]"
              }`}
            >
              {medicationName}
            </h4>

            <p
              className={`mt-2 text-sm ${
                isDark ? "text-white/70" : "text-[#667085]"
              }`}
            >
              {doseLabel} • {timeLabel}
            </p>
          </div>

          <div
            className={`rounded-2xl px-4 py-3 text-center ${
              hasDangerAlert
                ? "bg-[#FFE8EC]"
                : isDark
                  ? "bg-white/10"
                  : "bg-[#F6F8FB]"
            }`}
          >
            <p
              className={`text-xs font-black ${
                hasDangerAlert ? "text-[#FF3F4D]" : "text-[#667085]"
              }`}
            >
              In
            </p>
            <p
              className={`mt-1 text-xl font-black ${
                hasDangerAlert
                  ? "text-[#FF3F4D]"
                  : isDark
                    ? "text-white"
                    : "text-[#101828]"
              }`}
            >
              {minutesUntil}m
            </p>
          </div>
        </div>

        <div
          className={`mt-5 h-2 overflow-hidden rounded-full ${
            isDark ? "bg-white/10" : "bg-[#E6EAF0]"
          }`}
        >
          <div
            className={`h-full rounded-full ${
              hasDangerAlert ? "bg-[#FF3F4D]" : "bg-[#12B76A]"
            }`}
            style={{ width: `${Math.max(20, 100 - minutesUntil)}%` }}
          />
        </div>

        <p
          className={`mt-4 text-xs leading-5 ${
            isDark ? "text-white/60" : "text-[#667085]"
          }`}
        >
          {hasDangerAlert
            ? "Contact a health professional before continuing."
            : "Medication reminder ready."}
        </p>
      </div>
    </div>
  );
}

export default async function WidgetsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [medicationsResponse, schedulesResponse, alertsResponse] =
    await Promise.all([
      supabase
        .from("medications")
        .select("id, name, dose_amount, dose_unit, frequency, notes, status")
        .eq("user_id", user.id)
        .neq("status", "inactive")
        .order("created_at", { ascending: true }),

      supabase
        .from("medication_schedules")
        .select("id, medication_id, scheduled_time")
        .order("scheduled_time", { ascending: true }),

      supabase
        .from("medication_alerts")
        .select("id, severity, description, status")
        .eq("user_id", user.id)
        .eq("status", "active"),
    ]);

  const medications = (medicationsResponse.data ?? []) as Medication[];
  const allSchedules = (schedulesResponse.data ?? []) as MedicationSchedule[];
  const alerts = (alertsResponse.data ?? []) as MedicationAlert[];

  const medicationIds = new Set(medications.map((medication) => medication.id));
  const schedules = allSchedules.filter((schedule) =>
    medicationIds.has(schedule.medication_id)
  );

  const nextDose = getNextDose(medications, schedules);

  const medicationName = nextDose?.medication.name ?? "No medication";
  const doseLabel = nextDose
    ? `${nextDose.medication.dose_amount} ${nextDose.medication.dose_unit}`
    : "No dose";
  const timeLabel = nextDose
    ? formatTime(nextDose.scheduledTime)
    : "No schedule";
  const minutesUntil = nextDose ? getMinutesUntil(nextDose.scheduledAt) : 0;

  const alertLabel = getAlertLabel(alerts);
  const hasDangerAlert = alerts.some((alert) => alert.severity === "critical");

  return (
    <AppShell
      title="Medication Widget Mockups"
      subtitle="Preview home-screen medication reminder widgets for iOS and Android."
      activePath="/widgets"
    >
      {medicationsResponse.error ||
      schedulesResponse.error ||
      alertsResponse.error ? (
        <Card className="mb-5">
          <Badge variant="danger">Load warning</Badge>
          <p className="mt-3 text-sm leading-6 text-[#667085]">
            {medicationsResponse.error?.message ??
              schedulesResponse.error?.message ??
              alertsResponse.error?.message}
          </p>
        </Card>
      ) : null}

      <div className="grid gap-5 md:grid-cols-3">
        <Card>
          <Badge variant="info">Next dose</Badge>
          <p className="mt-4 text-3xl font-black">{medicationName}</p>
          <p className="mt-2 text-sm text-[#667085]">
            {doseLabel} • {timeLabel}
          </p>
        </Card>

        <Card>
          <Badge variant={getAlertVariant(alerts)}>{alertLabel}</Badge>
          <p className="mt-4 text-3xl font-black">{alerts.length}</p>
          <p className="mt-2 text-sm text-[#667085]">
            Active medication alert records
          </p>
        </Card>

        <Card>
          <Badge variant="warning">Prototype</Badge>
          <p className="mt-4 text-3xl font-black">4</p>
          <p className="mt-2 text-sm text-[#667085]">
            Widget visual variants
          </p>
        </Card>
      </div>

      <Card className="mt-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <Badge variant="info">Design previews</Badge>
            <h2 className="mt-4 text-2xl font-black">
              Home-screen widget variants
            </h2>
            <p className="mt-2 text-sm text-[#667085]">
              These are visual mockups only. Native iOS and Android widget
              implementation would require platform-specific development.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="rounded-2xl bg-[#FF3F4D] px-5 py-3 text-sm font-black text-white"
          >
            Back to dashboard
          </Link>
        </div>

        <div className="mt-6 grid gap-5 xl:grid-cols-2">
          <WidgetPreview
            platform="iOS"
            theme="light"
            medicationName={medicationName}
            doseLabel={doseLabel}
            timeLabel={timeLabel}
            minutesUntil={minutesUntil}
            alertLabel={alertLabel}
            hasDangerAlert={hasDangerAlert}
          />

          <WidgetPreview
            platform="iOS"
            theme="dark"
            medicationName={medicationName}
            doseLabel={doseLabel}
            timeLabel={timeLabel}
            minutesUntil={minutesUntil}
            alertLabel={alertLabel}
            hasDangerAlert={hasDangerAlert}
          />

          <WidgetPreview
            platform="Android"
            theme="light"
            medicationName={medicationName}
            doseLabel={doseLabel}
            timeLabel={timeLabel}
            minutesUntil={minutesUntil}
            alertLabel={alertLabel}
            hasDangerAlert={hasDangerAlert}
          />

          <WidgetPreview
            platform="Android"
            theme="dark"
            medicationName={medicationName}
            doseLabel={doseLabel}
            timeLabel={timeLabel}
            minutesUntil={minutesUntil}
            alertLabel={alertLabel}
            hasDangerAlert={hasDangerAlert}
          />
        </div>
      </Card>

      <Card className="mt-5">
        <Badge variant="success">Widget design requirements</Badge>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl bg-[#F6F8FB] p-5">
            <h3 className="text-lg font-black">Civilian safety goals</h3>
            <p className="mt-2 text-sm leading-6 text-[#667085]">
              Show the next medication, dose, scheduled time, and clear warning
              state without requiring the user to open the full app.
            </p>
          </div>

          <div className="rounded-3xl bg-[#F6F8FB] p-5">
            <h3 className="text-lg font-black">Danger alert behavior</h3>
            <p className="mt-2 text-sm leading-6 text-[#667085]">
              Critical alerts visually override normal reminders and direct the
              user to contact a health professional before continuing.
            </p>
          </div>

          <div className="rounded-3xl bg-[#F6F8FB] p-5">
            <h3 className="text-lg font-black">Platform note</h3>
            <p className="mt-2 text-sm leading-6 text-[#667085]">
              iOS widgets would use WidgetKit. Android widgets would use
              Jetpack Glance or traditional App Widgets.
            </p>
          </div>

          <div className="rounded-3xl bg-[#F6F8FB] p-5">
            <h3 className="text-lg font-black">Prototype limitation</h3>
            <p className="mt-2 text-sm leading-6 text-[#667085]">
              These previews are web-rendered mockups, not real installable
              operating-system widgets.
            </p>
          </div>
        </div>
      </Card>
    </AppShell>
  );
}