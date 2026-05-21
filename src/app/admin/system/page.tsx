import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type CountResult = {
  label: string;
  table: string;
  count: number;
  status: "healthy" | "warning" | "danger";
  description: string;
};

type AuditLog = {
  id: string;
  action: string;
  created_at: string;
};

function getEnvStatus(value: string | undefined) {
  return value && value.trim().length > 0 ? "configured" : "missing";
}

function getStatusVariant(status: "healthy" | "warning" | "danger") {
  if (status === "healthy") return "success";
  if (status === "warning") return "warning";
  return "danger";
}

function getConfigVariant(status: "configured" | "missing") {
  return status === "configured" ? "success" : "danger";
}

function formatDateTime(value: string | null | undefined) {
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

async function getTableCount(table: string) {
  const admin = createAdminClient();

  const { count, error } = await admin
    .from(table)
    .select("*", { count: "exact", head: true });

  if (error) {
    return {
      count: 0,
      error: error.message,
    };
  }

  return {
    count: count ?? 0,
    error: null,
  };
}

export default async function AdminSystemPage() {
  await getCurrentUser();

  const admin = createAdminClient();

  const [
    profilesCount,
    rolesCount,
    medicationsCount,
    patientsCount,
    clinicalAlertsCount,
    clinicalReviewsCount,
    notificationsCount,
    auditLogsCount,
    outpatientAppointmentsCount,
    activeCriticalAlertsResponse,
    pendingReviewsResponse,
    unreadNotificationsResponse,
    latestAuditResponse,
  ] = await Promise.all([
    getTableCount("profiles"),
    getTableCount("roles"),
    getTableCount("medications"),
    getTableCount("patients"),
    getTableCount("clinical_alerts"),
    getTableCount("clinical_reviews"),
    getTableCount("notifications"),
    getTableCount("audit_logs"),
    getTableCount("outpatient_appointments"),

    admin
      .from("clinical_alerts")
      .select("*", { count: "exact", head: true })
      .eq("status", "active")
      .eq("severity", "critical"),

    admin
      .from("clinical_reviews")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),

    admin
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("status", "unread"),

    admin
      .from("audit_logs")
      .select("id, action, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const latestAuditLogs = (latestAuditResponse.data ?? []) as AuditLog[];

  const dataCounts: CountResult[] = [
    {
      label: "Profiles",
      table: "profiles",
      count: profilesCount.count,
      status: profilesCount.count > 0 ? "healthy" : "danger",
      description: "Seeded user profiles available to the app.",
    },
    {
      label: "Roles",
      table: "roles",
      count: rolesCount.count,
      status: rolesCount.count >= 6 ? "healthy" : "warning",
      description: "Role definitions for civilian, clinical, and admin users.",
    },
    {
      label: "Civilian medications",
      table: "medications",
      count: medicationsCount.count,
      status: medicationsCount.count > 0 ? "healthy" : "warning",
      description: "Medication records for civilian demo workflows.",
    },
    {
      label: "Patients",
      table: "patients",
      count: patientsCount.count,
      status: patientsCount.count > 0 ? "healthy" : "warning",
      description: "Clinical patient records available to hospital views.",
    },
    {
      label: "Clinical alerts",
      table: "clinical_alerts",
      count: clinicalAlertsCount.count,
      status: clinicalAlertsCount.count > 0 ? "healthy" : "warning",
      description: "Medication safety alerts used by clinical dashboards.",
    },
    {
      label: "Clinical reviews",
      table: "clinical_reviews",
      count: clinicalReviewsCount.count,
      status: clinicalReviewsCount.count > 0 ? "healthy" : "warning",
      description: "Pharmacist review queue records.",
    },
    {
      label: "Notifications",
      table: "notifications",
      count: notificationsCount.count,
      status: notificationsCount.count > 0 ? "healthy" : "warning",
      description: "User and clinical team notification records.",
    },
    {
      label: "Audit logs",
      table: "audit_logs",
      count: auditLogsCount.count,
      status: auditLogsCount.count > 0 ? "healthy" : "warning",
      description: "System activity trail for admin review.",
    },
    {
      label: "Outpatient appointments",
      table: "outpatient_appointments",
      count: outpatientAppointmentsCount.count,
      status: outpatientAppointmentsCount.count > 0 ? "healthy" : "warning",
      description: "Clinic queue appointment records.",
    },
  ];

  const environmentItems = [
    {
      name: "NEXT_PUBLIC_SUPABASE_URL",
      status: getEnvStatus(process.env.NEXT_PUBLIC_SUPABASE_URL),
      note: "Required for Supabase client connection.",
    },
    {
      name: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      status: getEnvStatus(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      note: "Public browser-safe Supabase key.",
    },
    {
      name: "SUPABASE_SERVICE_ROLE_KEY",
      status: getEnvStatus(process.env.SUPABASE_SERVICE_ROLE_KEY),
      note: "Server-only admin key. Never expose to the browser.",
    },
    {
      name: "NEXT_PUBLIC_APP_URL",
      status: getEnvStatus(process.env.NEXT_PUBLIC_APP_URL),
      note: "Used for local or deployed app URL references.",
    },
    {
      name: "DEMO_USER_PASSWORD",
      status: getEnvStatus(process.env.DEMO_USER_PASSWORD),
      note: "Used only for local demo user seeding.",
    },
  ] as const;

  const missingEnvCount = environmentItems.filter(
    (item) => item.status === "missing"
  ).length;

  const activeCriticalAlerts = activeCriticalAlertsResponse.count ?? 0;
  const pendingReviews = pendingReviewsResponse.count ?? 0;
  const unreadNotifications = unreadNotificationsResponse.count ?? 0;

  return (
    <AppShell
      title="Admin System Overview"
      subtitle="Inspect environment readiness, database health, safety queues, and audit activity."
      activePath="/admin/system"
    >
      <Card className="mb-5">
        <Badge variant="info">Schema diagnostics</Badge>
        <p className="mt-3 text-sm text-[#667085]">
          Validate Supabase schema policy coverage and migration readiness.
        </p>
        <Link
          href="/admin/schema"
          className="mt-4 inline-flex rounded-full bg-[#0b4a6f] px-4 py-2 text-sm font-semibold text-white hover:bg-[#08364f]"
        >
          Open schema health check
        </Link>
      </Card>

      <div className="grid gap-5 md:grid-cols-4">
        <Card>
          <Badge variant={missingEnvCount === 0 ? "success" : "danger"}>
            Environment
          </Badge>
          <p className="mt-4 text-3xl font-black">
            {environmentItems.length - missingEnvCount}/{environmentItems.length}
          </p>
          <p className="mt-2 text-sm text-[#667085]">
            Required variables configured
          </p>
        </Card>

        <Card>
          <Badge variant={activeCriticalAlerts > 0 ? "danger" : "success"}>
            Critical alerts
          </Badge>
          <p className="mt-4 text-3xl font-black">{activeCriticalAlerts}</p>
          <p className="mt-2 text-sm text-[#667085]">
            Active critical clinical alerts
          </p>
        </Card>

        <Card>
          <Badge variant={pendingReviews > 0 ? "warning" : "success"}>
            Reviews
          </Badge>
          <p className="mt-4 text-3xl font-black">{pendingReviews}</p>
          <p className="mt-2 text-sm text-[#667085]">
            Pending pharmacist reviews
          </p>
        </Card>

        <Card>
          <Badge variant={unreadNotifications > 0 ? "warning" : "success"}>
            Notifications
          </Badge>
          <p className="mt-4 text-3xl font-black">{unreadNotifications}</p>
          <p className="mt-2 text-sm text-[#667085]">
            Unread notification records
          </p>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_420px]">
        <section className="space-y-5">
          <Card>
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <Badge variant="info">Database health</Badge>
                <h2 className="mt-4 text-2xl font-black">
                  Supabase table overview
                </h2>
                <p className="mt-2 text-sm text-[#667085]">
                  Counts are fetched using the server-only Supabase admin client.
                </p>
              </div>

              <Link
                href="/admin"
                className="rounded-2xl bg-[#101828] px-5 py-3 text-sm font-black text-white"
              >
                Back to admin
              </Link>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {dataCounts.map((item) => (
                <div
                  key={item.table}
                  className="rounded-[2rem] border border-[#E6EAF0] bg-[#F6F8FB] p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <Badge variant={getStatusVariant(item.status)}>
                        {item.table}
                      </Badge>
                      <h3 className="mt-4 text-xl font-black">
                        {item.label}
                      </h3>
                    </div>

                    <p className="text-3xl font-black">{item.count}</p>
                  </div>

                  <p className="mt-3 text-sm leading-6 text-[#667085]">
                    {item.description}
                  </p>

                  {item.count === 0 ? (
                    <p className="mt-3 text-sm font-bold text-[#FF3F4D]">
                      No rows found. Check seed data or migrations.
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <Badge variant="warning">Safety queues</Badge>
            <h2 className="mt-4 text-2xl font-black">
              Clinical readiness summary
            </h2>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-3xl bg-[#FFF6F7] p-5">
                <Badge variant={activeCriticalAlerts > 0 ? "danger" : "success"}>
                  Critical
                </Badge>
                <p className="mt-4 text-3xl font-black">
                  {activeCriticalAlerts}
                </p>
                <p className="mt-2 text-sm text-[#667085]">
                  Active danger alerts
                </p>
              </div>

              <div className="rounded-3xl bg-[#FFF3DD] p-5">
                <Badge variant={pendingReviews > 0 ? "warning" : "success"}>
                  Pharmacy
                </Badge>
                <p className="mt-4 text-3xl font-black">{pendingReviews}</p>
                <p className="mt-2 text-sm text-[#667085]">
                  Pending review items
                </p>
              </div>

              <div className="rounded-3xl bg-[#EAF3FF] p-5">
                <Badge variant="info">Audit</Badge>
                <p className="mt-4 text-3xl font-black">
                  {auditLogsCount.count}
                </p>
                <p className="mt-2 text-sm text-[#667085]">
                  Total audit events
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <Badge variant="info">Recent activity</Badge>
            <h2 className="mt-4 text-2xl font-black">Latest audit events</h2>

            <div className="mt-6 space-y-3">
              {latestAuditLogs.length === 0 ? (
                <div className="rounded-3xl bg-[#F6F8FB] p-5 text-sm text-[#667085]">
                  No recent audit events found.
                </div>
              ) : (
                latestAuditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="rounded-3xl border border-[#E6EAF0] bg-[#F6F8FB] p-5"
                  >
                    <p className="font-black text-[#101828]">{log.action}</p>
                    <p className="mt-1 text-sm text-[#667085]">
                      {formatDateTime(log.created_at)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </Card>
        </section>

        <aside className="space-y-5">
          <Card>
            <Badge variant={missingEnvCount === 0 ? "success" : "danger"}>
              Environment
            </Badge>
            <h2 className="mt-4 text-xl font-black">
              Configuration checklist
            </h2>

            <div className="mt-5 space-y-3">
              {environmentItems.map((item) => (
                <div
                  key={item.name}
                  className="rounded-3xl bg-[#F6F8FB] p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs font-black uppercase tracking-wide text-[#101828]">
                      {item.name}
                    </p>
                    <Badge variant={getConfigVariant(item.status)}>
                      {item.status}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-[#667085]">
                    {item.note}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <Badge variant="warning">Deployment readiness</Badge>
            <h2 className="mt-4 text-xl font-black">Before Vercel deploy</h2>

            <div className="mt-5 space-y-3 text-sm leading-6 text-[#667085]">
              <p>✓ Build passes locally with npm run build.</p>
              <p>✓ Supabase migrations have been applied.</p>
              <p>✓ Demo users and seed data exist.</p>
              <p>✓ Service role key is server-only.</p>
              <p>✓ .env.local is not committed.</p>
              <p>✓ Production env vars must be added in Vercel.</p>
            </div>
          </Card>

          <Card>
            <p className="text-sm font-black text-[#FF3F4D]">
              Academic prototype
            </p>
            <p className="mt-2 text-sm leading-6 text-[#667085]">
              This system overview is for demo readiness only. Real healthcare
              deployment would require security review, compliance planning,
              clinical validation, monitoring, and incident response.
            </p>
          </Card>
        </aside>
      </div>
    </AppShell>
  );
}