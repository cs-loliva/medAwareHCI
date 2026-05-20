import { normalizeDrugName } from "@/lib/medications/rxnorm";

const SUPPORTED_UNITS = [
  "mg",
  "mcg",
  "g",
  "mL",
  "units",
  "tablet",
  "tablets",
  "capsule",
  "capsules",
  "puff",
  "puffs",
  "drop",
  "drops",
] as const;

const MAX_BY_UNIT: Record<(typeof SUPPORTED_UNITS)[number], number> = {
  mg: 10000,
  mcg: 10000000,
  g: 100,
  mL: 1000,
  units: 10000,
  tablet: 100,
  tablets: 100,
  capsule: 100,
  capsules: 100,
  puff: 100,
  puffs: 100,
  drop: 100,
  drops: 100,
};

export async function validateMedicationName(input: string) {
  const name = input.trim();
  if (!name) return { ok: false as const, error: "Medication name is required." };

  try {
    const normalization = await normalizeDrugName(name);
    if (!normalization.rxcui) {
      return {
        ok: false as const,
        error:
          "Medication name was not recognized. Please enter a generic or recognized brand drug name.",
      };
    }
    return { ok: true as const, normalization };
  } catch {
    return {
      ok: false as const,
      error:
        "Medication validation service is currently unavailable. Please try again later.",
      serviceUnavailable: true as const,
    };
  }
}

export function validateDoseInput(input: {
  doseAmount: string | number;
  doseUnit: string;
  frequency: string;
  scheduledTime?: string;
}) {
  const unit = input.doseUnit.trim();
  const frequency = input.frequency.trim();
  const raw = typeof input.doseAmount === "number" ? String(input.doseAmount) : input.doseAmount.trim();
  const value = Number(raw);

  if (!raw || !Number.isFinite(value) || Number.isNaN(value) || value <= 0) {
    return { ok: false as const, error: "Dose amount must be a number greater than zero." };
  }

  if (!SUPPORTED_UNITS.includes(unit as (typeof SUPPORTED_UNITS)[number])) {
    return {
      ok: false as const,
      error: "Dose unit is not supported. Please choose a supported unit.",
    };
  }

  if (value > MAX_BY_UNIT[unit as (typeof SUPPORTED_UNITS)[number]]) {
    return {
      ok: false as const,
      error:
        "Dose amount appears outside the supported prototype range. Please verify the tracker entry.",
    };
  }

  if (!frequency) {
    return { ok: false as const, error: "Frequency is required." };
  }

  if (input.scheduledTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.scheduledTime)) {
    return { ok: false as const, error: "Scheduled time must use HH:mm format." };
  }

  return { ok: true as const, doseAmount: value, doseUnit: unit, frequency };
}
