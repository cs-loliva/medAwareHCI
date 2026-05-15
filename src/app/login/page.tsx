"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

const hasSupabaseEnv =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/role-select";

  const [email, setEmail] = useState("civilian@medaware.demo");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    if (!hasSupabaseEnv) {
      setErrorMessage(
        "Supabase credentials are not configured yet. Add them to .env.local before logging in."
      );
      return;
    }

    setIsLoading(true);

    const supabase = createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setIsLoading(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    router.push(next);
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[2rem] border border-[#E6EAF0] bg-white p-8 shadow-sm"
    >
      <h2 className="text-2xl font-black">Sign in</h2>
      <p className="mt-2 text-sm text-[#667085]">
        Use a MedAware demo account after Supabase seed data is configured.
      </p>

      <label className="mt-6 block">
        <span className="text-sm font-bold text-[#101828]">Email</span>
        <input
          className="mt-2 w-full rounded-2xl border border-[#E6EAF0] bg-[#F6F8FB] px-4 py-3 outline-none focus:border-[#FF3F4D]"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          type="email"
          required
        />
      </label>

      <label className="mt-4 block">
        <span className="text-sm font-bold text-[#101828]">Password</span>
        <input
          className="mt-2 w-full rounded-2xl border border-[#E6EAF0] bg-[#F6F8FB] px-4 py-3 outline-none focus:border-[#FF3F4D]"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          required
          placeholder="Set in DEMO_USER_PASSWORD"
        />
      </label>

      {errorMessage ? (
        <div className="mt-5 rounded-2xl bg-[#FFE8EC] p-4 text-sm font-semibold text-[#FF3F4D]">
          {errorMessage}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isLoading}
        className="mt-6 w-full rounded-2xl bg-[#FF3F4D] px-5 py-3 text-sm font-black text-white shadow-lg disabled:opacity-60"
      >
        {isLoading ? "Signing in..." : "Sign in"}
      </button>

      <div className="mt-6 text-xs leading-6 text-[#667085]">
        Demo emails: civilian@medaware.demo, nurse@medaware.demo,
        doctor@medaware.demo, pharmacist@medaware.demo, admin@medaware.demo.
      </div>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#F6F8FB] px-6 py-10 text-[#101828]">
      <section className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-10 lg:grid-cols-[1fr_420px]">
        <div>
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-[#FF3F4D] text-3xl font-black text-white shadow-lg">
            M+
          </div>

          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#FF3F4D]">
            MedAware
          </p>

          <h1 className="mt-4 max-w-2xl text-5xl font-black tracking-tight">
            Your health. On time.
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-[#667085]">
            A medication adherence and safety-awareness platform for patients,
            caregivers, pharmacies, clinics, and hospital teams.
          </p>

          <div className="mt-8 rounded-3xl border border-[#E6EAF0] bg-white p-6 shadow-sm">
            <p className="text-sm font-bold text-[#FF3F4D]">
              Academic Prototype Disclaimer
            </p>
            <p className="mt-2 text-sm leading-6 text-[#667085]">
              This application uses mock/demo medication safety logic only. It
              does not provide medical advice and must not be used for real
              clinical decision-making.
            </p>
          </div>
        </div>

        <Suspense
          fallback={
            <div className="rounded-[2rem] border border-[#E6EAF0] bg-white p-8 text-[#667085] shadow-sm">
              Loading sign-in form...
            </div>
          }
        >
          <LoginForm />
        </Suspense>
      </section>
    </main>
  );
}
