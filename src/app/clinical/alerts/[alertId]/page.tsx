import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    alertId: string;
  }>;
  searchParams?: Promise<{
    message?: string;
    error?: string;
  }>;
};

type ClinicalAlert = {
  id: string;
  patient_id: string;
  patient_medication_id_a: string;
  patient_medication_id_b: string;
  severity: "critical" | "moderate" | "low";
  rule_key: string;
  description: string;
  status: "active" | "acknowledged" | "resolved";
  patient: {
    full_name: string;
    room_number: string | null;
    ward: string | null;
    primary_diagnosis: string | null;
  } | null;
  medication_a: {
    name: string;
    dose_amount: number;
    dose_unit: string;
    frequency: string;
    status: string;
  } | null;
  medication_b: {
    name: string;
    dose_amount: number;
    dose_unit: string;
    frequency: string;
    status: string;
  } | null;
};

async function getCurrentUser() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

async function assignReview(formData: FormData) {
  "use server";

  const user = await getCurrentUser();
  const supabase = await createClient();

  const alertId = String(formData.get("alertId") ?? "");
  const patientId = String(formData.get("patientId") ?? "");
  const medicationId = String(formData.get("medicationId") ?? "");

  if (!alertId || !patientId || !medicationId) {
    redirect(`/clinical/alerts/${alertId}?error=Missing review details.`);
  }

  const { error: reviewError } = await supabase
    .from("clinical_reviews")
    .upsert(
      {
        patient_id: patientId,
        patient_medication_id: medicationId,
        requested_by: user.id,
        reason: "Escalated from clinical danger alert.",
        status: "pending",
      },
      {
        onConflict: "patient_medication_id",
      }
    );

  if (reviewError) {
    redirect(
      `/clinical/alerts/${alertId}?error=${encodeURIComponent(
        reviewError.message
      )}`
    );
  }

  const { error: medicationError } = await supabase
    .from("patient_medications")
    .update({
      status: "pending_review",
      hold_reason: "Escalated from clinical danger alert.",
    })
    .eq("id", medicationId);

  if (medicationError) {
    redirect(
      `/clinical/alerts/${alertId}?error=${encodeURIComponent(
        medicationError.message
      )}`
    );
  }

  revalidatePath(`/clinical/alerts/${alertId}`);
  revalidatePath("/clinical/reviews");
  revalidatePath(`/clinical/patients/${patientId}`);

  redirect(`/clinical/alerts/${alertId}?message=Medication assigned for pharmacist review.`);
}

async function notifyTeam(formData: FormData) {
  "use server";

  const user = await getCurrentUser();
  const supabase = await createClient();

  const alertId = String(formData.get("alertId") ?? "");
  const patientId = String(formData.get("patientId") ?? "");
  const patientName = String(formData.get("patientName") ?? "Patient");

  if (!alertId || !patientId) {
    redirect(`/clinical/alerts/${alertId}?error=Missing notification details.`);
  }

  const { data: assignments, error: assignmentError } = await supabase
    .from("patient_assignments")
    .select("user_id")
    .eq("patient_id", patientId);

  if (assignmentError) {
    redirect(
      `/clinical/alerts/${alertId}?error=${encodeURIComponent(
        assignmentError.message
      )}`
    );
  }

  const notificationRows = (assignments ?? [])
    .filter((assignment) => assignment.user_id !== user.id)
    .map((assignment) => ({
      user_id: assignment.user_id,
      type: "clinical_team",
      title: "Clinical danger alert",
      message: `${patientName} has an active medication danger alert requiring review.`,
      status: "unread",
      metadata: {
        patient_id: patientId,
        alert_id: alertId,
      },
    }));

  if (notificationRows.length > 0) {
    const { error } = await supabase.from("notifications").insert(notificationRows);

    if (error) {
      redirect(`/clinical/alerts/${alertId}?error=${encodeURIComponent(error.message)}`);
    }
  }

  revalidatePath(`/clinical/alerts/${alertId}`);
  redirect(`/clinical/alerts/${alertId}?message=Care team notified.`);
}

