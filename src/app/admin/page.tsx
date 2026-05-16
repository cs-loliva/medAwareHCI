import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

const auditLogs = [
  "seed.demo_data_created",
  "clinical.review_requested",
  "admin.role_assigned",
];

export default function AdminPage() {
  return (
    <AppShell
      title="Admin Roles and Audit Logs"
      subtitle="Manage oversight, auditability, and system readiness."
      activePath="/admin"
    >
      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <Badge variant="info">Users</Badge>
          <p className="mt-4 text-3xl font-black">6</p>
          <p className="mt-2 text-sm text-[#667085]">Seeded demo accounts</p>
        </Card>

        <Card>
          <Badge variant="success">Database</Badge>
          <p className="mt-4 text-3xl font-black">22</p>
          <p className="mt-2 text-sm text-[#667085]">Tables in schema</p>
        </Card>

        <Card>
          <Badge variant="warning">Prototype</Badge>
          <p className="mt-4 text-3xl font-black">Demo</p>
          <p className="mt-2 text-sm text-[#667085]">
            Mock safety logic only
          </p>
        </Card>
      </div>

      <Card className="mt-5">
        <h2 className="text-2xl font-black">Recent audit events</h2>
        <div className="mt-5 divide-y divide-[#E6EAF0]">
          {auditLogs.map((log) => (
            <div key={log} className="py-4">
              <p className="font-bold text-[#101828]">{log}</p>
              <p className="mt-1 text-sm text-[#667085]">
                Seeded demo event for admin dashboard preview.
              </p>
            </div>
          ))}
        </div>
      </Card>
    </AppShell>
  );
}