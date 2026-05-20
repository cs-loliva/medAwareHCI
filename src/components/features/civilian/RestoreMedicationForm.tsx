"use client";

import { useState } from "react";

type RestoreMedicationFormProps = {
  medicationId: string;
  medicationName: string;
  action: (formData: FormData) => void | Promise<void>;
};

export function RestoreMedicationForm({
  medicationId,
  medicationName,
  action,
}: RestoreMedicationFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const modalTitleId = `restore-medication-title-${medicationId}`;
  const modalDescriptionId = `restore-medication-description-${medicationId}`;

  return (
    <form action={action} className="mt-5">
      <input type="hidden" name="medicationId" value={medicationId} />

      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="rounded-2xl bg-[#EAFBF3] px-4 py-2 text-sm font-black text-[#12B76A] transition hover:bg-[#D8F5E8] focus:outline-none focus:ring-4 focus:ring-[#D8F5E8]"
      >
        Restore to active list
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#101828]/60 px-4 py-8 backdrop-blur-sm">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={modalTitleId}
            aria-describedby={modalDescriptionId}
            className="w-full max-w-md rounded-[2rem] bg-white p-6 shadow-2xl"
          >
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#12B76A]">
              Confirm medication restore
            </p>

            <h2 id={modalTitleId} className="mt-3 text-2xl font-black text-[#101828]">
              Restore {medicationName} to your active list?
            </h2>

            <p id={modalDescriptionId} className="mt-3 text-sm leading-6 text-[#667085]">
              This will return the medication to your active dashboard and tracker.
            </p>

            <div className="mt-6 rounded-3xl bg-[#F6F8FB] p-4">
              <p className="text-sm font-black text-[#101828]">Safety reminder</p>
              <p className="mt-2 text-sm leading-6 text-[#667085]">
                Restoring this item only affects the MedAware tracker. Do not restart or change real medication use without guidance from a licensed health professional.
              </p>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-2xl bg-[#F6F8FB] px-5 py-3 text-sm font-black text-[#101828] transition hover:bg-[#E6EAF0] focus:outline-none focus:ring-4 focus:ring-[#D0D5DD]"
              >
                Cancel
              </button>

              <button
                type="submit"
                className="rounded-2xl bg-[#12B76A] px-5 py-3 text-sm font-black text-white transition hover:bg-[#0FA05D] focus:outline-none focus:ring-4 focus:ring-[#D8F5E8]"
              >
                Confirm restore to active list
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </form>
  );
}
