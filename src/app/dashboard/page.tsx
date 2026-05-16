import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

export default function DashboardPage() {
  return (
    <AppShell
      title="Civilian Medication Dashboard"
      subtitle="Track your next dose, adherence status, and active safety alerts."
      activePath="/dashboard"
    >
      <div className="grid gap-5 xl:grid-cols-[1.4fr_0.8fr]">
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Badge variant="danger">Next dose</Badge>
              <h2 className="mt-5 text-4xl font-black tracking-tight">
                Warfarin
              </h2>
              <p className="mt-2 text-[#667085]">
                5 mg • Scheduled at 8:00 PM
              </p>
            </div>

            <div className="rounded-[2rem] bg-[#FFE8EC] px-8 py-6 text-center">
              <p className="text-sm font-black text-[#FF3F4D]">Time left</p>
              <p className="mt-2 text-4xl font-black text-[#101828]">02:14</p>
            </div>
          </div>

          <div className="mt-8 rounded-3xl bg-[#F6F8FB] p-5">
            <p className="text-sm font-black text-[#101828]">
              Intake procedure
            </p>
            <p className="mt-2 text-sm leading-6 text-[#667085]">
              Take in the evening. Demo medication only. Confirm with a health
              professional for real medication decisions.
            </p>
          </div>
        </Card>

        <Card>
          <Badge variant="danger">Danger alert</Badge>
          <h2 className="mt-4 text-2xl font-black">Possible interaction</h2>
          <p className="mt-3 text-sm leading-6 text-[#667085]">
            Demo alert: Warfarin and Ibuprofen may increase bleeding risk.
            Contact a health professional before continuing.
          </p>
          <button className="mt-6 w-full rounded-2xl bg-[#FF3F4D] px-4 py-3 text-sm font-black text-white">
            View details
          </button>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-3">
        <Card>
          <Badge variant="success">Adherence</Badge>
          <p className="mt-4 text-3xl font-black">82%</p>
          <p className="mt-2 text-sm text-[#667085]">7-day demo score</p>
        </Card>

        <Card>
          <Badge variant="info">Medications</Badge>
          <p className="mt-4 text-3xl font-black">3</p>
          <p className="mt-2 text-sm text-[#667085]">Active and pending</p>
        </Card>

        <Card>
          <Badge variant="warning">Care Circle</Badge>
          <p className="mt-4 text-3xl font-black">1</p>
          <p className="mt-2 text-sm text-[#667085]">Connected caregiver</p>
        </Card>
      </div>
    </AppShell>
  );
}