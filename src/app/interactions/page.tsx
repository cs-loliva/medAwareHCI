import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

type MedicationAlert = {
  id: string;
  severity: "critical" | "moderate" | "low";
  rule_key: string;
  description: string;
  status: string;
  created_at: string;
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

function getSeverityBadge(severity: MedicationAlert["severity"]) {
  if (severity === "critical") return "danger";
  if (severity === "moderate") return "warning";
  return "info";
}

function getSeverityTitle(severity: MedicationAlert["severity"]) {
  if (severity === "critical") return "DANGER ALERT";
  if (severity === "moderate") return "CAUTION ALERT";
  return "SAFETY NOTICE";
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function InteractionsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data, error } = await supabase
    .from("medication_alerts")
    .select(
      `
      id,
      severity,
      rule_key,
      description,
      status,
      created_at,
      medication_a:medication_id_a (
        name,
        dose_amount,
        dose_unit,
        frequency,
        status
      ),
      medication_b:medication_id_b (
        name,
        dose_amount,
        dose_unit,
        frequency,
        status
      )
    `
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const alerts = ((data ?? []) as unknown as MedicationAlert[]).filter(
    (alert) => alert.status === "active"
  );

  const criticalAlerts = alerts.filter((alert) => alert.severity === "critical");
  const nonCriticalAlerts = alerts.filter(
    (alert) => alert.severity !== "critical"
  );

  return (
    <AppShell
      title="Interaction Detail and Triage"
      subtitle="Review active demo medication alerts and decide what action to take."
      activePath="/dashboard"
    >
      {error ? (
        <Card>
          <Badge variant="danger">Error</Badge>
          <h2 className="mt-4 text-2xl font-black">Could not load alerts</h2>
          <p className="mt-2 text-sm leading-6 text-[#667085]">
            {error.message}
          </p>
        </Card>
      ) : null}

      <Card className="border-[#FF3F4D]/30 bg-[#FFF6F7]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Badge variant={criticalAlerts.length > 0 ? "danger" : "success"}>
              {criticalAlerts.length > 0 ? "Action required" : "No critical alert"}
            </Badge>

            <h2 className="mt-4 text-3xl font-black tracking-tight">
              {criticalAlerts.length > 0
                ? "Contact a health professional before continuing."
                : "No active critical medication conflict found."}
            </h2>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#667085]">
              MedAware currently uses mock/demo medication safety rules for this
              academic prototype. These alerts are meant to demonstrate HCI
              warning design and must not be used as real medical advice.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="rounded-2xl bg-white px-5 py-3 text-center text-sm font-black text-[#FF3F4D] shadow-sm"
          >
            Back to dashboard
          </Link>
        </div>
      </Card>

      <div className="mt-5 grid gap-5">
        {alerts.length === 0 ? (
          <Card>
            <Badge variant="success">Clear</Badge>
            <h2 className="mt-4 text-2xl font-black">
              No active demo interaction alerts
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#667085]">
              This account does not currently have active interaction alerts in
              the seeded demo data.
            </p>
          </Card>
        ) : null}

        {criticalAlerts.map((alert) => (
          <Card key={alert.id} className="border-[#FF3F4D]/40">
            <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
              <div>
                <Badge variant={getSeverityBadge(alert.severity)}>
                  {getSeverityTitle(alert.severity)}
                </Badge>

                <h2 className="mt-5 text-3xl font-black tracking-tight">
                  Possible medication conflict
                </h2>

                <p className="mt-3 text-sm leading-6 text-[#667085]">
                  {alert.description}
                </p>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <div className="rounded-3xl bg-[#F6F8FB] p-5">
                    <p className="text-xs font-black uppercase tracking-wide text-[#667085]">
                      Medication A
                    </p>
                    <h3 className="mt-2 text-xl font-black">
                      {alert.medication_a?.name ?? "Unknown"}
                    </h3>
                    <p className="mt-2 text-sm text-[#667085]">
                      {alert.medication_a
                        ? `${alert.medication_a.dose_amount} ${alert.medication_a.dose_unit} • ${alert.medication_a.frequency}`
                        : "No medication details available"}
                    </p>
                  </div>

                  <div className="rounded-3xl bg-[#F6F8FB] p-5">
                    <p className="text-xs font-black uppercase tracking-wide text-[#667085]">
                      Medication B
                    </p>
                    <h3 className="mt-2 text-xl font-black">
                      {alert.medication_b?.name ?? "Unknown"}
                    </h3>
                    <p className="mt-2 text-sm text-[#667085]">
                      {alert.medication_b
                        ? `${alert.medication_b.dose_amount} ${alert.medication_b.dose_unit} • ${alert.medication_b.frequency}`
                        : "No medication details available"}
                    </p>
                  </div>
                </div>

                <div className="mt-6 rounded-3xl bg-[#FFF6F7] p-5">
                  <p className="text-sm font-black text-[#FF3F4D]">
                    Academic prototype disclaimer
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[#667085]">
                    This warning is generated using demo/academic logic only. It
                    does not confirm a real interaction and does not replace
                    advice from a pharmacist, doctor, or other licensed health
                    professional.
                  </p>
                </div>
              </div>

              <aside className="rounded-[2rem] border border-[#E6EAF0] bg-[#F6F8FB] p-5">
                <p className="text-xs font-black uppercase tracking-wide text-[#667085]">
                  Recommended prototype actions
                </p>

                <div className="mt-5 space-y-3">
                  <button className="w-full rounded-2xl bg-[#FF3F4D] px-4 py-3 text-sm font-black text-white">
                    Contact Health Professional
                  </button>

                  <Link
                    href="/dashboard"
                    className="block w-full rounded-2xl bg-white px-4 py-3 text-center text-sm font-black text-[#101828] shadow-sm"
                  >
                    Return to Dashboard
                  </Link>

                  <button className="w-full rounded-2xl bg-[#FFE8EC] px-4 py-3 text-sm font-black text-[#FF3F4D]">
                    Remove Pending Medication
                  </button>
                </div>

                <div className="mt-6 rounded-3xl bg-white p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-[#667085]">
                    Alert metadata
                  </p>
                  <p className="mt-3 text-sm text-[#667085]">
                    Rule: <span className="font-bold">{alert.rule_key}</span>
                  </p>
                  <p className="mt-2 text-sm text-[#667085]">
                    Created:{" "}
                    <span className="font-bold">
                      {formatDateTime(alert.created_at)}
                    </span>
                  </p>
                </div>
              </aside>
            </div>
          </Card>
        ))}

        {nonCriticalAlerts.length > 0 ? (
          <Card>
            <Badge variant="warning">Other cautions</Badge>
            <h2 className="mt-4 text-2xl font-black">
              Non-critical demo alerts
            </h2>

            <div className="mt-5 space-y-4">
              {nonCriticalAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="rounded-3xl border border-[#E6EAF0] bg-[#F6F8FB] p-5"
                >
                  <Badge variant={getSeverityBadge(alert.severity)}>
                    {alert.severity}
                  </Badge>
                  <p className="mt-3 text-sm leading-6 text-[#667085]">
                    {alert.description}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        ) : null}
      </div>
    </AppShell>
  );
}