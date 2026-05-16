"use client";

type PrintButtonProps = {
  fileName?: string;
};

export function PrintButton({ fileName = "medaware_discharge" }: PrintButtonProps) {
  function handlePrint() {
    const previousTitle = document.title;

    document.title = fileName;

    window.setTimeout(() => {
      window.print();

      window.setTimeout(() => {
        document.title = previousTitle;
      }, 500);
    }, 100);
  }

  return (
    <button
      type="button"
      onClick={handlePrint}
      className="rounded-2xl bg-[#101828] px-5 py-3 text-sm font-black text-white print:hidden"
    >
      Print instructions
    </button>
  );
}