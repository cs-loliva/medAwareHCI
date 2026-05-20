export type SafetyEvidenceItem = {
  source: "openfda";
  section: string;
  text: string;
  matchedBy: "rxcui" | "name";
  disclaimer: "Label evidence only; not validated clinical decision support.";
};

type OpenFdaLabel = Record<string, unknown>;
type OpenFdaResponse = { results?: OpenFdaLabel[] };

const SECTIONS = [
  "drug_interactions",
  "contraindications",
  "warnings",
  "warnings_and_cautions",
  "boxed_warning",
  "precautions",
  "dosage_and_administration",
  "dosage_forms_and_strengths",
] as const;

function truncateText(value: string, max = 800) {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

function extractEvidence(results: OpenFdaLabel[], matchedBy: "rxcui" | "name") {
  const evidence: SafetyEvidenceItem[] = [];

  for (const label of results) {
    for (const section of SECTIONS) {
      const sectionValue = label[section];
      const text = Array.isArray(sectionValue)
        ? sectionValue.filter((item): item is string => typeof item === "string").join(" ")
        : typeof sectionValue === "string"
          ? sectionValue
          : "";

      if (!text.trim()) continue;

      evidence.push({
        source: "openfda",
        section,
        text: truncateText(text.trim()),
        matchedBy,
        disclaimer: "Label evidence only; not validated clinical decision support.",
      });
    }
  }

  return evidence;
}

async function queryOpenFda(search: string, limit: number) {
  const url = `https://api.fda.gov/drug/label.json?search=${encodeURIComponent(search)}&limit=${limit}`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) return [];
  const data = (await response.json()) as OpenFdaResponse;
  return data.results ?? [];
}

export async function getLabelSafetyEvidence(input: { rxcui?: string | null; name: string }) {
  const trimmed = input.name.trim();
  if (!trimmed) return [] as SafetyEvidenceItem[];

  try {
    if (input.rxcui) {
      const byRxcui = await queryOpenFda(`openfda.rxcui:"${input.rxcui}"`, 1);
      const evidence = extractEvidence(byRxcui, "rxcui");
      if (evidence.length > 0) return evidence;
    }

    const byName = await queryOpenFda(`(openfda.generic_name:"${trimmed}"+OR+openfda.brand_name:"${trimmed}")`, 3);
    return extractEvidence(byName, "name");
  } catch {
    return [];
  }
}
