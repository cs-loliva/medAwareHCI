import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

type MedicationLog = {
  id: string;
  scheduled_at: string;
  logged_at: string | null;
  status: "taken" | "missed" | "skipped";
  medication: {
    name: string;
    dose_amount: number;
    dose_unit: string;
  } | null;
};

function getAdherenceScore(logs: MedicationLog[]) {
  if (logs.length === 0) return 100;

  const taken = logs.filter((log) => log.status === "taken").length;
  return Math.round((taken / logs.length) * 100);
}

function getRiskCategory(score: number) {
  if (score >= 80) {
    return {
      label: "Low risk",
      variant: "success" as const,
      description:
        "Your recent adherence pattern is stable in this prototype view.",
    };
  }

  if (score >= 50) {
    return {
      label: "Moderate risk",
      variant: "warning" as const,
      description:
        "Some doses were missed or skipped. Review your medication habits.",
    };
  }

  return {
    label: "High risk",
    variant: "danger" as const,
    description:
      "Multiple doses were missed or skipped. Consider contacting a health professional or caregiver.",
  };
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getStatusVariant(status: MedicationLog["status"]) {
  if (status === "taken") return "success";
  if (status === "missed") return "danger";
  return "warning";
}

function getBreakdown(logs: MedicationLog[]) {
  return {
    taken: logs.filter((log) => log.status === "taken").length,
    missed: logs.filter((log) => log.status === "missed").length,
    skipped: logs.filter((log) => log.status === "skipped").length,
  };
}

export default async function AdherencePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data, error } = await supabase
    .from("medication_logs")
    .select(
      `
      id,
      scheduled_at,
      logged_at,
      status,
      medication:medication_id (
        name,
        dose_amount,
        dose_unit
      )
    `
    )
    .eq("user_id", user.id)
    .order("scheduled_at", { ascending: false })
    .limit(30);

  const logs = ((data ?? []) as unknown as MedicationLog[]).filter(Boolean);
  const score = getAdherenceScore(logs);
  const risk = getRiskCategory(score);
  const breakdown = getBreakdown(logs);

  const sevenDayLogs = logs.filter((log) => {
    const scheduledAt = new Date(log.scheduled_at).getTime();
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return scheduledAt >= sevenDaysAgo;
  });

  const sevenDayScore = getAdherenceScore(sevenDayLogs);

  return (
    <AppShell
      title="Adherence Risk Dashboard"
      subtitle="Review dose-taking patterns, missed doses, and adherence risk."
      activePath="/adherence"
    >
      {error ? (
        <Card>
          <Badge variant="danger">Error</Badge>
          <h2 className="mt-4 text-2xl font-black">
            Could not load adherence data
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#667085]">
            {error.message}
          </p>
        </Card>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <Badge variant={risk.variant}>{risk.label}</Badge>

          <div className="mt-6 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-6xl font-black tracking-tight">{score}%</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#667085]">
                Overall adherence score based on the most recent logged doses in
                this academic prototype.
              </p>
            </div>

            <div className="rounded-[2rem] bg-[#F6F8FB] p-5">
              <p className="text-xs font-black uppercase tracking-wide text-[#667085]">
                7-day score
              </p>
              <p className="mt-2 text-3xl font-black">{sevenDayScore}%</p>
            </div>
          </div>

          <div className="mt-6 rounded-3xl bg-[#FFF6F7] p-5">
            <p className="text-sm font-black text-[#FF3F4D]">
              Risk interpretation
            </p>
            <p className="mt-2 text-sm leading-6 text-[#667085]">
              {risk.description}
            </p>
          </div>
        </Card>

        <Card>
          <h2 className="text-2xl font-black">Dose breakdown</h2>

          <div className="mt-6 grid gap-3">
            <div className="rounded-3xl bg-[#EAFBF3] p-5">
              <Badge variant="success">Taken</Badge>
              <p className="mt-3 text-3xl font-black">{breakdown.taken}</p>
            </div>

            <div className="rounded-3xl bg-[#FFE8EC] p-5">
              <Badge variant="danger">Missed</Badge>
              <p className="mt-3 text-3xl font-black">{breakdown.missed}</p>
            </div>

            <div className="rounded-3xl bg-[#FFF3DD] p-5">
              <Badge variant="warning">Skipped</Badge>
              <p className="mt-3 text-3xl font-black">{breakdown.skipped}</p>
            </div>
          </div>
        </Card>
      </div>

      {score < 50 ? (
        <Card className="mt-5 border-[#FF3F4D]/40 bg-[#FFF6F7]">
          <Badge variant="danger">High adherence risk</Badge>
          <h2 className="mt-4 text-2xl font-black">
            Missed-dose pattern detected
          </h2>
          <p className="mt-3 text-sm leading-6 text-[#667085]">
            This prototype has detected a high-risk adherence pattern. In a real
            medication platform, this should prompt caregiver support or guidance
            from a health professional.
          </p>
        </Card>
      ) : null}

      <Card className="mt-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-black">Recent dose history</h2>
            <p className="mt-2 text-sm text-[#667085]">
              Logged dose events from Supabase demo data.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="rounded-2xl bg-[#FF3F4D] px-5 py-3 text-sm font-black text-white"
          >
            Back to dashboard
          </Link>
        </div>

        <div className="mt-6 overflow-hidden rounded-3xl border border-[#E6EAF0]">
          <div className="grid grid-cols-[1.2fr_1fr_1fr] bg-[#F6F8FB] px-5 py-4 text-xs font-black uppercase tracking-wide text-[#667085]">
            <span>Medication</span>
            <span>Scheduled</span>
            <span>Status</span>
          </div>

          {logs.length === 0 ? (
            <div className="px-5 py-8 text-sm leading-6 text-[#667085]">
              No dose logs are available yet. Add demo medication logs to see
              adherence history.
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="grid grid-cols-[1.2fr_1fr_1fr] border-t border-[#E6EAF0] px-5 py-4 text-sm"
              >
                <div>
                  <p className="font-black text-[#101828]">
                    {log.medication?.name ?? "Unknown medication"}
                  </p>
                  <p className="mt-1 text-xs text-[#667085]">
                    {log.medication
                      ? `${log.medication.dose_amount} ${log.medication.dose_unit}`
                      : "No dose details"}
                  </p>
                </div>

                <div className="text-[#667085]">
                  {formatDateTime(log.scheduled_at)}
                </div>

                <div>
                  <Badge variant={getStatusVariant(log.status)}>
                    {log.status}
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
          This adherence dashboard uses seeded demo logs and simple scoring. It
          does not provide medical advice and should not be used to judge real
          medication adherence.
        </p>
      </Card>
    </AppShell>
  );
}