import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/server";
import { getLabelSafetyEvidence } from "@/lib/medications/openfda";
import { normalizeDrugName } from "@/lib/medications/rxnorm";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ medicationId: string }>;
  searchParams?: Promise<{
    error?: string;
  }>;
};

type Medication = {
  id: string;
  name: string;
  dose_amount: number;
  dose_unit: string;
  frequency: string;
  notes: string | null;
};

type MedicationSchedule = {
  id: string;
  medication_id: string;
  scheduled_time: string;
};

async function updateMedication(formData: FormData) {
  "use server";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const medicationId = String(formData.get("medicationId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const doseAmountRaw = String(formData.get("dose_amount") ?? "").trim();
  const doseUnit = String(formData.get("dose_unit") ?? "").trim();
  const frequency = String(formData.get("frequency") ?? "").trim();
  const notesRaw = String(formData.get("notes") ?? "").trim();
  const scheduledTime = String(formData.get("scheduled_time") ?? "").trim();

  if (!medicationId) {
    redirect("/dashboard?error=Missing medication id.");
  }

  const redirectWithError = (message: string) => {
    redirect(
      `/medications/${medicationId}/edit?error=${encodeURIComponent(message)}`
    );
  };

  if (!name || !doseAmountRaw || !doseUnit || !frequency || !scheduledTime) {
    redirectWithError("Please fill in all required fields.");
  }

  const doseAmount = Number(doseAmountRaw);

  if (!Number.isFinite(doseAmount) || doseAmount <= 0) {
    redirectWithError("Dose amount must be a number greater than zero.");
  }

  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(scheduledTime)) {
    redirectWithError("Scheduled time must use HH:MM format.");
  }

  const notes = notesRaw.length > 0 ? notesRaw : null;

  let normalization = {
    rxcui: null as string | null,
    normalizedName: null as string | null,
    source: "none" as "rxnorm" | "none",
    confidence: "none" as "exact_or_normalized" | "approximate" | "none",
  };
  let safetyEvidence: unknown[] = [];

  try {
    normalization = await normalizeDrugName(name);
    safetyEvidence = await getLabelSafetyEvidence({ name, rxcui: normalization.rxcui });
  } catch {
    // Graceful fallback: preserve save flow.
  }

  const { data: updatedMedication, error: medicationError } = await supabase
    .from("medications")
    .update({
      name,
      dose_amount: doseAmount,
      dose_unit: doseUnit,
      frequency,
      notes,
      rxcui: normalization.rxcui,
      normalized_name: normalization.normalizedName,
      normalization_source: normalization.source,
      normalization_confidence: normalization.confidence,
      safety_evidence: safetyEvidence,
      safety_checked_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", medicationId)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (medicationError) {
    redirectWithError(medicationError.message);
  }

  if (!updatedMedication) {
    redirectWithError("Medication could not be found for this account.");
  }

  const { error: scheduleError } = await supabase
    .from("medication_schedules")
    .upsert(
      {
        medication_id: medicationId,
        scheduled_time: scheduledTime,
      },
      { onConflict: "medication_id" }
    );

  if (scheduleError) {
    redirectWithError(scheduleError.message);
  }

  revalidatePath("/dashboard");
  revalidatePath(`/medications/${medicationId}/edit`);
  redirect("/dashboard?message=Medication updated.");
}

export default async function EditMedicationPage({
  params,
  searchParams,
}: PageProps) {
  const { medicationId } = await params;
  const query = searchParams ? await searchParams : {};
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: medication, error: medicationError } = await supabase
    .from("medications")
    .select("id, name, dose_amount, dose_unit, frequency, notes")
    .eq("id", medicationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (medicationError || !medication) {
    redirect(
      `/dashboard?error=${encodeURIComponent(
        medicationError?.message ?? "Medication not found."
      )}`
    );
  }

  const { data: schedule } = await supabase
    .from("medication_schedules")
    .select("id, medication_id, scheduled_time")
    .eq("medication_id", medicationId)
    .maybeSingle();

  const medicationRecord = medication as Medication;
  const scheduleRecord = schedule as MedicationSchedule | null;

  return (
    <AppShell
      title="Edit medication"
      subtitle="Update your tracker details and schedule time."
      activePath="/dashboard"
    >
      {query.error ? (
        <Card className="mb-5 border-[#FF3F4D]/40 bg-[#FFF6F7]">
          <Badge variant="danger">Error</Badge>
          <p className="mt-3 text-sm font-bold text-[#FF3F4D]">{query.error}</p>
        </Card>
      ) : null}

      <Card>
        <div className="mb-6 rounded-2xl border border-[#F9D7DA] bg-[#FFF6F7] p-4">
          <p className="text-sm font-bold leading-6 text-[#B42318]">
            Editing this tracker does not change a real prescription. Consult a
            licensed health professional before changing actual medication use.
          </p>
        </div>

        <form action={updateMedication} className="grid gap-5 md:grid-cols-2">
          <input type="hidden" name="medicationId" value={medicationRecord.id} />

          <label className="text-sm font-bold text-[#101828]">
            Medication name
            <input
              type="text"
              name="name"
              required
              defaultValue={medicationRecord.name}
              className="mt-2 w-full rounded-2xl border border-[#D0D5DD] px-4 py-3"
            />
          </label>

          <label className="text-sm font-bold text-[#101828]">
            Dose amount
            <input
              type="number"
              min="0"
              step="any"
              name="dose_amount"
              required
              defaultValue={medicationRecord.dose_amount}
              className="mt-2 w-full rounded-2xl border border-[#D0D5DD] px-4 py-3"
            />
          </label>

          <label className="text-sm font-bold text-[#101828]">
            Dose unit
            <input
              type="text"
              name="dose_unit"
              required
              defaultValue={medicationRecord.dose_unit}
              className="mt-2 w-full rounded-2xl border border-[#D0D5DD] px-4 py-3"
            />
          </label>

          <label className="text-sm font-bold text-[#101828]">
            Frequency
            <input
              type="text"
              name="frequency"
              required
              defaultValue={medicationRecord.frequency}
              className="mt-2 w-full rounded-2xl border border-[#D0D5DD] px-4 py-3"
            />
          </label>

          <label className="text-sm font-bold text-[#101828]">
            Scheduled time
            <input
              type="time"
              name="scheduled_time"
              required
              defaultValue={scheduleRecord?.scheduled_time ?? "08:00"}
              className="mt-2 w-full rounded-2xl border border-[#D0D5DD] px-4 py-3"
            />
          </label>

          <label className="text-sm font-bold text-[#101828] md:col-span-2">
            Notes
            <textarea
              name="notes"
              rows={4}
              defaultValue={medicationRecord.notes ?? ""}
              className="mt-2 w-full rounded-2xl border border-[#D0D5DD] px-4 py-3"
            />
          </label>

          <div className="flex flex-wrap gap-3 md:col-span-2">
            <button
              type="submit"
              className="rounded-2xl bg-[#FF3F4D] px-5 py-3 text-sm font-black text-white"
            >
              Save changes
            </button>
            <Link
              href="/dashboard"
              className="rounded-2xl border border-[#D0D5DD] px-5 py-3 text-sm font-black text-[#344054]"
            >
              Cancel
            </Link>
          </div>
        </form>
      </Card>
    </AppShell>
  );
}
