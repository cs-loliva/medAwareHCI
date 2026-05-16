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

  return (
    <form action={action} className="mt-5">
      <input type="hidden" name="medicationId" value={medicationId} />

      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="rounded-2xl bg-[#FFE8EC] px-4 py-2 text-sm font-black text-[#FF3F4D]"
      >
        Remove from active list
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-[2rem] bg-white p-6 shadow-2xl">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#FF3F4D]">
              Confirm medication removal
            </p>

            <h2 className="mt-3 text-2xl font-black text-[#101828]">
              Remove {medicationName}?
            </h2>

            <p className="mt-3 text-sm leading-6 text-[#667085]">
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
                className="rounded-2xl bg-[#F6F8FB] px-5 py-3 text-sm font-black text-[#101828]"
              >
                Cancel
              </button>

              <button
                type="submit"
                className="rounded-2xl bg-[#FF3F4D] px-5 py-3 text-sm font-black text-white"
              >
                Yes, remove from active list
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </form>
  );
}