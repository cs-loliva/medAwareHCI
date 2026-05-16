"use client";

import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { CenteredDangerModal } from "@/components/features/civilian/CenteredDangerModal";

type ExistingMedication = {
  id: string;
  name: string;
  status: string;
};

type SafetyFinding = {
  severity: "critical" | "moderate" | "low";
  title: string;
  description: string;
};

const everyday = [0, 1, 2, 3, 4, 5, 6];

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function hasMedication(medications: ExistingMedication[], name: string) {
  return medications.some((medication) => normalize(medication.name) === name);
}

function runDemoSafetyCheck(
  newMedicationName: string,
  existingMedications: ExistingMedication[]
): SafetyFinding[] {
  const normalizedName = normalize(newMedicationName);
  const findings: SafetyFinding[] = [];

  if (!normalizedName) return findings;

  if (hasMedication(existingMedications, normalizedName)) {
    findings.push({
      severity: "moderate",
      title: "Possible duplicate medication",
      description:
        "Demo rule: A medication with the same name already exists in this account. Confirm that this is not a duplicate entry before saving.",
    });
  }

  const hasWarfarin = hasMedication(existingMedications, "warfarin");
  const hasIbuprofen = hasMedication(existingMedications, "ibuprofen");

  if (
    (normalizedName === "ibuprofen" && hasWarfarin) ||
    (normalizedName === "warfarin" && hasIbuprofen)
  ) {
    findings.push({
      severity: "critical",
      title: "Warfarin + Ibuprofen demo danger alert",
      description:
        "Demo rule: Warfarin and ibuprofen may increase bleeding risk. Contact a health professional before continuing. This is academic prototype logic only.",
    });
  }

  if (normalizedName.includes("penicillin")) {
    findings.push({
      severity: "critical",
      title: "Possible allergy conflict",
      description:
        "Demo rule: Penicillin may conflict with a listed allergy. Contact a health professional before continuing. This is academic prototype logic only.",
    });
  }

  return findings;
}

function getHighestSeverity(findings: SafetyFinding[]) {
  if (findings.some((finding) => finding.severity === "critical")) {
    return "critical";
  }

  if (findings.some((finding) => finding.severity === "moderate")) {
    return "moderate";
  }

  if (findings.length > 0) {
    return "low";
  }

  return "clear";
}

function getFindingBadgeVariant(severity: SafetyFinding["severity"]) {
  if (severity === "critical") return "danger";
  if (severity === "moderate") return "warning";
  return "info";
}

