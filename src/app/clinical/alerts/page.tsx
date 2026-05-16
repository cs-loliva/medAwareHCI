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

type ClinicalAlert = {
  id: string;
  patient_id: string;
  severity: "critical" | "moderate" | "low";
  rule_key: string;
  description: string;
  status: "active" | "acknowledged" | "resolved";
  acknowledged_at: string | null;
  created_at: string;
  patient: {
    full_name: string;
    room_number: string | null;
    ward: string | null;
    primary_diagnosis: string | null;
  } | null;
  medication_a: {
    name: string;
    dose_amount: number;
    dose_unit: string;
    frequency: string;
    status: string;
  } | null;
  medication_b: {
    name: string;
    dose_amount: number;
    dose_unit: string;
    frequency: string;
    status: string;
  } | null;
};

function getSeverityVariant(severity: ClinicalAlert["severity"]) {
  if (severity === "critical") return "danger";
  if (severity === "moderate") return "warning";
  return "info";
}

function getStatusVariant(status: ClinicalAlert["status"]) {
  if (status === "active") return "danger";
  if (status === "acknowledged") return "warning";
  return "success";
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

function sortAlerts(alerts: ClinicalAlert[]) {
  const severityOrder = {
    critical: 0,
    moderate: 1,
    low: 2,
  };

  return [...alerts].sort((a, b) => {
    const severityDifference =
      severityOrder[a.severity] - severityOrder[b.severity];

    if (severityDifference !== 0) return severityDifference;

    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
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

async function acknowledgeAlert(formData: FormData) {
  "use server";

  const user = await getCurrentUser();
  const supabase = await createClient();

  const alertId = String(formData.get("alertId") ?? "");

  if (!alertId) {
    redirect("/clinical/alerts?error=Missing alert id.");
  }

  const { error } = await supabase
    .from("clinical_alerts")
    .update({
      status: "acknowledged",
      acknowledged_by: user.id,
      acknowledged_at: new Date().toISOString(),
    })
    .eq("id", alertId);

  if (error) {
    redirect(`/clinical/alerts?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/clinical/alerts");
  redirect("/clinical/alerts?message=Clinical alert acknowledged.");
}

export default async function ClinicalAlertsPage({ searchParams }: PageProps) {
  await getCurrentUser();

  const params = searchParams ? await searchParams : {};
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("clinical_alerts")
    .select(
      `
      id,
      patient_id,
      severity,
      rule_key,
      description,
      status,
      acknowledged_at,
      created_at,
      patient:patient_id (
        full_name,
        room_number,
        ward,
        primary_diagnosis
      ),
      medication_a:patient_medication_id_a (
        name,
        dose_amount,
        dose_unit,
        frequency,
        status
      ),
      medication_b:patient_medication_id_b (
        name,
        dose_amount,
        dose_unit,
        frequency,
        status
      )
    `
    )
    .order("created_at", { ascending: false });

  const alerts = sortAlerts((data ?? []) as unknown as ClinicalAlert[]);

  const activeAlerts = alerts.filter((alert) => alert.status === "active");
  const criticalAlerts = activeAlerts.filter(
    (alert) => alert.severity === "critical"
  );
  const acknowledgedAlerts = alerts.filter(
    (alert) => alert.status === "acknowledged"
  );

  return (
    <AppShell
      title="Hospital Alert Center"
      subtitle="Centralized medication safety alerts across active clinical patients."
      activePath="/clinical/alerts"
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

      {error ? (
        <Card className="mb-5">
          <Badge variant="danger">Load warning</Badge>
          <p className="mt-3 text-sm leading-6 text-[#667085]">
            {error.message}
          </p>
        </Card>
      ) : null}

      <div className="grid gap-5 md:grid-cols-3">
        <Card>
          <Badge variant={criticalAlerts.length > 0 ? "danger" : "success"}>
            Critical
          </Badge>
          <p className="mt-4 text-3xl font-black">{criticalAlerts.length}</p>
          <p className="mt-2 text-sm text-[#667085]">
            Active critical medication alerts
          </p>
        </Card>

        <Card>
          <Badge variant={activeAlerts.length > 0 ? "warning" : "success"}>
            Active
          </Badge>
          <p className="mt-4 text-3xl font-black">{activeAlerts.length}</p>
          <p className="mt-2 text-sm text-[#667085]">
            Alerts awaiting review or acknowledgement
          </p>
        </Card>

        <Card>
          <Badge variant="info">Acknowledged</Badge>
          <p className="mt-4 text-3xl font-black">
            {acknowledgedAlerts.length}
          </p>
          <p className="mt-2 text-sm text-[#667085]">
            Alerts already acknowledged by staff
          </p>
        </Card>
      </div>

      <Card className="mt-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-black">Clinical alerts</h2>
            <p className="mt-2 text-sm text-[#667085]">
              Alerts are sorted by severity, with critical alerts shown first.
            </p>
          </div>

          <Link
            href="/clinical/patients"
            className="rounded-2xl bg-[#FF3F4D] px-5 py-3 text-sm font-black text-white"
          >
            Back to patient board
          </Link>
        </div>

        <div className="mt-6 space-y-4">
          {alerts.length === 0 ? (
            <div className="rounded-3xl bg-[#F6F8FB] p-5 text-sm text-[#667085]">
              No clinical alerts found.
            </div>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert.id}
                className={`rounded-[2rem] border p-5 ${
                  alert.severity === "critical" && alert.status === "active"
                    ? "border-[#FF3F4D]/40 bg-[#FFF6F7]"
                    : "border-[#E6EAF0] bg-[#F6F8FB]"
                }`}
              >
                <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <Badge variant={getSeverityVariant(alert.severity)}>
                        {alert.severity}
                      </Badge>

                      <Badge variant={getStatusVariant(alert.status)}>
                        {alert.status}
                      </Badge>

                      <span className="text-xs font-bold uppercase tracking-wide text-[#667085]">
                        {alert.rule_key}
                      </span>
                    </div>

                    <h3 className="mt-4 text-2xl font-black">
                      {alert.severity === "critical"
                        ? "DO NOT ADMINISTER"
                        : "Medication caution"}
                    </h3>

                    <p className="mt-3 text-sm leading-6 text-[#667085]">
                      {alert.description}
                    </p>

                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                      <div className="rounded-3xl bg-white p-5">
                        <p className="text-xs font-black uppercase tracking-wide text-[#667085]">
                          Patient
                        </p>
                        <p className="mt-2 text-lg font-black">
                          {alert.patient?.full_name ?? "Unknown patient"}
                        </p>
                        <p className="mt-1 text-sm text-[#667085]">
                          Room {alert.patient?.room_number ?? "N/A"} •{" "}
                          {alert.patient?.ward ?? "No ward"}
                        </p>
                        <p className="mt-2 text-sm text-[#667085]">
                          {alert.patient?.primary_diagnosis ??
                            "No diagnosis listed"}
                        </p>
                      </div>

                      <div className="rounded-3xl bg-white p-5">
                        <p className="text-xs font-black uppercase tracking-wide text-[#667085]">
                          Detected
                        </p>
                        <p className="mt-2 text-sm font-bold text-[#101828]">
                          {formatDateTime(alert.created_at)}
                        </p>
                        <p className="mt-2 text-sm text-[#667085]">
                          Acknowledged:{" "}
                          <span className="font-bold">
                            {formatDateTime(alert.acknowledged_at)}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                      <div className="rounded-3xl border border-[#E6EAF0] bg-white p-5">
                        <p className="text-xs font-black uppercase tracking-wide text-[#667085]">
                          Medication A
                        </p>
                        <p className="mt-2 text-lg font-black">
                          {alert.medication_a?.name ?? "Unknown"}
                        </p>
                        <p className="mt-1 text-sm text-[#667085]">
                          {alert.medication_a
                            ? `${alert.medication_a.dose_amount} ${alert.medication_a.dose_unit} • ${alert.medication_a.frequency}`
                            : "No medication details"}
                        </p>
                      </div>

                      <div className="rounded-3xl border border-[#E6EAF0] bg-white p-5">
                        <p className="text-xs font-black uppercase tracking-wide text-[#667085]">
                          Medication B
                        </p>
                        <p className="mt-2 text-lg font-black">
                          {alert.medication_b?.name ?? "Unknown"}
                        </p>
                        <p className="mt-1 text-sm text-[#667085]">
                          {alert.medication_b
                            ? `${alert.medication_b.dose_amount} ${alert.medication_b.dose_unit} • ${alert.medication_b.frequency}`
                            : "No medication details"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <aside className="rounded-[2rem] bg-white p-5 shadow-sm">
                    <p className="text-xs font-black uppercase tracking-wide text-[#667085]">
                      Alert actions
                    </p>

                    {alert.status === "active" ? (
                      <form action={acknowledgeAlert} className="mt-5">
                        <input type="hidden" name="alertId" value={alert.id} />
                        <button
                          type="submit"
                          className="w-full rounded-2xl bg-[#FF3F4D] px-4 py-3 text-sm font-black text-white"
                        >
                          Acknowledge alert
                        </button>
                      </form>
                    ) : (
                      <div className="mt-5 rounded-2xl bg-[#F6F8FB] p-4 text-sm font-bold text-[#667085]">
                        This alert has already been acknowledged.
                      </div>
                    )}
                    {alert.severity === "critical" ? (
  <Link
    href={`/clinical/alerts/${alert.id}`}
    className="mt-3 block w-full rounded-2xl bg-[#FF3F4D] px-4 py-3 text-center text-sm font-black text-white"
  >
    Open danger alert
  </Link>
) : null}

                    <Link
                      href="/clinical/patients"
                      className="mt-3 block w-full rounded-2xl bg-[#101828] px-4 py-3 text-center text-sm font-black text-white"
                    >
                      Open patient board
                    </Link>

                    <div className="mt-5 rounded-3xl bg-[#FFF6F7] p-4">
                      <p className="text-sm font-black text-[#FF3F4D]">
                        Prototype safety note
                      </p>
                      <p className="mt-2 text-xs leading-5 text-[#667085]">
                        This alert uses seeded demo logic only. It is not real
                        clinical decision support.
                      </p>
                    </div>
                  </aside>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </AppShell>
  );
}