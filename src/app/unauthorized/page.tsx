import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F6F8FB] px-6 text-[#101828]">
      <section className="max-w-lg rounded-[2rem] border border-[#E6EAF0] bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-[#FFE8EC] text-2xl font-black text-[#FF3F4D]">
          !
        </div>

        <h1 className="text-3xl font-black tracking-tight">
          Access restricted
        </h1>

        <p className="mt-4 text-sm leading-6 text-[#667085]">
          Your current role does not have permission to open this MedAware view.
          Return to role selection or sign in with another account.
        </p>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/role-select"
            className="rounded-2xl bg-[#FF3F4D] px-5 py-3 text-sm font-black text-white"
          >
            Choose role
          </Link>

          <Link
            href="/login"
            className="rounded-2xl bg-[#FFE8EC] px-5 py-3 text-sm font-black text-[#FF3F4D]"
          >
            Back to login
          </Link>
        </div>
      </section>
    </main>
  );
}