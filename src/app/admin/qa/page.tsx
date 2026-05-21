import { QAChecklist } from "@/components/features/admin/QAChecklist";
import { AppShell } from "@/components/layout/AppShell";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

async function getCurrentAdminUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: roleRows } = await admin
    .from("user_roles")
    .select("roles(name)")
    .eq("user_id", user.id);

  const isAdmin = (roleRows ?? []).some(
    (row) => ((row.roles as { name?: string } | null)?.name ?? "") === "admin"
  );

  if (!isAdmin) redirect("/unauthorized");
}

export default async function AdminQAPage() {
  await getCurrentAdminUser();

  return (
    <AppShell
      title="Final QA Checklist"
      subtitle="Validate MedAware’s deployed flows before presentation or submission."
      activePath="/admin/qa"
    >
      <QAChecklist />
    </AppShell>
  );
}
