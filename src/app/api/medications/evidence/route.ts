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

    const normalization = await normalizeDrugName(name);
    const safetyEvidence = await getLabelSafetyEvidence({ name, rxcui: normalization.rxcui });

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
