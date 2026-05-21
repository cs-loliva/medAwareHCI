import { Card } from "@/components/ui/Card";

export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F6F8FB] px-4 py-10">
      <Card className="w-full max-w-lg text-center">
        <h1 className="text-2xl font-black text-[#101828]">Loading MedAware...</h1>
        <p className="mt-3 text-sm text-[#667085]">
          Preparing your medication safety workspace.
        </p>
      </Card>
    </main>
  );
}
