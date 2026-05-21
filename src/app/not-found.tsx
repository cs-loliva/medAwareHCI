import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F6F8FB] px-4 py-10">
      <Card className="w-full max-w-xl">
        <Badge variant="warning">Page not found</Badge>
        <h1 className="mt-4 text-2xl font-black text-[#101828]">Page not found</h1>
        <p className="mt-2 text-sm text-[#667085]">
          This page may have moved, or your current role may not have access.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/dashboard" className="rounded-2xl bg-[#FF3F4D] px-4 py-2 text-sm font-black text-white">Go to dashboard</Link>
          <Link href="/role-select" className="rounded-2xl border border-[#D0D5DD] px-4 py-2 text-sm font-black text-[#344054]">Switch role</Link>
          <Link href="/login" className="rounded-2xl border border-[#D0D5DD] px-4 py-2 text-sm font-black text-[#344054]">Sign in</Link>
        </div>
      </Card>
    </main>
  );
}