export default async function ClinicalDangerAlertPage({
  params,
  searchParams,
}: PageProps) {
  await getCurrentUser();

  const { alertId } = await params;
  const query = searchParams ? await searchParams : {};
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("clinical_alerts")
    .select(
      `
      id,
      patient_id,
      patient_medication_id_a,
      patient_medication_id_b,
      severity,
      rule_key,
      description,
      status,
      patient:patient_id (
        full_name,
        room_number,
        ward,
        primary_diagnosis
      ),
      medication_a:patient_medication_id_a (
        name,
        dose_amount,
        dose_unit,
        frequency,
        status
      ),
      medication_b:patient_medication_id_b (
        name,
        dose_amount,
        dose_unit,
        frequency,
        status
      )
    `
    )
    .eq("id", alertId)
    .single();

  if (error || !data) {
    return (
      <AppShell
        title="Clinical Danger Alert"
        subtitle="The selected alert could not be loaded."
        activePath="/clinical/alerts"
      >
        <Card>
          <Badge variant="danger">Alert not found</Badge>
          <h2 className="mt-4 text-2xl font-black">Could not load alert</h2>
          <p className="mt-2 text-sm leading-6 text-[#667085]">
            {error?.message ?? "This alert does not exist or cannot be accessed."}
          </p>
          <Link
            href="/clinical/alerts"
            className="mt-6 inline-block rounded-2xl bg-[#FF3F4D] px-5 py-3 text-sm font-black text-white"
          >
            Back to alert center
          </Link>
        </Card>
      </AppShell>
    );
  }

  const alert = data as unknown as ClinicalAlert;

  return (
    <AppShell
      title="Clinical Centered Danger Alert"
      subtitle="Interruptive clinical warning for high-risk medication conflicts."
      activePath="/clinical/alerts"
    >
      {query.message ? (
        <Card className="mb-5 border-[#12B76A]/40 bg-[#EAFBF3]">
          <Badge variant="success">Success</Badge>
          <p className="mt-3 text-sm font-bold text-[#101828]">{query.message}</p>
        </Card>
      ) : null}

      {query.error ? (
        <Card className="mb-5 border-[#FF3F4D]/40 bg-[#FFF6F7]">
          <Badge variant="danger">Error</Badge>
          <p className="mt-3 text-sm font-bold text-[#FF3F4D]">{query.error}</p>
        </Card>
      ) : null}

      <section className="flex min-h-[calc(100vh-12rem)] items-center justify-center">
        <div className="w-full max-w-4xl rounded-[2.5rem] border border-[#FF3F4D]/40 bg-white p-8 text-center shadow-2xl">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-[#FFE8EC] text-5xl font-black text-[#FF3F4D]">
            !
          </div>

          <p className="mt-8 text-xs font-black uppercase tracking-[0.28em] text-[#FF3F4D]">
            Critical clinical medication alert
          </p>

          <h2 className="mt-4 text-5xl font-black tracking-tight text-[#101828]">
            DO NOT ADMINISTER
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-base font-semibold leading-7 text-[#667085]">
            This medication is on hold due to a detected demo conflict. Assign
            review, notify the team, or open the patient record before taking
            further action.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl bg-[#F6F8FB] p-5 text-left">
              <p className="text-xs font-black uppercase tracking-wide text-[#667085]">
                Patient
              </p>
              <h3 className="mt-2 text-xl font-black">
                {alert.patient?.full_name ?? "Unknown patient"}
              </h3>
              <p className="mt-2 text-sm text-[#667085]">
                Room {alert.patient?.room_number ?? "N/A"} •{" "}
                {alert.patient?.ward ?? "No ward"}
              </p>
              <p className="mt-2 text-sm text-[#667085]">
                {alert.patient?.primary_diagnosis ?? "No diagnosis listed"}
              </p>
            </div>

            <div className="rounded-3xl bg-[#FFF6F7] p-5 text-left">
              <p className="text-xs font-black uppercase tracking-wide text-[#FF3F4D]">
                Alert summary
              </p>
              <p className="mt-2 text-sm leading-6 text-[#667085]">
                {alert.description}
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-[#E6EAF0] bg-white p-5 text-left">
              <p className="text-xs font-black uppercase tracking-wide text-[#667085]">
                Medication A
              </p>
              <h3 className="mt-2 text-xl font-black">
                {alert.medication_a?.name ?? "Unknown"}
              </h3>
              <p className="mt-2 text-sm text-[#667085]">
                {alert.medication_a
                  ? `${alert.medication_a.dose_amount} ${alert.medication_a.dose_unit} • ${alert.medication_a.frequency}`
                  : "No medication details"}
              </p>
            </div>

            <div className="rounded-3xl border border-[#E6EAF0] bg-white p-5 text-left">
              <p className="text-xs font-black uppercase tracking-wide text-[#667085]">
                Medication B
              </p>
              <h3 className="mt-2 text-xl font-black">
                {alert.medication_b?.name ?? "Unknown"}
              </h3>
              <p className="mt-2 text-sm text-[#667085]">
                {alert.medication_b
                  ? `${alert.medication_b.dose_amount} ${alert.medication_b.dose_unit} • ${alert.medication_b.frequency}`
                  : "No medication details"}
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-3">
            <form action={assignReview}>
              <input type="hidden" name="alertId" value={alert.id} />
              <input type="hidden" name="patientId" value={alert.patient_id} />
              <input
                type="hidden"
                name="medicationId"
                value={alert.patient_medication_id_b}
              />
              <button
                type="submit"
                className="w-full rounded-2xl bg-[#FF3F4D] px-5 py-4 text-sm font-black text-white"
              >
                Assign Review
              </button>
            </form>

            <form action={notifyTeam}>
              <input type="hidden" name="alertId" value={alert.id} />
              <input type="hidden" name="patientId" value={alert.patient_id} />
              <input
                type="hidden"
                name="patientName"
                value={alert.patient?.full_name ?? "Patient"}
              />
              <button
                type="submit"
                className="w-full rounded-2xl bg-[#101828] px-5 py-4 text-sm font-black text-white"
              >
                Notify Team
              </button>
            </form>

            <Link
              href={`/clinical/patients/${alert.patient_id}`}
              className="rounded-2xl bg-[#FFE8EC] px-5 py-4 text-sm font-black text-[#FF3F4D]"
            >
              Open Patient Record
            </Link>
          </div>

          <p className="mt-6 text-xs leading-5 text-[#667085]">
            Academic prototype only. This warning uses seeded demo logic and is
            not real clinical decision support.
          </p>
        </div>
      </section>
    </AppShell>
  );
}