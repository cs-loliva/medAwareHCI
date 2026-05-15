export default function Home() {
  return (
    <main className="min-h-screen bg-[#F6F8FB] text-[#101828]">
      <section className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-[#FF3F4D] text-3xl font-black text-white shadow-lg">
          M+
        </div>

        <h1 className="text-5xl font-black tracking-tight">MedAware</h1>

        <p className="mt-3 text-lg font-semibold text-[#667085]">
          Your health. On time.
        </p>

        <p className="mt-8 max-w-2xl text-base leading-7 text-[#667085]">
          MedAware is a medication adherence and safety-awareness platform for
          patients, caregivers, clinics, and hospital teams.
        </p>

        <div className="mt-10 rounded-3xl border border-[#E6EAF0] bg-white p-6 text-left shadow-sm">
          <p className="text-sm font-semibold text-[#FF3F4D]">
            ⚠️ Academic Prototype
          </p>
          <p className="mt-2 text-sm leading-6 text-[#667085]">
            This application uses mock/demo medication safety logic only. It does
            not provide real medical advice and must not be used for real
            clinical decision-making.
          </p>
        </div>
      </section>
    </main>
  );
}