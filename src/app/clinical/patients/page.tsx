import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

const patients = [
  {
    name: "Maria Santos",
    room: "305",
    diagnosis: "Pneumonia, anticoagulant therapy",
    risk: "critical",
    nextAction: "Hold Ibuprofen pending review",
  },
  {
    name: "Pedro Reyes",
    room: "112",
    diagnosis: "Type II Diabetes",
    risk: "safe",
    nextAction: "Metformin due 6:00 PM",
  },
  {
    name: "Elena Santos",
    room: "Outpatient",
    diagnosis: "Medication follow-up",
    risk: "caution",
    nextAction: "Clinic appointment today",
  },
];

export default function PatientBoardPage() {
  return (
    <AppShell
      title="Hospital Patient Board"
      subtitle="Prioritize patients by room, medication risk, and next action."
      activePath="/clinical/patients"
    >
      <div className="grid gap-5">
        {patients.map((patient) => (
          <Card key={patient.name}>
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-2xl font-black">{patient.name}</h2>
                  <Badge
                    variant={
                      patient.risk === "critical"
                        ? "danger"
                        : patient.risk === "caution"
                          ? "warning"
                          : "success"
                    }
                  >
                    {patient.risk}
                  </Badge>
                </div>

                <p className="mt-2 text-sm text-[#667085]">
                  Room {patient.room} • {patient.diagnosis}
                </p>
              </div>

              <div className="rounded-3xl bg-[#F6F8FB] px-5 py-4">
                <p className="text-xs font-black uppercase tracking-wide text-[#667085]">
                  Next action
                </p>
                <p className="mt-1 text-sm font-bold text-[#101828]">
                  {patient.nextAction}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}