import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{
    message?: string;
    error?: string;
  }>;
};

type ReviewStatus = "pending" | "approved" | "flagged_unsafe";

type ClinicalReview = {
  id: string;
  patient_medication_id: string;
  patient_id: string;
  requested_by: string;
  reason: string;
  status: ReviewStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
  patient: {
    full_name: string;
    room_number: string | null;
    ward: string | null;
    primary_diagnosis: string | null;
  } | null;
  medication: {
    id: string;
    name: string;
    dose_amount: number;
    dose_unit: string;
    frequency: string;
    status: string;
    hold_reason: string | null;
    prescribed_by: string;
  } | null;
  requester: {
    full_name: string;
    email: string;
  } | null;
  reviewer: {
    full_name: string;
    email: string;
  } | null;
};

function getStatusVariant(status: ReviewStatus) {
  if (status === "pending") return "warning";
  if (status === "approved") return "success";
  return "danger";
}

function formatDateTime(value: string | null) {
  if (!value) return "Not recorded";

  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

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

async function approveMedication(formData: FormData) {
  "use server";

  const user = await getCurrentUser();
  const admin = createAdminClient();

  const reviewId = String(formData.get("reviewId") ?? "");
  const medicationId = String(formData.get("medicationId") ?? "");
  const patientId = String(formData.get("patientId") ?? "");
  const reviewNotes =
    String(formData.get("reviewNotes") ?? "").trim() ||
    "Approved from pharmacist review queue.";

  if (!reviewId || !medicationId || !patientId) {
    redirect("/clinical/reviews?error=Missing review details.");
  }

  const { error: reviewError } = await admin
    .from("clinical_reviews")
    .update({
      status: "approved",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      review_notes: reviewNotes,
    })
    .eq("id", reviewId);

  if (reviewError) {
    redirect(`/clinical/reviews?error=${encodeURIComponent(reviewError.message)}`);
  }

  const { error: medicationError } = await admin
    .from("patient_medications")
    .update({
      status: "approved",
      hold_reason: null,
    })
    .eq("id", medicationId);

  if (medicationError) {
    redirect(
      `/clinical/reviews?error=${encodeURIComponent(medicationError.message)}`
    );
  }

  await admin.from("audit_logs").insert({
    actor_id: user.id,
    action: "pharmacy.medication_approved",
    target_type: "clinical_review",
    target_id: reviewId,
    metadata: {
      patient_id: patientId,
      patient_medication_id: medicationId,
      review_notes: reviewNotes,
    },
  });

  revalidatePath("/clinical/reviews");
  revalidatePath(`/clinical/patients/${patientId}`);
  redirect("/clinical/reviews?message=Medication approved.");
}

async function flagMedicationUnsafe(formData: FormData) {
  "use server";

  const user = await getCurrentUser();
  const admin = createAdminClient();

  const reviewId = String(formData.get("reviewId") ?? "");
  const medicationId = String(formData.get("medicationId") ?? "");
  const patientId = String(formData.get("patientId") ?? "");
  const prescribedBy = String(formData.get("prescribedBy") ?? "");
  const medicationName = String(formData.get("medicationName") ?? "Medication");
  const patientName = String(formData.get("patientName") ?? "Patient");
  const reviewNotes =
    String(formData.get("reviewNotes") ?? "").trim() ||
    "Flagged unsafe from pharmacist review queue.";

  if (!reviewId || !medicationId || !patientId) {
    redirect("/clinical/reviews?error=Missing review details.");
  }

  const { error: reviewError } = await admin
    .from("clinical_reviews")
    .update({
      status: "flagged_unsafe",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      review_notes: reviewNotes,
    })
    .eq("id", reviewId);

  if (reviewError) {
    redirect(`/clinical/reviews?error=${encodeURIComponent(reviewError.message)}`);
  }

  const { error: medicationError } = await admin
    .from("patient_medications")
    .update({
      status: "on_hold",
      hold_reason: reviewNotes,
    })
    .eq("id", medicationId);

  if (medicationError) {
    redirect(
      `/clinical/reviews?error=${encodeURIComponent(medicationError.message)}`
    );
  }

  if (prescribedBy) {
    await admin.from("notifications").insert({
      user_id: prescribedBy,
      type: "pharmacy_review",
      title: "Medication flagged unsafe",
      message: `${medicationName} for ${patientName} was flagged unsafe by pharmacy review.`,
      status: "unread",
      metadata: {
        patient_id: patientId,
        patient_medication_id: medicationId,
        clinical_review_id: reviewId,
      },
    });
  }

  await admin.from("audit_logs").insert({
    actor_id: user.id,
    action: "pharmacy.medication_flagged_unsafe",
    target_type: "clinical_review",
    target_id: reviewId,
    metadata: {
      patient_id: patientId,
      patient_medication_id: medicationId,
      review_notes: reviewNotes,
    },
  });

  revalidatePath("/clinical/reviews");
  revalidatePath(`/clinical/patients/${patientId}`);
  revalidatePath("/clinical/alerts");
  redirect("/clinical/reviews?message=Medication flagged unsafe and placed on hold.");
}

export default async function ReviewQueuePage({ searchParams }: PageProps) {
  await getCurrentUser();

  const params = searchParams ? await searchParams : {};
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("clinical_reviews")
    .select(
      `
      id,
      patient_medication_id,
      patient_id,
      requested_by,
      reason,
      status,
      reviewed_by,
      reviewed_at,
      review_notes,
      created_at,
      patient:patient_id (
        full_name,
        room_number,
        ward,
        primary_diagnosis
      ),
      medication:patient_medication_id (
        id,
        name,
        dose_amount,
        dose_unit,
        frequency,
        status,
        hold_reason,
        prescribed_by
      ),
      requester:requested_by (
        full_name,
        email
      ),
      reviewer:reviewed_by (
        full_name,
        email
      )
    `
    )
    .order("created_at", { ascending: false });

  const reviews = (data ?? []) as unknown as ClinicalReview[];
  const pendingReviews = reviews.filter((review) => review.status === "pending");
  const approvedReviews = reviews.filter((review) => review.status === "approved");
  const unsafeReviews = reviews.filter(
    (review) => review.status === "flagged_unsafe"
  );

  return (
    <AppShell
      title="Pharmacist Dashboard"
      subtitle="Review escalated medications, approve safe therapies, and flag unsafe orders."
      activePath="/clinical/reviews"
    >
      {params.message ? (
        <Card className="mb-5 border-[#12B76A]/40 bg-[#EAFBF3]">
          <Badge variant="success">Success</Badge>
          <p className="mt-3 text-sm font-bold text-[#101828]">
            {params.message}
          </p>
        </Card>
      ) : null}

      {params.error ? (
        <Card className="mb-5 border-[#FF3F4D]/40 bg-[#FFF6F7]">
          <Badge variant="danger">Error</Badge>
          <p className="mt-3 text-sm font-bold text-[#FF3F4D]">
            {params.error}
          </p>
        </Card>
      ) : null}

      {error ? (
        <Card className="mb-5">
          <Badge variant="danger">Load warning</Badge>
          <p className="mt-3 text-sm leading-6 text-[#667085]">
            {error.message}
          </p>
        </Card>
      ) : null}

      <div className="grid gap-5 md:grid-cols-3">
        <Card>
          <Badge variant={pendingReviews.length > 0 ? "warning" : "success"}>
            Pending
          </Badge>
          <p className="mt-4 text-3xl font-black">{pendingReviews.length}</p>
          <p className="mt-2 text-sm text-[#667085]">
            Medications awaiting pharmacy action
          </p>
        </Card>

        <Card>
          <Badge variant="success">Approved</Badge>
          <p className="mt-4 text-3xl font-black">{approvedReviews.length}</p>
          <p className="mt-2 text-sm text-[#667085]">
            Reviewed and approved medications
          </p>
        </Card>

        <Card>
          <Badge variant={unsafeReviews.length > 0 ? "danger" : "success"}>
            Flagged unsafe
          </Badge>
          <p className="mt-4 text-3xl font-black">{unsafeReviews.length}</p>
          <p className="mt-2 text-sm text-[#667085]">
            Medications placed on hold
          </p>
        </Card>
      </div>

      <Card className="mt-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-black">Review queue</h2>
            <p className="mt-2 text-sm text-[#667085]">
              Queue items are loaded from Supabase clinical review records.
            </p>
          </div>

          <Link
            href="/clinical/alerts"
            className="rounded-2xl bg-[#FF3F4D] px-5 py-3 text-sm font-black text-white"
          >
            Open alert center
          </Link>
        </div>

        <div className="mt-6 space-y-4">
          {reviews.length === 0 ? (
            <div className="rounded-3xl bg-[#F6F8FB] p-5 text-sm text-[#667085]">
              No review records found.
            </div>
          ) : (
            reviews.map((review) => (
              <div
                key={review.id}
                className={`rounded-[2rem] border p-5 ${
                  review.status === "pending"
                    ? "border-[#F59E0B]/40 bg-[#FFF3DD]"
                    : review.status === "flagged_unsafe"
                      ? "border-[#FF3F4D]/40 bg-[#FFF6F7]"
                      : "border-[#E6EAF0] bg-[#F6F8FB]"
                }`}
              >
                <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <Badge variant={getStatusVariant(review.status)}>
                        {review.status.replace("_", " ")}
                      </Badge>

                      <span className="text-xs font-black uppercase tracking-wide text-[#667085]">
                        Requested {formatDateTime(review.created_at)}
                      </span>
                    </div>

                    <h3 className="mt-4 text-2xl font-black">
                      {review.medication?.name ?? "Unknown medication"}
                    </h3>

                    <p className="mt-2 text-sm text-[#667085]">
                      {review.medication
                        ? `${review.medication.dose_amount} ${review.medication.dose_unit} • ${review.medication.frequency}`
                        : "No medication details"}
                    </p>

                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                      <div className="rounded-3xl bg-white p-5">
                        <p className="text-xs font-black uppercase tracking-wide text-[#667085]">
                          Patient
                        </p>
                        <p className="mt-2 text-lg font-black">
                          {review.patient?.full_name ?? "Unknown patient"}
                        </p>
                        <p className="mt-1 text-sm text-[#667085]">
                          Room {review.patient?.room_number ?? "N/A"} •{" "}
                          {review.patient?.ward ?? "No ward"}
                        </p>
                        <p className="mt-2 text-sm text-[#667085]">
                          {review.patient?.primary_diagnosis ??
                            "No diagnosis listed"}
                        </p>
                      </div>

                      <div className="rounded-3xl bg-white p-5">
                        <p className="text-xs font-black uppercase tracking-wide text-[#667085]">
                          Request reason
                        </p>
                        <p className="mt-2 text-sm leading-6 text-[#667085]">
                          {review.reason}
                        </p>
                        <p className="mt-3 text-xs text-[#667085]">
                          Requested by{" "}
                          <span className="font-bold">
                            {review.requester?.full_name ?? "Unknown user"}
                          </span>
                        </p>
                      </div>
                    </div>

                    {review.medication?.hold_reason ? (
                      <div className="mt-5 rounded-3xl bg-[#FFF6F7] p-5">
                        <p className="text-sm font-black text-[#FF3F4D]">
                          Hold reason
                        </p>
                        <p className="mt-2 text-sm leading-6 text-[#667085]">
                          {review.medication.hold_reason}
                        </p>
                      </div>
                    ) : null}

                    {review.review_notes ? (
                      <div className="mt-5 rounded-3xl bg-white p-5">
                        <p className="text-sm font-black text-[#101828]">
                          Review notes
                        </p>
                        <p className="mt-2 text-sm leading-6 text-[#667085]">
                          {review.review_notes}
                        </p>
                        <p className="mt-3 text-xs text-[#667085]">
                          Reviewed by{" "}
                          <span className="font-bold">
                            {review.reviewer?.full_name ?? "Unknown reviewer"}
                          </span>{" "}
                          at {formatDateTime(review.reviewed_at)}
                        </p>
                      </div>
                    ) : null}
                  </div>

                  <aside className="rounded-[2rem] bg-white p-5 shadow-sm">
                    <p className="text-xs font-black uppercase tracking-wide text-[#667085]">
                      Pharmacist actions
                    </p>

                    {review.status === "pending" ? (
                      <div className="mt-5 space-y-5">
                        <form action={approveMedication}>
                          <input type="hidden" name="reviewId" value={review.id} />
                          <input
                            type="hidden"
                            name="medicationId"
                            value={review.patient_medication_id}
                          />
                          <input
                            type="hidden"
                            name="patientId"
                            value={review.patient_id}
                          />

                          <label className="block">
                            <span className="text-sm font-bold text-[#101828]">
                              Approval notes
                            </span>
                            <textarea
                              name="reviewNotes"
                              placeholder="Optional approval notes..."
                              className="mt-2 min-h-24 w-full rounded-2xl border border-[#E6EAF0] bg-[#F6F8FB] px-4 py-3 text-sm outline-none focus:border-[#FF3F4D] focus:ring-4 focus:ring-[#FFE8EC]"
                            />
                          </label>

                          <button
                            type="submit"
                            className="mt-3 w-full rounded-2xl bg-[#12B76A] px-4 py-3 text-sm font-black text-white"
                          >
                            Approve medication
                          </button>
                        </form>

                        <form action={flagMedicationUnsafe}>
                          <input type="hidden" name="reviewId" value={review.id} />
                          <input
                            type="hidden"
                            name="medicationId"
                            value={review.patient_medication_id}
                          />
                          <input
                            type="hidden"
                            name="patientId"
                            value={review.patient_id}
                          />
                          <input
                            type="hidden"
                            name="prescribedBy"
                            value={review.medication?.prescribed_by ?? ""}
                          />
                          <input
                            type="hidden"
                            name="medicationName"
                            value={review.medication?.name ?? "Medication"}
                          />
                          <input
                            type="hidden"
                            name="patientName"
                            value={review.patient?.full_name ?? "Patient"}
                          />

                          <label className="block">
                            <span className="text-sm font-bold text-[#101828]">
                              Unsafe/hold reason
                            </span>
                            <textarea
                              name="reviewNotes"
                              placeholder="Explain why this medication should remain on hold..."
                              className="mt-2 min-h-24 w-full rounded-2xl border border-[#E6EAF0] bg-[#F6F8FB] px-4 py-3 text-sm outline-none focus:border-[#FF3F4D] focus:ring-4 focus:ring-[#FFE8EC]"
                            />
                          </label>

                          <button
                            type="submit"
                            className="mt-3 w-full rounded-2xl bg-[#FF3F4D] px-4 py-3 text-sm font-black text-white"
                          >
                            Flag unsafe
                          </button>
                        </form>
                      </div>
                    ) : (
                      <div className="mt-5 rounded-3xl bg-[#F6F8FB] p-5">
                        <p className="text-sm font-bold text-[#667085]">
                          This review is already complete.
                        </p>
                      </div>
                    )}

                    <Link
                      href={`/clinical/patients/${review.patient_id}`}
                      className="mt-5 block w-full rounded-2xl bg-[#101828] px-4 py-3 text-center text-sm font-black text-white"
                    >
                      Open patient tracker
                    </Link>

                    <div className="mt-5 rounded-3xl bg-[#FFF6F7] p-4">
                      <p className="text-sm font-black text-[#FF3F4D]">
                        Demo safety note
                      </p>
                      <p className="mt-2 text-xs leading-5 text-[#667085]">
                        This queue uses seeded review data and mock medication
                        safety logic only.
                      </p>
                    </div>
                  </aside>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </AppShell>
  );
}