export default function AddMedicationPage() {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [existingMedications, setExistingMedications] = useState<
    ExistingMedication[]
  >([]);

  const [name, setName] = useState("");
  const [doseAmount, setDoseAmount] = useState("");
  const [doseUnit, setDoseUnit] = useState("mg");
  const [frequency, setFrequency] = useState("Daily");
  const [scheduledTime, setScheduledTime] = useState("08:00");
  const [startDate, setStartDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [allowCriticalDemoSave, setAllowCriticalDemoSave] = useState(false);
  const [showDangerModal, setShowDangerModal] = useState(false);
  const [contactGuidanceViewed, setContactGuidanceViewed] = useState(false);

  useEffect(() => {
    async function loadExistingMedications() {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data } = await supabase
        .from("medications")
        .select("id, name, status")
        .eq("user_id", user.id)
        .neq("status", "inactive");

      setExistingMedications((data ?? []) as ExistingMedication[]);
    }

    loadExistingMedications();
  }, [router]);

  const findings = useMemo(
    () => runDemoSafetyCheck(name, existingMedications),
    [name, existingMedications]
  );

  const highestSeverity = getHighestSeverity(findings);

  function validateStepOne() {
    if (!name.trim()) return "Medication name is required.";
    if (!doseAmount.trim()) return "Dose amount is required.";

    const parsedDose = Number(doseAmount);
    if (!Number.isFinite(parsedDose) || parsedDose <= 0) {
      return "Dose amount must be a number greater than zero.";
    }

    if (!doseUnit.trim()) return "Dose unit is required.";
    return null;
  }

  function validateStepTwo() {
    if (!frequency.trim()) return "Frequency is required.";
    if (!scheduledTime.trim()) return "Scheduled time is required.";
    if (!startDate.trim()) return "Start date is required.";

    if (endDate && endDate < startDate) {
      return "End date cannot be earlier than the start date.";
    }

    return null;
  }

  function goToStepTwo() {
    const validationError = validateStepOne();

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setErrorMessage(null);
    setStep(2);
  }

  function goToSafetyReview() {
  const validationError = validateStepTwo();

  if (validationError) {
    setErrorMessage(validationError);
    return;
  }

  setErrorMessage(null);
  setStep(3);

  if (highestSeverity === "critical") {
    setShowDangerModal(true);
  }
}

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const stepOneError = validateStepOne();
    const stepTwoError = validateStepTwo();

    if (stepOneError || stepTwoError) {
      setErrorMessage(stepOneError ?? stepTwoError);
      return;
    }

    if (highestSeverity === "critical" && !allowCriticalDemoSave) {
      setErrorMessage(
        "Critical demo findings must be acknowledged before saving as pending review."
      );
      return;
    }

    setIsSaving(true);

    const supabase = createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setIsSaving(false);
      router.push("/login");
      return;
    }

    const status = highestSeverity === "critical" ? "pending_review" : "active";

    const { data: medication, error: medicationError } = await supabase
      .from("medications")
      .insert({
        user_id: user.id,
        name: name.trim(),
        dose_amount: Number(doseAmount),
        dose_unit: doseUnit.trim(),
        frequency: frequency.trim(),
        start_date: startDate,
        end_date: endDate || null,
        notes: notes.trim() || null,
        status,
      })
      .select("id")
      .single();

    if (medicationError || !medication) {
      setIsSaving(false);
      setErrorMessage(
        medicationError?.message ?? "Could not save medication. Try again."
      );
      return;
    }

    const { error: scheduleError } = await supabase
      .from("medication_schedules")
      .insert({
        medication_id: medication.id,
        scheduled_time: scheduledTime,
        day_of_week: everyday,
      });

    if (scheduleError) {
      setIsSaving(false);
      setErrorMessage(scheduleError.message);
      return;
    }

    setIsSaving(false);
    router.push("/dashboard");
    router.refresh();
  }

  function clearPendingMedication() {
  setName("");
  setDoseAmount("");
  setDoseUnit("mg");
  setFrequency("Daily");
  setScheduledTime("08:00");
  setStartDate(new Date().toISOString().slice(0, 10));
  setEndDate("");
  setNotes("");
  setAllowCriticalDemoSave(false);
  setShowDangerModal(false);
  setContactGuidanceViewed(false);
  setStep(1);
  router.push("/dashboard");
}

