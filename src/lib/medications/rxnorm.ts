export type DrugNormalizationResult = {
  rxcui: string | null;
  normalizedName: string | null;
  source: "rxnorm" | "none";
  confidence: "exact_or_normalized" | "approximate" | "none";
};

type RxNormResponse = {
  idGroup?: {
    name?: string;
    rxnormId?: string[];
  };
};

async function lookupRxNorm(name: string, search: "2" | "9") {
  const url = `https://rxnav.nlm.nih.gov/REST/rxcui.json?name=${encodeURIComponent(name)}&search=${search}`;
  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as RxNormResponse;
  const rxcui = data.idGroup?.rxnormId?.[0] ?? null;
  const normalizedName = data.idGroup?.name ?? null;

  return { rxcui, normalizedName };
}

export async function normalizeDrugName(name: string): Promise<DrugNormalizationResult> {
  const trimmed = name.trim();

  if (!trimmed) {
    return { rxcui: null, normalizedName: null, source: "none", confidence: "none" };
  }

  try {
    const exact = await lookupRxNorm(trimmed, "2");

    if (exact?.rxcui) {
      return {
        rxcui: exact.rxcui,
        normalizedName: exact.normalizedName,
        source: "rxnorm",
        confidence: "exact_or_normalized",
      };
    }

    const approximate = await lookupRxNorm(trimmed, "9");

    if (approximate?.rxcui) {
      return {
        rxcui: approximate.rxcui,
        normalizedName: approximate.normalizedName,
        source: "rxnorm",
        confidence: "approximate",
      };
    }
  } catch {
    // Graceful fallback for network/API failures.
  }

  return { rxcui: null, normalizedName: null, source: "none", confidence: "none" };
}
