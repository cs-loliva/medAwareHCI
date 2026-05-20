import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

type PageProps = { params: Promise<{ medicationId: string }> };

type Evidence = { section: string; text: string; matchedBy: string };

export default async function MedicationSafetyEvidencePage({ params }: PageProps) {
  const { medicationId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: medication, error } = await supabase
    .from("medications")
    .select("id, name, normalized_name, rxcui, normalization_confidence, safety_checked_at, safety_evidence")
    .eq("id", medicationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !medication) {
    redirect("/dashboard?error=Medication not found.");
  }

  const evidence = (Array.isArray(medication.safety_evidence) ? medication.safety_evidence : []) as Evidence[];

  return (
    <AppShell
      title="Safety evidence"
      subtitle="Public label evidence for educational safety awareness in this prototype."
      activePath="/dashboard"
    >
      <Card>
        <p className="rounded-2xl border border-[#F9D7DA] bg-[#FFF6F7] p-4 text-sm font-bold text-[#B42318]">
          This page summarizes public label evidence for academic prototype use only. It does not provide medical advice or clinical decision support.
        </p>

        <div className="mt-5 space-y-2 text-sm text-[#344054]">
          <p><span className="font-black">Medication:</span> {medication.name}</p>
          <p><span className="font-black">Normalized name:</span> {medication.normalized_name ?? "Not available"}</p>
          <p><span className="font-black">RxCUI:</span> {medication.rxcui ?? "Not available"}</p>
          <p><span className="font-black">Normalization confidence:</span> {medication.normalization_confidence ?? "none"}</p>
          <p><span className="font-black">Last checked:</span> {medication.safety_checked_at ? new Date(medication.safety_checked_at).toLocaleString() : "Not checked"}</p>
        </div>

        <div className="mt-6">
          <h2 className="text-xl font-black">Label evidence</h2>
          {evidence.length === 0 ? (
            <p className="mt-2 rounded-2xl bg-[#F6F8FB] p-4 text-sm text-[#667085]">No external label evidence is currently stored for this medication.</p>
          ) : (
            <div className="mt-3 space-y-3">
              {evidence.map((item, index) => (
                <div key={`${item.section}-${index}`} className="rounded-2xl border border-[#E6EAF0] bg-[#F6F8FB] p-4">
                  <Badge variant="info">{item.section}</Badge>
                  <p className="mt-2 text-xs text-[#667085]">Matched by: {item.matchedBy}</p>
                  <p className="mt-2 text-sm leading-6 text-[#344054]">{item.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <Link href="/dashboard" className="mt-6 inline-block text-sm font-black text-[#344054] underline">Back to dashboard</Link>
      </Card>
    </AppShell>
  );
}
