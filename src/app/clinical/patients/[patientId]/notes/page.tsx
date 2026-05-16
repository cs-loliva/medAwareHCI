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
    patientId: string;
  }>;
  searchParams?: Promise<{
    message?: string;
    error?: string;
    role?: string;
  }>;
};

type Patient = {
  id: string;
  full_name: string;
  room_number: string | null;
  ward: string | null;
  primary_diagnosis: string | null;
};

type CareNote = {
  id: string;
  patient_id: string;
  author_id: string;
  role_name: "nurse" | "doctor";
  content: string;
  archived: boolean;
  created_at: string;
  author: {
    full_name: string;
    email: string;
  } | null;
};

type RoleRow = {
  roles: { name: string } | { name: string }[] | null;
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

async function getClinicalRole(userId: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("user_roles")
    .select("roles(name)")
    .eq("user_id", userId);

  const roleNames = ((data ?? []) as RoleRow[]).flatMap((row) => {
    if (Array.isArray(row.roles)) {
      return row.roles.map((role) => role.name);
    }

    return row.roles?.name ? [row.roles.name] : [];
  });

  if (roleNames.includes("doctor")) return "doctor";
  if (roleNames.includes("nurse")) return "nurse";

  return null;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getRoleVariant(role: CareNote["role_name"]) {
  if (role === "doctor") return "info";
  return "success";
}

async function addCareNote(formData: FormData) {
  "use server";

  const user = await getCurrentUser();
  const supabase = await createClient();

  const patientId = String(formData.get("patientId") ?? "");
  const content = String(formData.get("content") ?? "").trim();

  if (!patientId) {
    redirect("/clinical/patients?error=Missing patient id.");
  }

  if (!content) {
    redirect(`/clinical/patients/${patientId}/notes?error=Care note is required.`);
  }

  const roleName = await getClinicalRole(user.id);

  if (!roleName) {
    redirect(
      `/clinical/patients/${patientId}/notes?error=Only nurses and doctors can create care notes.`
    );
  }

  const { error } = await supabase.from("care_notes").insert({
    patient_id: patientId,
    author_id: user.id,
    role_name: roleName,
    content,
  });

  if (error) {
    redirect(
      `/clinical/patients/${patientId}/notes?error=${encodeURIComponent(
        error.message
      )}`
    );
  }

  revalidatePath(`/clinical/patients/${patientId}/notes`);
  redirect(`/clinical/patients/${patientId}/notes?message=Care note added.`);
}

export default async function CareNotesPage({ params, searchParams }: PageProps) {
  await getCurrentUser();

  const { patientId } = await params;
  const query = searchParams ? await searchParams : {};
  const roleFilter = query.role;

  const supabase = await createClient();

  const [patientResponse, notesResponse] = await Promise.all([
    supabase
      .from("patients")
      .select("id, full_name, room_number, ward, primary_diagnosis")
      .eq("id", patientId)
      .single(),

    supabase
      .from("care_notes")
      .select(
        `
        id,
        patient_id,
        author_id,
        role_name,
        content,
        archived,
        created_at,
        author:author_id (
          full_name,
          email
        )
      `
      )
      .eq("patient_id", patientId)
      .eq("archived", false)
      .order("created_at", { ascending: false }),
  ]);

  if (patientResponse.error || !patientResponse.data) {
    return (
      <AppShell
        title="Care Notes and Rounds"
        subtitle="The selected patient could not be loaded."
        activePath="/clinical/patients"
      >
        <Card>
          <Badge variant="danger">Patient not found</Badge>
          <h2 className="mt-4 text-2xl font-black">Could not load patient</h2>
          <p className="mt-2 text-sm leading-6 text-[#667085]">
            {patientResponse.error?.message ??
              "The patient record does not exist or cannot be accessed."}
          </p>
          <Link
            href="/clinical/patients"
            className="mt-6 inline-block rounded-2xl bg-[#FF3F4D] px-5 py-3 text-sm font-black text-white"
          >
            Back to patient board
          </Link>
        </Card>
      </AppShell>
    );
  }

  const patient = patientResponse.data as Patient;
  const notes = ((notesResponse.data ?? []) as unknown as CareNote[]).filter(
    (note) =>
      roleFilter === "nurse" || roleFilter === "doctor"
        ? note.role_name === roleFilter
        : true
  );

  const nurseNotes = notes.filter((note) => note.role_name === "nurse").length;
  const doctorNotes = notes.filter((note) => note.role_name === "doctor").length;

  return (
    <AppShell
      title="Care Notes and Rounds"
      subtitle={`${patient.full_name} • Room ${
        patient.room_number ?? "N/A"
      } • ${patient.primary_diagnosis ?? "No diagnosis listed"}`}
      activePath="/clinical/patients"
    >
      {query.message ? (
        <Card className="mb-5 border-[#12B76A]/40 bg-[#EAFBF3]">
          <Badge variant="success">Success</Badge>
          <p className="mt-3 text-sm font-bold text-[#101828]">
            {query.message}
          </p>
        </Card>
      ) : null}

      {query.error ? (
        <Card className="mb-5 border-[#FF3F4D]/40 bg-[#FFF6F7]">
          <Badge variant="danger">Error</Badge>
          <p className="mt-3 text-sm font-bold text-[#FF3F4D]">
            {query.error}
          </p>
        </Card>
      ) : null}

      {notesResponse.error ? (
        <Card className="mb-5">
          <Badge variant="danger">Load warning</Badge>
          <p className="mt-3 text-sm leading-6 text-[#667085]">
            {notesResponse.error.message}
          </p>
        </Card>
      ) : null}

      <div className="grid gap-5 md:grid-cols-3">
        <Card>
          <Badge variant="info">Patient</Badge>
          <h2 className="mt-4 text-2xl font-black">{patient.full_name}</h2>
          <p className="mt-2 text-sm leading-6 text-[#667085]">
            Room {patient.room_number ?? "N/A"} • {patient.ward ?? "No ward"}
          </p>
        </Card>

        <Card>
          <Badge variant="success">Nurse notes</Badge>
          <p className="mt-4 text-3xl font-black">{nurseNotes}</p>
          <p className="mt-2 text-sm text-[#667085]">
            Visible care observations
          </p>
        </Card>

        <Card>
          <Badge variant="info">Doctor notes</Badge>
          <p className="mt-4 text-3xl font-black">{doctorNotes}</p>
          <p className="mt-2 text-sm text-[#667085]">
            Round decisions and reviews
          </p>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_380px]">
        <section className="space-y-5">
          <Card>
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <Badge variant="warning">New note</Badge>
                <h2 className="mt-4 text-2xl font-black">Add care note</h2>
                <p className="mt-2 text-sm leading-6 text-[#667085]">
                  Care notes are append-only in this prototype. Only admins can
                  archive notes.
                </p>
              </div>

              <Link
                href={`/clinical/patients/${patient.id}`}
                className="rounded-2xl bg-[#101828] px-5 py-3 text-sm font-black text-white"
              >
                Back to tracker
              </Link>
            </div>

            <form action={addCareNote} className="mt-6">
              <input type="hidden" name="patientId" value={patient.id} />

              <label className="block">
                <span className="text-sm font-bold text-[#101828]">
                  Note content
                </span>
                <textarea
                  name="content"
                  required
                  placeholder="Write observations, round decisions, or follow-up instructions..."
                  className="mt-2 min-h-40 w-full rounded-2xl border border-[#E6EAF0] bg-[#F6F8FB] px-4 py-3 outline-none focus:border-[#FF3F4D] focus:ring-4 focus:ring-[#FFE8EC]"
                />
              </label>

              <button
                type="submit"
                className="mt-5 rounded-2xl bg-[#FF3F4D] px-5 py-3 text-sm font-black text-white"
              >
                Save care note
              </button>
            </form>
          </Card>

          <Card>
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <Badge variant="info">Rounds timeline</Badge>
                <h2 className="mt-4 text-2xl font-black">Care notes</h2>
                <p className="mt-2 text-sm text-[#667085]">
                  Notes are shown in reverse chronological order.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/clinical/patients/${patient.id}/notes`}
                  className="rounded-2xl bg-white px-4 py-2 text-sm font-black text-[#101828] shadow-sm"
                >
                  All
                </Link>
                <Link
                  href={`/clinical/patients/${patient.id}/notes?role=nurse`}
                  className="rounded-2xl bg-[#EAFBF3] px-4 py-2 text-sm font-black text-[#12B76A]"
                >
                  Nurse
                </Link>
                <Link
                  href={`/clinical/patients/${patient.id}/notes?role=doctor`}
                  className="rounded-2xl bg-[#EAF3FF] px-4 py-2 text-sm font-black text-[#2E90FA]"
                >
                  Doctor
                </Link>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {notes.length === 0 ? (
                <div className="rounded-3xl bg-[#F6F8FB] p-5 text-sm text-[#667085]">
                  No care notes found for this filter.
                </div>
              ) : (
                notes.map((note) => (
                  <div
                    key={note.id}
                    className="rounded-[2rem] border border-[#E6EAF0] bg-[#F6F8FB] p-5"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <Badge variant={getRoleVariant(note.role_name)}>
                          {note.role_name}
                        </Badge>
                        <h3 className="mt-3 text-lg font-black">
                          {note.author?.full_name ?? "Unknown author"}
                        </h3>
                        <p className="mt-1 text-xs text-[#667085]">
                          {note.author?.email ?? note.author_id} •{" "}
                          {formatDateTime(note.created_at)}
                        </p>
                      </div>
                    </div>

                    <p className="mt-4 whitespace-pre-line text-sm leading-6 text-[#667085]">
                      {note.content}
                    </p>
                  </div>
                ))
              )}
            </div>
          </Card>
        </section>

        <aside className="space-y-5">
          <Card>
            <Badge variant="success">HCI purpose</Badge>
            <h2 className="mt-4 text-xl font-black">Shared clinical memory</h2>
            <p className="mt-2 text-sm leading-6 text-[#667085]">
              Care notes support continuity, accountability, and shared context
              during rounds. The design keeps notes visible without allowing
              deletion by ordinary users.
            </p>
          </Card>

          <Card>
            <p className="text-sm font-black text-[#FF3F4D]">
              Academic prototype
            </p>
            <p className="mt-2 text-sm leading-6 text-[#667085]">
              Notes in this prototype are seeded/demo records. Real deployment
              would require clinical documentation standards, privacy review,
              and stronger audit controls.
            </p>
          </Card>
        </aside>
      </div>
    </AppShell>
  );
}