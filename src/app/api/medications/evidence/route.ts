import { getLabelSafetyEvidence } from "@/lib/medications/openfda";
import { normalizeDrugName } from "@/lib/medications/rxnorm";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { name?: string };
    const name = (body.name ?? "").trim();

    if (!name) {
      return NextResponse.json(
        {
          normalization: { rxcui: null, normalizedName: null, source: "none", confidence: "none" },
          safetyEvidence: [],
        },
        { status: 200 }
      );
    }

    let normalization;
    try {
      normalization = await normalizeDrugName(name);
    } catch {
      return NextResponse.json(
        {
          error:
            "Medication validation service is currently unavailable. Please try again later.",
          errorType: "service_unavailable",
        },
        { status: 503 }
      );
    }

    if (!normalization.rxcui) {
      return NextResponse.json(
        {
          error:
            "Medication name was not recognized. Please enter a generic or recognized brand drug name.",
          errorType: "unrecognized_name",
          normalization,
          safetyEvidence: [],
        },
        { status: 422 }
      );
    }
    let safetyEvidence: unknown[] = [];
    try {
      safetyEvidence = await getLabelSafetyEvidence({ name, rxcui: normalization.rxcui });
    } catch {
      safetyEvidence = [];
    }

    return NextResponse.json({ normalization, safetyEvidence });
  } catch {
    return NextResponse.json(
      {
        normalization: { rxcui: null, normalizedName: null, source: "none", confidence: "none" },
        safetyEvidence: [],
      },
      { status: 200 }
    );
  }
}
