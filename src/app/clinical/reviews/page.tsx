import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

export default function ReviewQueuePage() {
  return (
    <AppShell
      title="Pharmacist Review Queue"
      subtitle="Review medications that have been held, flagged, or escalated."
      activePath="/clinical/reviews"
    >
      <Card>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Badge variant="danger">Pending review</Badge>
            <h2 className="mt-4 text-2xl font-black">Ibuprofen</h2>
            <p className="mt-2 text-sm text-[#667085]">
              Patient: Maria Santos • Room 305 • 200 mg • As needed
            </p>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-[#667085]">
              Demo review requested due to Warfarin + Ibuprofen alert. This is
              prototype logic only and not real medical advice.
            </p>
          </div>

          <div className="flex gap-3">
            <button className="rounded-2xl bg-[#12B76A] px-4 py-3 text-sm font-black text-white">
              Approve
            </button>
            <button className="rounded-2xl bg-[#FF3F4D] px-4 py-3 text-sm font-black text-white">
              Flag unsafe
            </button>
          </div>
        </div>
      </Card>
    </AppShell>
  );
}