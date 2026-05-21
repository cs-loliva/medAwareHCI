import { Card } from "@/components/ui/Card";

export default function Loading() {
  return (
    <main className="px-4 py-10 sm:px-6 lg:px-8">
      <Card className="mx-auto w-full max-w-3xl">
        <p className="text-lg font-black text-[#101828]">Loading notifications...</p>
      </Card>
    </main>
  );
}
