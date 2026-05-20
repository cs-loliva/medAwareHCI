import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ ownerId: string }>;
};

type Profile = {
  id: string;
  full_name: string;
  email: string;
};

type CareCircleMember = {
  id: string;
  owner_id: string;
  caregiver_id: string;
  permission: "view" | "manage";
  status: "pending" | "active" | "revoked";
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
  created_at: string;
};

function getNextDose(medications: Medication[], schedules: MedicationSchedule[]) {
  const now = new Date();
  const candidates = schedules
    .map((schedule) => {
      const medication = medications.find((item) => item.id === schedule.medication_id);
      if (!medication) return null;
      const [hour, minute] = schedule.scheduled_time.split(":").map(Number);
      const scheduledToday = new Date(now);
      scheduledToday.setHours(hour, minute, 0, 0);
      const scheduledAt =
        scheduledToday.getTime() <= now.getTime()
          ? new Date(scheduledToday.getTime() + 24 * 60 * 60 * 1000)
          : scheduledToday;
      return { medication, scheduledAt, scheduledTime: schedule.scheduled_time };
    })
    .filter(Boolean) as Array<{ medication: Medication; scheduledAt: Date; scheduledTime: string }>;

  return candidates.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())[0];
}

function formatTime(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
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

export default async function SharedMedicationViewPage({ params }: PageProps) {
  const { ownerId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: membership } = await admin
    .from("care_circle_members")
    .select("id, owner_id, caregiver_id, permission, status")
    .eq("owner_id", ownerId)
    .eq("caregiver_id", user.id)
    .eq("status", "active")
    .maybeSingle<CareCircleMember>();

  if (!membership) redirect("/care-circle?error=Shared%20access%20not%20found.");

  const [profileResponse, medsResponse, alertsResponse, logsResponse] = await Promise.all([
    admin.from("profiles").select("id, full_name, email").eq("id", ownerId).maybeSingle<Profile>(),
    admin.from("medications").select("id, name, dose_amount, dose_unit, frequency, notes, status").eq("user_id", ownerId).neq("status", "inactive").order("created_at", { ascending: true }),
    admin.from("medication_alerts").select("id, severity, rule_key, description, status").eq("user_id", ownerId).eq("status", "active").order("created_at", { ascending: false }),
    admin.from("medication_logs").select("id, status, created_at").eq("user_id", ownerId).order("created_at", { ascending: false }).limit(30),
  ]);

  const medications = (medsResponse.data ?? []) as Medication[];
  const alerts = (alertsResponse.data ?? []) as MedicationAlert[];
  const logs = (logsResponse.data ?? []) as MedicationLog[];
  const medicationIds = medications.map((medication) => medication.id);

  const schedulesResponse = medicationIds.length > 0
    ? await admin.from("medication_schedules").select("id, medication_id, scheduled_time").in("medication_id", medicationIds)
    : { data: [] };

  const schedules = (schedulesResponse.data ?? []) as MedicationSchedule[];
  const nextDose = getNextDose(medications, schedules);
  const adherenceScore = getAdherenceScore(logs);

  return (
    <AppShell title="Shared medication view" subtitle="View-only medication information shared through Care Circle." activePath="/care-circle">
      <div className="mb-5">
        <Link href="/care-circle" className="text-sm font-bold text-[#FF3F4D] underline-offset-2 hover:underline">← Back to Care Circle</Link>
      </div>

      <Card className="mb-5 border-[#FDB022]/40 bg-[#FFFAEB]">
        <Badge variant="warning">Safety notice</Badge>
        <p className="mt-3 text-sm leading-6 text-[#667085]">This shared view is for care coordination only. It does not replace professional medical advice, and caregivers should not change medication use without guidance from a licensed health professional.</p>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <Badge variant="info">Care recipient</Badge>
          <p className="mt-3 text-lg font-black text-[#101828]">{profileResponse.data?.full_name ?? "Unknown user"}</p>
          <p className="mt-1 text-sm text-[#667085]">{profileResponse.data?.email ?? ownerId}</p>
          <div className="mt-3">
            <Badge variant={membership.permission === "manage" ? "warning" : "info"}>
              Access: {membership.permission}
            </Badge>
          </div>
        </Card>
        <Card><Badge variant="success">Active medications</Badge><p className="mt-3 text-3xl font-black text-[#101828]">{medications.length}</p></Card>
        <Card><Badge variant="info">Adherence score</Badge><p className="mt-3 text-3xl font-black text-[#101828]">{adherenceScore}%</p><p className="mt-1 text-sm text-[#667085]">Based on recent dose logs.</p></Card>
        <Card><Badge variant="warning">Active alerts</Badge><p className="mt-3 text-3xl font-black text-[#101828]">{alerts.length}</p></Card>
      </div>

      <Card className="mt-5">
        <Badge variant="info">Next dose</Badge>
        {nextDose ? <p className="mt-3 text-sm text-[#667085]"><span className="font-black text-[#101828]">{nextDose.medication.name}</span> at {formatTime(nextDose.scheduledTime)}</p> : <p className="mt-3 text-sm text-[#667085]">No schedules found for active medications.</p>}
      </Card>

      <section className="mt-5 space-y-4">
        <h2 className="text-2xl font-black text-[#101828]">Medications</h2>
        {medications.length === 0 ? <Card><p className="text-sm text-[#667085]">No active medications were shared.</p></Card> : medications.map((medication) => {
          const medicationSchedules = schedules.filter((s) => s.medication_id === medication.id);
          return (
            <Card key={medication.id}>
              <div className="flex flex-wrap items-center gap-3"><h3 className="text-xl font-black text-[#101828]">{medication.name}</h3><Badge variant="success">{medication.status}</Badge></div>
              <p className="mt-2 text-sm text-[#667085]">{medication.dose_amount} {medication.dose_unit} • {medication.frequency}</p>
              {medication.notes ? <p className="mt-2 text-sm text-[#667085]">{medication.notes}</p> : null}
              <div className="mt-3 flex flex-wrap gap-2">{medicationSchedules.length === 0 ? <Badge variant="info">No schedules</Badge> : medicationSchedules.map((schedule) => <Badge key={schedule.id} variant="info">{formatTime(schedule.scheduled_time)}</Badge>)}</div>
            </Card>
          );
        })}
      </section>

      <section className="mt-5"><Card><h2 className="text-xl font-black text-[#101828]">Active alerts</h2><div className="mt-4 space-y-3">{alerts.length === 0 ? <p className="text-sm text-[#667085]">No active alerts.</p> : alerts.map((alert) => <div key={alert.id} className="rounded-2xl bg-[#F6F8FB] p-4"><div className="flex items-center gap-2"><Badge variant={getAlertVariant(alert.severity)}>{alert.severity}</Badge><p className="text-sm font-bold text-[#101828]">{alert.rule_key}</p></div><p className="mt-2 text-sm text-[#667085]">{alert.description}</p></div>)}</div></Card></section>

      <section className="mt-5"><Card><h2 className="text-xl font-black text-[#101828]">Recent dose history</h2><div className="mt-4 space-y-3">{logs.length === 0 ? <p className="text-sm text-[#667085]">No recent medication logs.</p> : logs.map((log) => <div key={log.id} className="flex items-center justify-between rounded-2xl bg-[#F6F8FB] p-4"><Badge variant={log.status === "taken" ? "success" : log.status === "missed" ? "danger" : "warning"}>{log.status}</Badge><p className="text-sm text-[#667085]">{new Date(log.created_at).toLocaleString()}</p></div>)}</div></Card></section>
    </AppShell>
  );
}
