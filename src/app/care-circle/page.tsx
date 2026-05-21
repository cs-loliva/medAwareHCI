import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type CareCircleMember = {
  id: string;
  owner_id: string;
  caregiver_id: string;
  permission: "view" | "manage";
  status: "pending" | "active" | "revoked";
  accepted_at: string | null;
  invited_at: string;
};

type Profile = {
  id: string;
  full_name: string;
  email: string;
};

type PageProps = {
  searchParams?: Promise<{
    message?: string;
    error?: string;
  }>;
};

function getStatusVariant(status: CareCircleMember["status"]) {
  if (status === "active") return "success";
  if (status === "pending") return "warning";
  return "danger";
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

async function inviteCaregiver(formData: FormData) {
  "use server";

  const user = await getCurrentUser();
  const admin = createAdminClient();

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const permission = String(formData.get("permission") ?? "view");

  if (!email) {
    redirect("/care-circle?error=Caregiver email is required.");
  }

  if (permission !== "view" && permission !== "manage") {
    redirect("/care-circle?error=Invalid permission selected.");
  }

  const { data: caregiver, error: caregiverError } = await admin
    .from("profiles")
    .select("id, email, full_name")
    .eq("email", email)
    .maybeSingle();

  if (caregiverError || !caregiver) {
    redirect(
      "/care-circle?error=No MedAware demo user was found with that email."
    );
  }

  if (caregiver.id === user.id) {
    redirect("/care-circle?error=You cannot invite yourself as caregiver.");
  }

  const { error } = await admin.from("care_circle_members").upsert(
    {
      owner_id: user.id,
      caregiver_id: caregiver.id,
      permission,
      status: "active",
      accepted_at: new Date().toISOString(),
    },
    {
      onConflict: "owner_id,caregiver_id",
    }
  );

  if (error) {
    redirect(`/care-circle?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/care-circle");
  redirect("/care-circle?message=Caregiver added to your Care Circle.");
}

async function updateCaregiverPermission(formData: FormData) {
  "use server";

  const user = await getCurrentUser();
  const admin = createAdminClient();

  const membershipId = String(formData.get("membershipId") ?? "");
  const permission = String(formData.get("permission") ?? "view");

  if (permission !== "view" && permission !== "manage") {
    redirect("/care-circle?error=Invalid permission selected.");
  }

  const { error } = await admin
    .from("care_circle_members")
    .update({ permission })
    .eq("id", membershipId)
    .eq("owner_id", user.id);

  if (error) {
    redirect(`/care-circle?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/care-circle");
  redirect("/care-circle?message=Caregiver permission updated.");
}

async function revokeCaregiver(formData: FormData) {
  "use server";

  const user = await getCurrentUser();
  const admin = createAdminClient();

  const membershipId = String(formData.get("membershipId") ?? "");

  const { error } = await admin
    .from("care_circle_members")
    .update({ status: "revoked" })
    .eq("id", membershipId)
    .eq("owner_id", user.id);

  if (error) {
    redirect(`/care-circle?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/care-circle");
  redirect("/care-circle?message=Caregiver access revoked.");
}

export default async function CareCirclePage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  const params = searchParams ? await searchParams : {};

  const admin = createAdminClient();

  const { data: membershipsData, error } = await admin
    .from("care_circle_members")
    .select("id, owner_id, caregiver_id, permission, status, accepted_at, invited_at")
    .or(`owner_id.eq.${user.id},caregiver_id.eq.${user.id}`)
    .order("invited_at", { ascending: false });

  const memberships = (membershipsData ?? []) as CareCircleMember[];

  const profileIds = Array.from(
    new Set(
      memberships.flatMap((membership) => [
        membership.owner_id,
        membership.caregiver_id,
      ])
    )
  );

  const { data: profilesData } =
    profileIds.length > 0
      ? await admin
          .from("profiles")
          .select("id, full_name, email")
          .in("id", profileIds)
      : { data: [] };

  const profiles = new Map(
    ((profilesData ?? []) as Profile[]).map((profile) => [profile.id, profile])
  );

  const sharingWith = memberships.filter(
    (membership) => membership.owner_id === user.id
  );

  const sharedWithMe = memberships.filter(
    (membership) => membership.caregiver_id === user.id
  );

  return (
    <AppShell
      title="Caregiver Dashboard"
      subtitle="Review shared care access, medication visibility, and care circle permissions."
      activePath="/care-circle"
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
          <Badge variant="danger">Could not load this section</Badge>
          <p className="mt-3 text-sm text-[#667085]">{error.message}</p>
          <Link href="/dashboard" className="mt-3 inline-block text-sm font-black text-[#344054] underline">Back to dashboard</Link>
        </Card>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <section className="space-y-5">
          <Card>
            <Badge variant="info">Invite caregiver</Badge>
            <h2 className="mt-4 text-2xl font-black">
              Add someone to your Care Circle
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#667085]">
              Invite a trusted demo user to view or manage your medication
              schedule. For testing, try caregiver@medaware.demo.
            </p>

            <form action={inviteCaregiver} className="mt-6 grid gap-4 md:grid-cols-[1fr_180px]">
              <label className="block">
                <span className="text-sm font-bold text-[#101828]">
                  Caregiver email
                </span>
                <input
                  name="email"
                  type="email"
                  placeholder="caregiver@medaware.demo"
                  className="mt-2 w-full rounded-2xl border border-[#E6EAF0] bg-[#F6F8FB] px-4 py-3 outline-none focus:border-[#FF3F4D] focus:ring-4 focus:ring-[#FFE8EC]"
                  required
                />
              </label>

              <label className="block">
                <span className="text-sm font-bold text-[#101828]">
                  Permission
                </span>
                <select
                  name="permission"
                  className="mt-2 w-full rounded-2xl border border-[#E6EAF0] bg-[#F6F8FB] px-4 py-3 outline-none focus:border-[#FF3F4D] focus:ring-4 focus:ring-[#FFE8EC]"
                  defaultValue="view"
                >
                  <option value="view">View only</option>
                  <option value="manage">Manage</option>
                </select>
              </label>

              <div className="md:col-span-2">
                <button
                  type="submit"
                  className="rounded-2xl bg-[#FF3F4D] px-5 py-3 text-sm font-black text-white"
                >
                  Add caregiver
                </button>
              </div>
            </form>
          </Card>

          <Card>
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <Badge variant="warning">Shared access</Badge>
                <h2 className="mt-4 text-2xl font-black">
                  People I share with
                </h2>
                <p className="mt-2 text-sm text-[#667085]">
                  Manage caregivers who can access your medication information.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {sharingWith.length === 0 ? (
                <div className="rounded-3xl bg-[#F6F8FB] p-5 text-sm text-[#667085]">
                  You are not sharing your medication data with anyone yet.
                </div>
              ) : (
                sharingWith.map((membership) => {
                  const caregiver = profiles.get(membership.caregiver_id);

                  return (
                    <div
                      key={membership.id}
                      className="rounded-3xl border border-[#E6EAF0] bg-[#F6F8FB] p-5"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-3">
                            <h3 className="text-xl font-black">
                              {caregiver?.full_name ?? "Unknown caregiver"}
                            </h3>
                            <Badge variant={getStatusVariant(membership.status)}>
                              {membership.status}
                            </Badge>
                            <Badge
                              variant={
                                membership.permission === "manage"
                                  ? "warning"
                                  : "info"
                              }
                            >
                              {membership.permission}
                            </Badge>
                          </div>

                          <p className="mt-2 text-sm text-[#667085]">
                            {caregiver?.email ?? membership.caregiver_id}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <form action={updateCaregiverPermission}>
                            <input
                              type="hidden"
                              name="membershipId"
                              value={membership.id}
                            />
                            <input
                              type="hidden"
                              name="permission"
                              value={
                                membership.permission === "manage"
                                  ? "view"
                                  : "manage"
                              }
                            />
                            <button
                              type="submit"
                              className="rounded-2xl bg-white px-4 py-2 text-sm font-black text-[#101828] shadow-sm"
                            >
                              Set{" "}
                              {membership.permission === "manage"
                                ? "view only"
                                : "manage"}
                            </button>
                          </form>

                          <form action={revokeCaregiver}>
                            <input
                              type="hidden"
                              name="membershipId"
                              value={membership.id}
                            />
                            <button
                              type="submit"
                              className="rounded-2xl bg-[#FFE8EC] px-4 py-2 text-sm font-black text-[#FF3F4D]"
                            >
                              Revoke
                            </button>
                          </form>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </section>

        <aside className="space-y-5">
          <Card>
            <Badge variant="success">Caregiver view</Badge>
            <h2 className="mt-4 text-xl font-black">Shared with me</h2>
            <p className="mt-2 text-sm leading-6 text-[#667085]">
              These are medication profiles where you are listed as a caregiver.
            </p>

            <div className="mt-5 space-y-3">
              {sharedWithMe.length === 0 ? (
                <p className="text-sm text-[#667085]">
                  No one has shared a medication profile with you yet.
                </p>
              ) : (
                sharedWithMe.map((membership) => {
                  const owner = profiles.get(membership.owner_id);

                  return (
                    <div
                      key={membership.id}
                      className="rounded-3xl bg-[#F6F8FB] p-4"
                    >
                      <p className="font-black text-[#101828]">
                        {owner?.full_name ?? "Unknown user"}
                      </p>
                      <p className="mt-1 text-sm text-[#667085]">
                        {owner?.email ?? membership.owner_id}
                      </p>
                      <div className="mt-3 flex gap-2">
                        <Badge variant={getStatusVariant(membership.status)}>
                          {membership.status}
                        </Badge>
                        <Badge variant="info">{membership.permission}</Badge>
                      </div>
                      {membership.status === "active" ? (
                        <div className="mt-4">
                          <Link
                            href={`/care-circle/shared/${membership.owner_id}`}
                            className="inline-flex rounded-2xl bg-white px-4 py-2 text-sm font-black text-[#101828] shadow-sm"
                          >
                            Open shared medication view
                          </Link>
                        </div>
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>
          </Card>

          <Card>
            <p className="text-sm font-black text-[#FF3F4D]">
              Academic prototype
            </p>
            <p className="mt-2 text-sm leading-6 text-[#667085]">
              Care Circle permissions demonstrate HCI sharing controls. Real
              deployment would require stronger consent, privacy review, and
              healthcare compliance validation.
            </p>
          </Card>
        </aside>
      </div>
    </AppShell>
  );
}