function viewCriticalDetails() {
  setShowDangerModal(false);
  setStep(3);
}
  
  return (
  <>
    {showDangerModal && highestSeverity === "critical" ? (
      <CenteredDangerModal
        medicationName={name || "the newly added medication"}
        conflictSummary={
          findings.find((finding) => finding.severity === "critical")
            ?.description ?? "A critical demo medication conflict was detected."
        }
        onContactProfessional={() => setContactGuidanceViewed(true)}
        onRemoveMedication={clearPendingMedication}
        onViewDetails={viewCriticalDetails}
      />
    ) : null}

    <AppShell
      title="Guided Add Medication"
      subtitle="Add medication details, schedule, and review demo safety checks before saving."
      activePath="/dashboard"
    >
      <form onSubmit={handleSave} className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <Card>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant={step === 1 ? "danger" : "default"}>1 Details</Badge>
            <Badge variant={step === 2 ? "danger" : "default"}>2 Schedule</Badge>
            <Badge variant={step === 3 ? "danger" : "default"}>
              3 Safety review
            </Badge>
          </div>

          {errorMessage ? (
            <div
              role="alert"
              className="mt-6 rounded-2xl bg-[#FFE8EC] p-4 text-sm font-bold text-[#FF3F4D]"
            >
              {errorMessage}
            </div>
          ) : null}

          {step === 1 ? (
            <section className="mt-8">
              <h2 className="text-2xl font-black">Medication details</h2>
              <p className="mt-2 text-sm leading-6 text-[#667085]">
                Enter the medication name and dose. This prototype uses demo
                safety logic only.
              </p>

              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <label className="block md:col-span-2">
                  <span className="text-sm font-bold">Medication name</span>
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-[#E6EAF0] bg-[#F6F8FB] px-4 py-3 outline-none focus:border-[#FF3F4D] focus:ring-4 focus:ring-[#FFE8EC]"
                    placeholder="e.g. Ibuprofen"
                    required
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-bold">Dose amount</span>
                  <input
                    value={doseAmount}
                    onChange={(event) => setDoseAmount(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-[#E6EAF0] bg-[#F6F8FB] px-4 py-3 outline-none focus:border-[#FF3F4D] focus:ring-4 focus:ring-[#FFE8EC]"
                    placeholder="e.g. 200"
                    inputMode="decimal"
                    required
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-bold">Dose unit</span>
                  <input
                    value={doseUnit}
                    onChange={(event) => setDoseUnit(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-[#E6EAF0] bg-[#F6F8FB] px-4 py-3 outline-none focus:border-[#FF3F4D] focus:ring-4 focus:ring-[#FFE8EC]"
                    placeholder="mg"
                    required
                  />
                </label>
              </div>

              <div className="mt-8 flex justify-end">
                <button
                  type="button"
                  onClick={goToStepTwo}
                  className="rounded-2xl bg-[#FF3F4D] px-5 py-3 text-sm font-black text-white"
                >
                  Continue to schedule
                </button>
              </div>
            </section>
          ) : null}

          {step === 2 ? (
            <section className="mt-8">
              <h2 className="text-2xl font-black">Schedule and instructions</h2>
              <p className="mt-2 text-sm leading-6 text-[#667085]">
                For this MVP, the selected time repeats every day.
              </p>

              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-bold">Frequency</span>
                  <select
                    value={frequency}
                    onChange={(event) => setFrequency(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-[#E6EAF0] bg-[#F6F8FB] px-4 py-3 outline-none focus:border-[#FF3F4D] focus:ring-4 focus:ring-[#FFE8EC]"
                  >
                    <option>Daily</option>
                    <option>Twice daily</option>
                    <option>Every 8 hours</option>
                    <option>As needed</option>
                    <option>Weekly</option>
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-bold">Scheduled time</span>
                  <input
                    value={scheduledTime}
                    onChange={(event) => setScheduledTime(event.target.value)}
                    type="time"
                    className="mt-2 w-full rounded-2xl border border-[#E6EAF0] bg-[#F6F8FB] px-4 py-3 outline-none focus:border-[#FF3F4D] focus:ring-4 focus:ring-[#FFE8EC]"
                    required
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-bold">Start date</span>
                  <input
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                    type="date"
                    className="mt-2 w-full rounded-2xl border border-[#E6EAF0] bg-[#F6F8FB] px-4 py-3 outline-none focus:border-[#FF3F4D] focus:ring-4 focus:ring-[#FFE8EC]"
                    required
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-bold">End date optional</span>
                  <input
                    value={endDate}
                    onChange={(event) => setEndDate(event.target.value)}
                    type="date"
                    className="mt-2 w-full rounded-2xl border border-[#E6EAF0] bg-[#F6F8FB] px-4 py-3 outline-none focus:border-[#FF3F4D] focus:ring-4 focus:ring-[#FFE8EC]"
                  />
                </label>

                <label className="block md:col-span-2">
                  <span className="text-sm font-bold">
                    Intake procedure notes
                  </span>
                  <textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    className="mt-2 min-h-32 w-full rounded-2xl border border-[#E6EAF0] bg-[#F6F8FB] px-4 py-3 outline-none focus:border-[#FF3F4D] focus:ring-4 focus:ring-[#FFE8EC]"
                    placeholder="e.g. Take after meals. Avoid taking with..."
                  />
                </label>
              </div>

              <div className="mt-8 flex flex-wrap justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-[#101828] shadow-sm"
                >
                  Back
                </button>

                <button
                  type="button"
                  onClick={goToSafetyReview}
                  className="rounded-2xl bg-[#FF3F4D] px-5 py-3 text-sm font-black text-white"
                >
                  Run demo safety check
                </button>
              </div>
            </section>
          ) : null}

          {step === 3 ? (
            <section className="mt-8">
              <h2 className="text-2xl font-black">Demo safety review</h2>
              <p className="mt-2 text-sm leading-6 text-[#667085]">
                MedAware checks the new medication against existing demo
                medications before saving. This is not real medical advice.
              </p>

              <div className="mt-6 space-y-4">
                {findings.length === 0 ? (
                  <div className="rounded-3xl bg-[#EAFBF3] p-5">
                    <Badge variant="success">Clear</Badge>
                    <h3 className="mt-4 text-xl font-black">
                      No demo conflicts found
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-[#667085]">
                      The medication can be saved as active in this academic
                      prototype.
                    </p>
                  </div>
                ) : (
                  findings.map((finding) => (
                    <div
                      key={finding.title}
                      className="rounded-3xl border border-[#E6EAF0] bg-[#F6F8FB] p-5"
                    >
                      <Badge variant={getFindingBadgeVariant(finding.severity)}>
                        {finding.severity}
                      </Badge>
                      <h3 className="mt-4 text-xl font-black">
                        {finding.title}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-[#667085]">
                        {finding.description}
                      </p>
                    </div>
                  ))
                )}
              </div>

              {highestSeverity === "critical" ? (
  <>
    <label className="mt-6 flex gap-3 rounded-3xl bg-[#FFF6F7] p-5">
      <input
        type="checkbox"
        checked={allowCriticalDemoSave}
        onChange={(event) =>
          setAllowCriticalDemoSave(event.target.checked)
        }
        className="mt-1 h-5 w-5"
      />
      <span>
        <span className="block text-sm font-black text-[#FF3F4D]">
          Save as pending review
        </span>
        <span className="mt-1 block text-sm leading-6 text-[#667085]">
          I understand this is demo-only logic. In a real app, a
          critical alert should prompt professional review before
          continuing. This medication will be saved as pending review,
          not active.
        </span>
      </span>
    </label>

    {contactGuidanceViewed ? (
      <div className="mt-4 rounded-3xl border border-[#E6EAF0] bg-[#F6F8FB] p-5">
        <p className="text-sm font-black text-[#101828]">
          Contact guidance viewed
        </p>
        <p className="mt-2 text-sm leading-6 text-[#667085]">
          In this prototype, this indicates the user has been prompted to contact a
          health professional before continuing.
        </p>
      </div>
    ) : null}
  </>
) : null}

              <div className="mt-8 flex flex-wrap justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-[#101828] shadow-sm"
                >
                  Back
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-2xl bg-[#FF3F4D] px-5 py-3 text-sm font-black text-white disabled:opacity-60"
                >
                  {isSaving
                    ? "Saving..."
                    : highestSeverity === "critical"
                      ? "Save as pending review"
                      : "Save medication"}
                </button>
              </div>
            </section>
          ) : null}
        </Card>

        <aside className="space-y-5">
          <Card>
            <Badge
              variant={
                highestSeverity === "critical"
                  ? "danger"
                  : highestSeverity === "moderate"
                    ? "warning"
                    : "success"
              }
            >
              {highestSeverity}
            </Badge>

            <h2 className="mt-4 text-xl font-black">Medication preview</h2>

            <div className="mt-5 space-y-3 text-sm text-[#667085]">
              <p>
                <span className="font-bold text-[#101828]">Name:</span>{" "}
                {name || "Not set"}
              </p>
              <p>
                <span className="font-bold text-[#101828]">Dose:</span>{" "}
                {doseAmount || "—"} {doseUnit || ""}
              </p>
              <p>
                <span className="font-bold text-[#101828]">Frequency:</span>{" "}
                {frequency}
              </p>
              <p>
                <span className="font-bold text-[#101828]">Time:</span>{" "}
                {scheduledTime}
              </p>
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-black">Existing medications</h2>
            <div className="mt-4 space-y-3">
              {existingMedications.length === 0 ? (
                <p className="text-sm text-[#667085]">
                  No existing medications loaded.
                </p>
              ) : (
                existingMedications.map((medication) => (
                  <div
                    key={medication.id}
                    className="rounded-2xl bg-[#F6F8FB] p-4"
                  >
                    <p className="text-sm font-black">{medication.name}</p>
                    <p className="mt-1 text-xs text-[#667085]">
                      {medication.status.replace("_", " ")}
                    </p>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card>
            <p className="text-sm font-black text-[#FF3F4D]">
              Academic Prototype
            </p>
            <p className="mt-2 text-sm leading-6 text-[#667085]">
              This flow uses simple mock interaction checks only. It must not be
              used for real medication decisions.
            </p>
            <Link
              href="/dashboard"
              className="mt-5 block text-sm font-black text-[#FF3F4D]"
            >
              ← Back to dashboard
            </Link>
          </Card>
        </aside>
      </form>
        </AppShell>
  </>
  );
}