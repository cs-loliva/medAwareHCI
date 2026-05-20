"use client";

type AdministerMedicationFormProps = {
  patientId: string;
  medicationId: string;
  medicationName: string;
  doseLabel: string;
  action: (formData: FormData) => void | Promise<void>;
  disabled?: boolean;
  disabledReason?: string;
};

import { useState } from "react";

export function AdministerMedicationForm({
  patientId,
  medicationId,
  medicationName,
  doseLabel,
  action,
  disabled = false,
  disabledReason,
}: AdministerMedicationFormProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setIsOpen(true);
          }
        }}
        className="w-full rounded-2xl bg-[#FF3F4D] px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        Mark administered
      </button>

      {disabled && disabledReason ? (
        <p className="mt-2 text-xs font-bold text-[#667085]">{disabledReason}</p>
      ) : null}

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#101828]/60 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-5 shadow-2xl md:p-6">
            <h3 className="text-xl font-black text-[#101828]">
              Confirm medication administration
            </h3>

            <div className="mt-4 space-y-2 rounded-2xl bg-[#F6F8FB] p-4 text-sm">
              <p className="text-[#667085]">Medication</p>
              <p className="font-black text-[#101828]">{medicationName}</p>
              <p className="mt-2 text-[#667085]">Dose</p>
              <p className="font-black text-[#101828]">{doseLabel}</p>
            </div>

            <p className="mt-4 text-sm text-[#667085]">
              Only confirm administration if the dose was actually given according
              to clinical workflow.
            </p>

            <div className="mt-4 rounded-2xl bg-[#FFF6F7] p-4">
              <p className="text-sm font-bold text-[#FF3F4D]">
                This action records a medication administration event in the
                prototype audit trail.
              </p>
            </div>

            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-2xl bg-[#E6EAF0] px-4 py-3 text-sm font-black text-[#101828]"
              >
                Cancel
              </button>

              <form action={action}>
                <input type="hidden" name="patientId" value={patientId} />
                <input type="hidden" name="medicationId" value={medicationId} />
                <button
                  type="submit"
                  className="w-full rounded-2xl bg-[#FF3F4D] px-4 py-3 text-sm font-black text-white sm:w-auto"
                >
                  Confirm administration
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
