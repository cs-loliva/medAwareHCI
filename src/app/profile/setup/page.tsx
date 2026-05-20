import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

type ProfileRow = {
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  profile_completed: boolean | null;
};

function splitName(fullName: string | null) {
  if (!fullName) return { firstName: "", lastName: "" };
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] ?? "",
    lastName: parts.length > 1 ? parts[parts.length - 1] : "",
  };
}

export default async function ProfileSetupPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, full_name, email, avatar_url, profile_completed")
    .eq("id", user.id)
    .maybeSingle<ProfileRow>();

  const metadata = (user.user_metadata ?? {}) as Record<string, string | undefined>;
  const metaFullName = metadata.name ?? metadata.full_name ?? "";
  const splitFromFull = splitName(metaFullName);

  const firstName = profile?.first_name ?? metadata.given_name ?? splitFromFull.firstName;
  const lastName = profile?.last_name ?? metadata.family_name ?? splitFromFull.lastName;
  const avatarUrl = profile?.avatar_url ?? metadata.avatar_url ?? metadata.picture ?? "";

  async function saveProfile(formData: FormData) {
    "use server";

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const metadata = (user.user_metadata ?? {}) as Record<string, string | undefined>;
    const appMetadata = (user.app_metadata ?? {}) as Record<string, string | undefined>;
    const first_name = String(formData.get("first_name") ?? "").trim();
    const last_name = String(formData.get("last_name") ?? "").trim();
    const full_name = `${first_name} ${last_name}`.trim();

    const provider = appMetadata.provider
      ?? ((metadata.picture || metadata.given_name || metadata.family_name) ? "google" : "email");

    const updatePayload: Record<string, unknown> = {
      id: user.id,
      first_name,
      last_name,
      full_name,
      email: user.email ?? "",
      avatar_url: avatarUrl,
      profile_completed: true,
      auth_provider: provider,
      updated_at: new Date().toISOString(),
    };

    await supabase.from("profiles").upsert(updatePayload, { onConflict: "id" });

    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", user.id)
      .limit(1);

    if (!roleRows || roleRows.length === 0) {
      const { data: civilianRole } = await supabase
        .from("roles")
        .select("id")
        .eq("name", "civilian")
        .maybeSingle();

      if (civilianRole?.id) {
        await supabase.from("user_roles").insert({
          user_id: user.id,
          role_id: civilianRole.id,
        });
      }
    }

    redirect("/role-select");
  }

  return (
    <main className="mx-auto max-w-xl px-6 py-10">
      <h1 className="text-3xl font-black">Profile setup</h1>
      <p className="mt-3 rounded-xl bg-[#FFF6F7] p-4 text-sm text-[#667085]">
        MedAware is an academic prototype. Profile information is used for demo care coordination only and does not create a real clinical account.
      </p>
      <form action={saveProfile} className="mt-6 space-y-4 rounded-2xl border border-[#E6EAF0] p-6">
        <label className="block">
          <span className="text-sm font-bold">First name</span>
          <input name="first_name" defaultValue={firstName} required className="mt-2 w-full rounded-xl border border-[#E6EAF0] px-3 py-2" />
        </label>
        <label className="block">
          <span className="text-sm font-bold">Last name</span>
          <input name="last_name" defaultValue={lastName} required className="mt-2 w-full rounded-xl border border-[#E6EAF0] px-3 py-2" />
        </label>
        <label className="block">
          <span className="text-sm font-bold">Email</span>
          <input readOnly value={user.email ?? ""} className="mt-2 w-full rounded-xl border border-[#E6EAF0] bg-[#F6F8FB] px-3 py-2 text-[#667085]" />
        </label>
        <button type="submit" className="w-full rounded-xl bg-[#FF3F4D] px-4 py-2 font-bold text-white">Save and continue</button>
      </form>
      {profile?.profile_completed ? <p className="mt-3 text-sm text-[#667085]">Your profile is complete; you can still update details here.</p> : null}
    </main>
  );
}
