import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

type Medication = {
  id: string;
  name: string;
  dose_amount: number;
  dose_unit: string;
  frequency: string;
  notes: string | null;
  status: string;
  rxcui: string | null;
  normalized_name: string | null;
  normalization_source: string | null;
  normalization_confidence: number | null;
  safety_evidence: unknown[] | null;
  safety_checked_at: string | null;
};

type EvidenceItem = { section?: string; text?: string };
type PairSeverity = "critical" | "caution" | "informational" | "no_evidence_found";
type PairReview = {
  medicationA: Medication;
  medicationB: Medication;
  severity: PairSeverity;
  explanations: string[];
  sources: Array<"Demo prototype rule" | "Public label evidence" | "No external evidence found">;
};

const evidenceSections = new Set(["drug_interactions", "contraindications", "warnings", "warnings_and_cautions", "boxed_warning", "precautions"]);
const normalize = (v: string | null | undefined) => (v ?? "").trim().toLowerCase();
const buildCandidates = (m: Medication) => [m.name, m.normalized_name].map(normalize).filter(Boolean);

function hasLabelEvidenceMention(source: Medication, target: Medication) {
  const evidence = (Array.isArray(source.safety_evidence) ? source.safety_evidence : []) as EvidenceItem[];
  const terms = buildCandidates(target);
  for (const item of evidence) {
    const section = normalize(item.section);
    const text = normalize(item.text);
    if (!section || !text || !evidenceSections.has(section)) continue;
    if (terms.some((term) => text.includes(term))) return true;
  }
  return false;
}

function getSeverityVariant(severity: PairSeverity) {
  if (severity === "critical") return "danger" as const;
  if (severity === "caution") return "warning" as const;
  if (severity === "informational") return "info" as const;
  return "default" as const;
}

function comparePair(medicationA: Medication, medicationB: Medication): PairReview {
  const nameA = normalize(medicationA.name);
  const nameB = normalize(medicationB.name);
  const termsA = new Set([nameA, normalize(medicationA.normalized_name)]);
  const termsB = new Set([nameB, normalize(medicationB.normalized_name)]);

  const explanations: string[] = [];
  const sources = new Set<PairReview["sources"][number]>();
  let severity: PairSeverity = "no_evidence_found";

  const warfarinIbuprofen = (termsA.has("warfarin") && termsB.has("ibuprofen")) || (termsA.has("ibuprofen") && termsB.has("warfarin"));
  if (warfarinIbuprofen) {
    severity = "critical";
    explanations.push("Warfarin + ibuprofen demo danger alert. This educational prototype rule flags possible bleeding risk and is not clinical decision support.");
    sources.add("Demo prototype rule");
  }

  if (nameA && nameA === nameB) {
    if (severity !== "critical") severity = "caution";
    explanations.push("Possible duplicate medication entry based on matching medication names.");
    sources.add("Demo prototype rule");
  }

  if (termsA.has("penicillin") || termsB.has("penicillin")) {
    if (severity !== "critical") severity = "caution";
    explanations.push("Possible penicillin allergy conflict from demo prototype logic.");
    sources.add("Demo prototype rule");
  }

  const labelMention = hasLabelEvidenceMention(medicationA, medicationB) || hasLabelEvidenceMention(medicationB, medicationA);
  if (labelMention) {
    if (severity === "no_evidence_found") severity = "informational";
    explanations.push("Public label evidence mention found in stored openFDA label sections for this pair.");
    sources.add("Public label evidence");
  }

  if (explanations.length === 0) {
    explanations.push("No matching prototype rule or stored public label evidence mention found for this pair.");
    sources.add("No external evidence found");
  }

  return { medicationA, medicationB, severity, explanations, sources: Array.from(sources) };
}

export default async function MedicationInteractionsEvidencePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("medications")
    .select("id, name, dose_amount, dose_unit, frequency, notes, status, rxcui, normalized_name, normalization_source, normalization_confidence, safety_evidence, safety_checked_at")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  const medications = (data ?? []) as Medication[];
  const pairReviews: PairReview[] = [];
  for (let i = 0; i < medications.length; i += 1) {
    for (let j = i + 1; j < medications.length; j += 1) pairReviews.push(comparePair(medications[i], medications[j]));
  }

  const criticalCount = pairReviews.filter((pair) => pair.severity === "critical").length;
  const labelMentionCount = pairReviews.filter((pair) => pair.sources.includes("Public label evidence")).length;

  return (
    <AppShell title="Medication Interaction Evidence Review" subtitle="Compare active medications using prototype rules and public label evidence." activePath="/medications/interactions">
      <Card className="border-[#F9D7DA] bg-[#FFF6F7]"><p className="text-sm font-bold leading-6 text-[#B42318]">This page does not provide medical advice or clinical decision support. It compares prototype rules and public label evidence only. Always consult a licensed health professional before changing medication use.</p></Card>
      {error ? <Card><Badge variant="danger">Could not load this section</Badge><p className="mt-3 text-sm text-[#667085]">{error.message}</p><p className="mt-3 text-xs text-[#667085]">MedAware is an academic prototype and does not replace professional medical advice.</p></Card> : null}

      <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <Card><p className="text-xs font-black uppercase text-[#667085]">Active medications count</p><p className="mt-2 text-3xl font-black">{medications.length}</p></Card>
        <Card><p className="text-xs font-black uppercase text-[#667085]">Pairs reviewed count</p><p className="mt-2 text-3xl font-black">{pairReviews.length}</p></Card>
        <Card><p className="text-xs font-black uppercase text-[#667085]">Critical prototype findings count</p><p className="mt-2 text-3xl font-black">{criticalCount}</p></Card>
        <Card><p className="text-xs font-black uppercase text-[#667085]">Label evidence mentions count</p><p className="mt-2 text-3xl font-black">{labelMentionCount}</p></Card>
      </div>

      {medications.length < 2 ? <Card className="mt-5"><Badge variant="info">Need more medications</Badge><p className="mt-3 text-sm text-[#667085]">Add at least two active medications to review possible interaction evidence. Start by adding medications from your dashboard.</p></Card> : <div className="mt-5 space-y-5">{pairReviews.map((pair) => <Card key={`${pair.medicationA.id}-${pair.medicationB.id}`}><div className="flex items-start justify-between gap-3"><div><h2 className="text-2xl font-black">{pair.medicationA.name} + {pair.medicationB.name}</h2><p className="mt-2 text-sm text-[#667085]">{pair.medicationA.dose_amount} {pair.medicationA.dose_unit} • {pair.medicationA.frequency} | {pair.medicationB.dose_amount} {pair.medicationB.dose_unit} • {pair.medicationB.frequency}</p></div><Badge variant={getSeverityVariant(pair.severity)}>{pair.severity}</Badge></div><div className="mt-4 grid gap-3 md:grid-cols-2"><div className="rounded-2xl bg-[#F6F8FB] p-4 text-sm text-[#344054]"><p><span className="font-black">Medication A:</span> {pair.medicationA.name}</p><p><span className="font-black">Normalized:</span> {pair.medicationA.normalized_name ?? "Not available"}</p><p><span className="font-black">RxCUI:</span> {pair.medicationA.rxcui ?? "Not available"}</p></div><div className="rounded-2xl bg-[#F6F8FB] p-4 text-sm text-[#344054]"><p><span className="font-black">Medication B:</span> {pair.medicationB.name}</p><p><span className="font-black">Normalized:</span> {pair.medicationB.normalized_name ?? "Not available"}</p><p><span className="font-black">RxCUI:</span> {pair.medicationB.rxcui ?? "Not available"}</p></div></div><div className="mt-4 space-y-2">{pair.explanations.map((explanation, index) => <p key={index} className="text-sm text-[#667085]">• {explanation}</p>)}</div><div className="mt-4 flex flex-wrap gap-2">{pair.sources.map((source) => <Badge key={source} variant={source === "Demo prototype rule" ? "warning" : source === "Public label evidence" ? "info" : "default"}>{source}</Badge>)}</div></Card>)}</div>}

      <Card className="mt-5"><p className="text-xs text-[#667085]">This prototype uses publicly available data from the U.S. National Library of Medicine for RxNorm identifiers. NLM does not endorse or recommend this product.</p></Card>
    </AppShell>
  );
}
