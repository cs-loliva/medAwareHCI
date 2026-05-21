import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type SchemaHealthRow = {
  table_name: string;
  column_name: string;
  expected_type: string;
  exists: boolean;
};

const medicationMetadataColumns = ["rxcui", "normalized_name", "normalization_source", "normalization_confidence", "safety_evidence", "safety_checked_at"];

const emergencyMedicationMetadataSql = `alter table public.medications
  add column if not exists rxcui text,
  add column if not exists normalized_name text,
  add column if not exists normalization_source text,
  add column if not exists normalization_confidence text,
  add column if not exists safety_evidence jsonb default '[]'::jsonb,
  add column if not exists safety_checked_at timestamptz;

select pg_notify('pgrst', 'reload schema');`;

async function requireAuthenticatedUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
}

export default async function AdminSchemaHealthPage() {
  await requireAuthenticatedUser();
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("get_schema_health");

  const rpcMissing = !!error && (error.message.includes("get_schema_health") || error.code === "PGRST202");
  const rows = (data ?? []) as SchemaHealthRow[];
  const grouped = rows.reduce<Record<string, SchemaHealthRow[]>>((acc, row) => {
    if (!acc[row.table_name]) acc[row.table_name] = [];
    acc[row.table_name].push(row);
    return acc;
  }, {});

  const tableNames = Object.keys(grouped).sort();
  const totalRequiredColumns = rows.length;
  const missingColumns = rows.filter((row) => !row.exists);
  const missingMedicationMetadata = missingColumns.filter((row) => row.table_name === "medications" && medicationMetadataColumns.includes(row.column_name));
  const schemaHealthy = !rpcMissing && missingColumns.length === 0;

  return (
    <AppShell title="Schema Health Check" subtitle="Validate required Supabase columns before and after deployments." activePath="/admin/schema">
      <div className="grid gap-5 md:grid-cols-4">
        <Card><Badge variant="info">Tables checked</Badge><p className="mt-4 text-3xl font-black">{tableNames.length}</p></Card>
        <Card><Badge variant="info">Required columns checked</Badge><p className="mt-4 text-3xl font-black">{totalRequiredColumns}</p></Card>
        <Card><Badge variant={missingColumns.length === 0 ? "success" : "danger"}>Missing columns count</Badge><p className="mt-4 text-3xl font-black">{missingColumns.length}</p></Card>
        <Card><Badge variant={schemaHealthy ? "success" : "warning"}>Schema status</Badge><p className="mt-4 text-2xl font-black">{schemaHealthy ? "Healthy" : rpcMissing ? "RPC missing" : "Action needed"}</p></Card>
      </div>

      <div className="mt-5 grid gap-5">
        {rpcMissing ? <Card><Badge variant="warning">Migration required</Badge><p className="mt-4 text-sm font-bold text-[#101828]">Schema health function is missing. Run supabase/migrations/008_schema_health_check.sql in Supabase SQL Editor.</p></Card> : null}

        {missingMedicationMetadata.length > 0 ? <Card><Badge variant="danger">Medication metadata warning</Badge><p className="mt-4 text-sm font-bold text-[#101828]">Medication metadata columns are missing. Medication creation with RxNorm/openFDA evidence may fail until migration 004 is applied.</p></Card> : null}

        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <Badge variant="warning">Emergency medication metadata migration</Badge>
              <p className="mt-3 text-sm text-[#667085]">Run this block in Supabase SQL Editor if medication metadata columns are missing in production.</p>
            </div>
            <Link href="/admin/system" className="rounded-2xl bg-[#101828] px-5 py-3 text-sm font-black text-white">Back to system overview</Link>
          </div>
          <details className="mt-4 rounded-2xl border border-[#E6EAF0] bg-[#F6F8FB] p-4">
            <summary className="cursor-pointer text-sm font-black text-[#101828]">View SQL quick-fix</summary>
            <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-xs leading-6 text-[#101828]"><code>{emergencyMedicationMetadataSql}</code></pre>
          </details>
        </Card>

        {!rpcMissing ? <Card>
          <Badge variant="info">Required column presence</Badge>
          <div className="mt-5 space-y-5">
            {tableNames.map((tableName) => (
              <div key={tableName}>
                <h2 className="text-lg font-black text-[#101828]">{tableName}</h2>
                <div className="mt-3 overflow-x-auto rounded-2xl border border-[#E6EAF0]">
                  <table className="min-w-full divide-y divide-[#E6EAF0] text-sm">
                    <thead className="bg-[#F6F8FB]"><tr><th className="px-4 py-3 text-left font-black text-[#101828]">Column</th><th className="px-4 py-3 text-left font-black text-[#101828]">Expected type</th><th className="px-4 py-3 text-left font-black text-[#101828]">Status</th></tr></thead>
                    <tbody className="divide-y divide-[#E6EAF0] bg-white">
                      {grouped[tableName].map((row) => (
                        <tr key={`${row.table_name}-${row.column_name}`}>
                          <td className="px-4 py-3 font-mono text-xs">{row.column_name}</td>
                          <td className="px-4 py-3">{row.expected_type}</td>
                          <td className="px-4 py-3"><Badge variant={row.exists ? "success" : "danger"}>{row.exists ? "Present" : "Missing"}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </Card> : null}
      </div>
    </AppShell>
  );
}
