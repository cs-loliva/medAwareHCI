"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F6F8FB] px-4 py-10">
      <Card className="w-full max-w-xl">
        <Badge variant="danger">Something went wrong</Badge>
        <h1 className="mt-4 text-2xl font-black text-[#101828]">We could not load this section.</h1>
        <p className="mt-2 text-sm text-[#667085]">
          Please try again. If this continues, return to your dashboard or sign in again.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button onClick={reset} className="rounded-2xl bg-[#FF3F4D] px-4 py-2 text-sm font-black text-white">
            Retry
          </button>
          <Link href="/dashboard" className="rounded-2xl border border-[#D0D5DD] px-4 py-2 text-sm font-black text-[#344054]">
            Back to dashboard
          </Link>
          <Link href="/login" className="rounded-2xl border border-[#D0D5DD] px-4 py-2 text-sm font-black text-[#344054]">
            Sign in
          </Link>
        </div>
        {error?.message ? (
          <pre className="mt-5 overflow-x-auto rounded-2xl bg-[#101828] p-3 text-xs text-white/90">
            {error.message}
          </pre>
        ) : null}
      </Card>
    </main>
  );
}
