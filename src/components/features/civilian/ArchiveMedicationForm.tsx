"use client";

import { useState } from "react";

type ArchiveMedicationFormProps = {
  medicationId: string;
  medicationName: string;
  action: (formData: FormData) => void | Promise<void>;
};

export function ArchiveMedicationForm({
  medicationId,
  medicationName,
  action,
}: ArchiveMedicationFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const modalTitleId = `archive-medication-title-${medicationId}`;
  const modalDescriptionId = `archive-medication-description-${medicationId}`;

  return (
    <form action={action} className="mt-5">
      <input type="hidden" name="medicationId" value={medicationId} />

      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="rounded-2xl bg-[#FFE8EC] px-4 py-2 text-sm font-black text-[#FF3F4D] transition hover:bg-[#FFD6DD] focus:outline-none focus:ring-4 focus:ring-[#FFE8EC]"
      >
        Remove from active list
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
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#FF3F4D]">
              Confirm medication removal
            </p>

            <h2
              id={modalTitleId}
              className="mt-3 text-2xl font-black text-[#101828]"
            >
              Remove {medicationName} from your active list?
            </h2>

            <p
              id={modalDescriptionId}
              className="mt-3 text-sm leading-6 text-[#667085]"
            >
              This will remove the medication from your active dashboard, but it
              will not permanently delete its history or logs.
            </p>

            <div className="mt-6 rounded-3xl bg-[#FFF6F7] p-4">
              <p className="text-sm font-black text-[#FF3F4D]">
                Safety reminder
              </p>
              <p className="mt-2 text-sm leading-6 text-[#667085]">
                Do not stop or change real medication use without guidance from
                a licensed health professional.
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
                className="rounded-2xl bg-[#FF3F4D] px-5 py-3 text-sm font-black text-white transition hover:bg-[#E73542] focus:outline-none focus:ring-4 focus:ring-[#FFE8EC]"
              >
                Confirm remove from active list
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </form>
  );
}
