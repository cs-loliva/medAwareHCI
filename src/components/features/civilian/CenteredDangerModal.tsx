"use client";

import { useState } from "react";

type CenteredDangerModalProps = {
  medicationName: string;
  conflictSummary: string;
  onContactProfessional: () => void;
  onRemoveMedication: () => void;
  onViewDetails: () => void;
};

export function CenteredDangerModal({
  medicationName,
  conflictSummary,
  onContactProfessional,
  onRemoveMedication,
  onViewDetails,
}: CenteredDangerModalProps) {
  const [showContactGuidance, setShowContactGuidance] = useState(false);

  function handleContactProfessional() {
    setShowContactGuidance(true);
    onContactProfessional();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#101828]/60 px-4 py-8 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="danger-alert-title"
    >
      <section className="w-full max-w-2xl rounded-[2rem] border border-[#FF3F4D]/30 bg-white p-6 shadow-2xl md:p-8">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#FFE8EC] text-4xl font-black text-[#FF3F4D]">
          !
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[#FF3F4D]">
            Critical medication conflict
          </p>

          <h2
            id="danger-alert-title"
            className="mt-3 text-4xl font-black tracking-tight text-[#101828]"
          >
            DANGER ALERT
          </h2>

          <p className="mt-4 text-base font-semibold leading-7 text-[#667085]">
            MedAware detected a critical demo conflict involving{" "}
            <span className="font-black text-[#101828]">{medicationName}</span>.
          </p>
        </div>

        <div className="mt-6 rounded-3xl bg-[#FFF6F7] p-5">
          <p className="text-sm font-black text-[#FF3F4D]">
            Contact a health professional before continuing.
          </p>
          <p className="mt-2 text-sm leading-6 text-[#667085]">
            {conflictSummary}
          </p>
        </div>

        {showContactGuidance ? (
          <div className="mt-5 rounded-3xl border border-[#E6EAF0] bg-[#F6F8FB] p-5">
            <p className="text-sm font-black text-[#101828]">
              Contact guidance
            </p>
            <p className="mt-2 text-sm leading-6 text-[#667085]">
              For the prototype demo, this action represents calling or messaging
              a pharmacist, doctor, nurse, or other licensed health professional.
              The medication should not be treated as safely active based on this
              mock alert.
            </p>
          </div>
        ) : null}

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <button
            type="button"
            onClick={handleContactProfessional}
            className="rounded-2xl bg-[#FF3F4D] px-4 py-3 text-sm font-black text-white transition hover:bg-[#E73542] focus:outline-none focus:ring-4 focus:ring-[#FFE8EC]"
          >
            Contact Health Professional
          </button>

          <button
            type="button"
            onClick={onRemoveMedication}
            className="rounded-2xl bg-[#FFE8EC] px-4 py-3 text-sm font-black text-[#FF3F4D] transition hover:bg-[#FFD6DD] focus:outline-none focus:ring-4 focus:ring-[#FFE8EC]"
          >
            Remove Medication
          </button>

          <button
            type="button"
            onClick={onViewDetails}
            className="rounded-2xl bg-[#101828] px-4 py-3 text-sm font-black text-white transition hover:bg-[#1D2939] focus:outline-none focus:ring-4 focus:ring-[#D0D5DD]"
          >
            View Details
          </button>
        </div>

        <p className="mt-5 text-center text-xs leading-5 text-[#667085]">
          Academic prototype only. This warning uses mock/demo logic and is not
          real medical advice.
        </p>
      </section>
    </div>
  );
}