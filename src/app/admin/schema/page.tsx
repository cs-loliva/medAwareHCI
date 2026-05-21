import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type SchemaHealthRow = {
  table_schema: string;
  table_name: string;
  status: "healthy" | "warning";
  policy_count: number;
};

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

function badgeVariant(status: SchemaHealthRow["status"]) {
  return status === "healthy" ? "success" : "warning";
}

export default async function AdminSchemaPage() {
  await getCurrentUser();

  const admin = createAdminClient();
  const response = await admin
    .from("schema_health_check")
    .select("table_schema, table_name, status, policy_count")
    .order("table_name", { ascending: true });

  const rows = (response.data ?? []) as SchemaHealthRow[];
  const warningCount = rows.filter((row) => row.status === "warning").length;

  return (
    <AppShell
      title="Schema Health"
      subtitle="Review table policy coverage and schema guardrails for Supabase."
      activePath="/admin/schema"
    >
      <Card className="mb-5">
        <Badge variant={warningCount === 0 ? "success" : "warning"}>
          {warningCount === 0 ? "Healthy" : "Action needed"}
        </Badge>
        <p className="mt-3 text-sm text-[#667085]">
          {rows.length} tables reviewed. {warningCount} tables missing policy coverage.
        </p>
        <Link href="/admin/system" className="mt-4 inline-block text-sm font-semibold text-[#0b4a6f] hover:underline">
          Back to system overview
        </Link>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2 pr-3">Table</th>
                <th className="py-2 pr-3">Schema</th>
                <th className="py-2 pr-3">Policies</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.table_schema}.${row.table_name}`} className="border-b last:border-0">
                  <td className="py-2 pr-3 font-medium">{row.table_name}</td>
                  <td className="py-2 pr-3">{row.table_schema}</td>
                  <td className="py-2 pr-3">{row.policy_count}</td>
                  <td className="py-2">
                    <Badge variant={badgeVariant(row.status)}>{row.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </AppShell>
  );
}
