import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type SchemaHealthRow = {
  table_name: string;
  column_name: string;
  expected_type: string;
  exists: boolean;
};

const MEDICATION_METADATA_COLUMNS = new Set([
  "rxcui",
  "normalized_name",
  "normalization_source",
  "normalization_confidence",
  "safety_evidence",
  "safety_checked_at",
]);

const EMERGENCY_SQL = `alter table public.medications
  add column if not exists rxcui text,
  add column if not exists normalized_name text,
  add column if not exists normalization_source text,
  add column if not exists normalization_confidence text,
  add column if not exists safety_evidence jsonb default '[]'::jsonb,
  add column if not exists safety_checked_at timestamptz;

select pg_notify('pgrst', 'reload schema');`;

async function getCurrentAdminUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: roleRows } = await admin
    .from("user_roles")
    .select("roles(name)")
    .eq("user_id", user.id);

  const isAdmin = (roleRows ?? []).some(
    (row) => ((row.roles as { name?: string } | null)?.name ?? "") === "admin"
  );

  if (!isAdmin) redirect("/unauthorized");
}

function groupByTable(rows: SchemaHealthRow[]) {
  return rows.reduce<Record<string, SchemaHealthRow[]>>((acc, row) => {
    acc[row.table_name] = [...(acc[row.table_name] ?? []), row];
    return acc;
  }, {});
}

export default async function AdminSchemaPage() {
  await getCurrentAdminUser();

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("get_schema_health");

  const isMissingRpc = Boolean(error?.message?.toLowerCase().includes("get_schema_health"));
  const rows = (data ?? []) as SchemaHealthRow[];
  const grouped = groupByTable(rows);

  const tablesChecked = Object.keys(grouped).length;
  const columnsChecked = rows.length;
  const missingColumnsCount = rows.filter((row) => !row.exists).length;
  const schemaHealthy = !isMissingRpc && missingColumnsCount === 0 && columnsChecked > 0;

  const hasMedicationMetadataMissing = rows.some(
    (row) => row.table_name === "medications" && MEDICATION_METADATA_COLUMNS.has(row.column_name) && !row.exists
  );

  return (
    <AppShell
      title="Schema Health"
      subtitle="Verify required Supabase columns for admin and deployment safety checks."
      activePath="/admin/schema"
    >
      <div className="space-y-5">
        {isMissingRpc ? (
          <Card>
            <Badge variant="danger">Missing RPC</Badge>
            <p className="mt-3 text-sm text-[#101828]">
              Schema health function is missing. Run supabase/migrations/008_schema_health_check.sql in Supabase SQL Editor.
            </p>
          </Card>
        ) : null}

        {hasMedicationMetadataMissing ? (
          <Card>
            <Badge variant="warning">Medication metadata warning</Badge>
            <p className="mt-3 text-sm text-[#101828]">
              Medication metadata columns are missing. Medication creation with RxNorm/openFDA evidence may fail until migration 004 is applied.
            </p>
          </Card>
        ) : null}

        <div className="grid gap-5 md:grid-cols-4">
          <Card><Badge variant="info">Tables checked</Badge><p className="mt-4 text-3xl font-black">{tablesChecked}</p></Card>
          <Card><Badge variant="info">Required columns checked</Badge><p className="mt-4 text-3xl font-black">{columnsChecked}</p></Card>
          <Card><Badge variant={missingColumnsCount === 0 ? "success" : "danger"}>Missing columns count</Badge><p className="mt-4 text-3xl font-black">{missingColumnsCount}</p></Card>
          <Card><Badge variant={schemaHealthy ? "success" : "warning"}>Schema status</Badge><p className="mt-4 text-2xl font-black">{schemaHealthy ? "Healthy" : "Needs attention"}</p></Card>
        </div>

        <Card>
          <Badge variant="warning">Emergency medication metadata migration</Badge>
          <pre className="mt-4 overflow-x-auto rounded-xl bg-[#F6F8FB] p-4 text-xs text-[#334155]">{EMERGENCY_SQL}</pre>
        </Card>

        {error && !isMissingRpc ? (
          <Card>
            <Badge variant="danger">RPC Error</Badge>
            <p className="mt-3 text-sm text-[#101828]">{error.message}</p>
          </Card>
        ) : null}

        {Object.entries(grouped).map(([tableName, tableRows]) => (
          <Card key={tableName}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-black">{tableName}</h2>
              <Badge variant={tableRows.some((row) => !row.exists) ? "warning" : "success"}>
                {tableRows.some((row) => !row.exists) ? "Missing columns" : "Complete"}
              </Badge>
            </div>
            <ul className="mt-4 space-y-2">
              {tableRows.map((row) => (
                <li key={`${row.table_name}:${row.column_name}`} className="flex items-center justify-between rounded-xl bg-[#F6F8FB] p-3">
                  <div>
                    <p className="font-bold text-[#101828]">{row.column_name}</p>
                    <p className="text-xs text-[#667085]">Expected type: {row.expected_type}</p>
                  </div>
                  <Badge variant={row.exists ? "success" : "danger"}>{row.exists ? "Present" : "Missing"}</Badge>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
