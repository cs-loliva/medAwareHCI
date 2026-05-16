import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{
    message?: string;
    error?: string;
  }>;
};

type Profile = {
  id: string;
  full_name: string;
  email: string;
  font_size?: string | null;
  high_contrast?: boolean | null;
  created_at?: string;
};

type Role = {
  id: string;
  name: string;
};

type UserRole = {
  user_id: string;
  role_id: string;
};

type AuditLog = {
  id: string;
  actor_id: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Not recorded";

  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getRoleVariant(roleName: string) {
  if (roleName === "admin") return "danger";
  if (roleName === "doctor") return "info";
  if (roleName === "nurse") return "success";
  if (roleName === "pharmacist") return "warning";
  if (roleName === "caregiver") return "default";
  return "info";
}

function getActionVariant(action: string) {
  if (action.includes("unsafe") || action.includes("revoked")) return "danger";
  if (action.includes("approved") || action.includes("assigned")) {
    return "success";
  }
  if (action.includes("review") || action.includes("generated")) {
    return "warning";
  }
  return "info";
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

async function assignRole(formData: FormData) {
  "use server";

  const user = await getCurrentUser();
  const admin = createAdminClient();

  const userId = String(formData.get("userId") ?? "");
  const roleId = String(formData.get("roleId") ?? "");

  if (!userId || !roleId) {
    redirect("/admin?error=Missing user or role selection.");
  }

  const { data: role } = await admin
    .from("roles")
    .select("id, name")
    .eq("id", roleId)
    .single();

  const { error } = await admin.from("user_roles").upsert(
    {
      user_id: userId,
      role_id: roleId,
    },
    {
      onConflict: "user_id,role_id",
    }
  );

  if (error) {
    redirect(`/admin?error=${encodeURIComponent(error.message)}`);
  }

  await admin.from("audit_logs").insert({
    actor_id: user.id,
    action: "admin.role_assigned",
    target_type: "profile",
    target_id: userId,
    metadata: {
      role_id: roleId,
      role_name: role?.name ?? "unknown",
    },
  });

  revalidatePath("/admin");
  redirect("/admin?message=Role assigned successfully.");
}

async function removeRole(formData: FormData) {
  "use server";

  const user = await getCurrentUser();
  const admin = createAdminClient();

  const userId = String(formData.get("userId") ?? "");
  const roleId = String(formData.get("roleId") ?? "");

  if (!userId || !roleId) {
    redirect("/admin?error=Missing user or role selection.");
  }

  const { data: role } = await admin
    .from("roles")
    .select("id, name")
    .eq("id", roleId)
    .single();

  if (role?.name === "admin") {
    const { data: adminRoleRows } = await admin
      .from("user_roles")
      .select("user_id")
      .eq("role_id", roleId);

    if ((adminRoleRows ?? []).length <= 1) {
      redirect("/admin?error=Cannot remove the last admin role.");
    }
  }

  const { error } = await admin
    .from("user_roles")
    .delete()
    .eq("user_id", userId)
    .eq("role_id", roleId);

  if (error) {
    redirect(`/admin?error=${encodeURIComponent(error.message)}`);
  }

  await admin.from("audit_logs").insert({
    actor_id: user.id,
    action: "admin.role_removed",
    target_type: "profile",
    target_id: userId,
    metadata: {
      role_id: roleId,
      role_name: role?.name ?? "unknown",
    },
  });

  revalidatePath("/admin");
  redirect("/admin?message=Role removed successfully.");
}

export default async function AdminPage({ searchParams }: PageProps) {
  await getCurrentUser();

  const params = searchParams ? await searchParams : {};
  const admin = createAdminClient();

  const [profilesResponse, rolesResponse, userRolesResponse, auditResponse] =
    await Promise.all([
      admin
        .from("profiles")
        .select("id, full_name, email, font_size, high_contrast, created_at")
        .order("email", { ascending: true }),

      admin.from("roles").select("id, name").order("name", { ascending: true }),

      admin.from("user_roles").select("user_id, role_id"),

      admin
        .from("audit_logs")
        .select("id, actor_id, action, target_type, target_id, metadata, created_at")
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

  const profiles = (profilesResponse.data ?? []) as Profile[];
  const roles = (rolesResponse.data ?? []) as Role[];
  const userRoles = (userRolesResponse.data ?? []) as UserRole[];
  const auditLogs = (auditResponse.data ?? []) as AuditLog[];

  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
  const roleMap = new Map(roles.map((role) => [role.id, role]));

  const roleCounts = roles.map((role) => ({
    ...role,
    count: userRoles.filter((userRole) => userRole.role_id === role.id).length,
  }));

  const adminCount =
    roleCounts.find((role) => role.name === "admin")?.count ?? 0;

  return (
    <AppShell
      title="Admin Roles and Audit Logs"
      subtitle="Manage demo user roles, review system activity, and inspect audit events."
      activePath="/admin"
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

      {profilesResponse.error ||
      rolesResponse.error ||
      userRolesResponse.error ||
      auditResponse.error ? (
        <Card className="mb-5">
          <Badge variant="danger">Load warning</Badge>
          <p className="mt-3 text-sm leading-6 text-[#667085]">
            {profilesResponse.error?.message ??
              rolesResponse.error?.message ??
              userRolesResponse.error?.message ??
              auditResponse.error?.message}
          </p>
        </Card>
      ) : null}

      <div className="grid gap-5 md:grid-cols-3">
        <Card>
          <Badge variant="info">Users</Badge>
          <p className="mt-4 text-3xl font-black">{profiles.length}</p>
          <p className="mt-2 text-sm text-[#667085]">
            Demo profiles registered in Supabase
          </p>
        </Card>

        <Card>
          <Badge variant="warning">Roles</Badge>
          <p className="mt-4 text-3xl font-black">{roles.length}</p>
          <p className="mt-2 text-sm text-[#667085]">
            Available access roles
          </p>
        </Card>

        <Card>
          <Badge variant={adminCount > 0 ? "success" : "danger"}>Admins</Badge>
          <p className="mt-4 text-3xl font-black">{adminCount}</p>
          <p className="mt-2 text-sm text-[#667085]">
            Users with admin privileges
          </p>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_380px]">
        <section className="space-y-5">
          <Card>
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <Badge variant="info">Role management</Badge>
                <h2 className="mt-4 text-2xl font-black">Users and roles</h2>
                <p className="mt-2 text-sm text-[#667085]">
                  Assign or remove demo roles. Changes are written to the audit
                  log.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {profiles.length === 0 ? (
                <div className="rounded-3xl bg-[#F6F8FB] p-5 text-sm text-[#667085]">
                  No profiles found.
                </div>
              ) : (
                profiles.map((profile) => {
                  const assignedRoleIds = userRoles
                    .filter((userRole) => userRole.user_id === profile.id)
                    .map((userRole) => userRole.role_id);

                  const assignedRoles = assignedRoleIds
                    .map((roleId) => roleMap.get(roleId))
                    .filter(Boolean) as Role[];

                  const availableRoles = roles.filter(
                    (role) => !assignedRoleIds.includes(role.id)
                  );

                  return (
                    <div
                      key={profile.id}
                      className="rounded-[2rem] border border-[#E6EAF0] bg-[#F6F8FB] p-5"
                    >
                      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
                        <div>
                          <h3 className="text-xl font-black">
                            {profile.full_name}
                          </h3>
                          <p className="mt-1 text-sm text-[#667085]">
                            {profile.email}
                          </p>

                          <div className="mt-4 flex flex-wrap gap-2">
                            {assignedRoles.length === 0 ? (
                              <Badge variant="danger">No role</Badge>
                            ) : (
                              assignedRoles.map((role) => (
                                <Badge
                                  key={role.id}
                                  variant={getRoleVariant(role.name)}
                                >
                                  {role.name}
                                </Badge>
                              ))
                            )}
                          </div>

                          <p className="mt-4 text-xs text-[#667085]">
                            Accessibility:{" "}
                            <span className="font-bold">
                              {profile.font_size ?? "default"}
                            </span>{" "}
                            font •{" "}
                            <span className="font-bold">
                              {profile.high_contrast
                                ? "high contrast"
                                : "standard contrast"}
                            </span>
                          </p>
                        </div>

                        <aside className="space-y-3">
                          <form action={assignRole} className="rounded-3xl bg-white p-4">
                            <input
                              type="hidden"
                              name="userId"
                              value={profile.id}
                            />

                            <label className="block">
                              <span className="text-xs font-black uppercase tracking-wide text-[#667085]">
                                Assign role
                              </span>
                              <select
                                name="roleId"
                                className="mt-2 w-full rounded-2xl border border-[#E6EAF0] bg-[#F6F8FB] px-3 py-2 text-sm outline-none focus:border-[#FF3F4D] focus:ring-4 focus:ring-[#FFE8EC]"
                                disabled={availableRoles.length === 0}
                              >
                                {availableRoles.length === 0 ? (
                                  <option>All roles assigned</option>
                                ) : (
                                  availableRoles.map((role) => (
                                    <option key={role.id} value={role.id}>
                                      {role.name}
                                    </option>
                                  ))
                                )}
                              </select>
                            </label>

                            <button
                              type="submit"
                              disabled={availableRoles.length === 0}
                              className="mt-3 w-full rounded-2xl bg-[#FF3F4D] px-4 py-2 text-sm font-black text-white disabled:opacity-50"
                            >
                              Assign
                            </button>
                          </form>

                          {assignedRoles.length > 0 ? (
                            <div className="rounded-3xl bg-white p-4">
                              <p className="text-xs font-black uppercase tracking-wide text-[#667085]">
                                Remove role
                              </p>

                              <div className="mt-3 flex flex-wrap gap-2">
                                {assignedRoles.map((role) => (
                                  <form key={role.id} action={removeRole}>
                                    <input
                                      type="hidden"
                                      name="userId"
                                      value={profile.id}
                                    />
                                    <input
                                      type="hidden"
                                      name="roleId"
                                      value={role.id}
                                    />
                                    <button
                                      type="submit"
                                      className="rounded-2xl bg-[#FFE8EC] px-3 py-2 text-xs font-black text-[#FF3F4D]"
                                    >
                                      Remove {role.name}
                                    </button>
                                  </form>
                                ))}
                              </div>
                            </div>
                          ) : null}
                        </aside>
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
            <Badge variant="warning">Role distribution</Badge>
            <h2 className="mt-4 text-xl font-black">Current role counts</h2>

            <div className="mt-5 space-y-3">
              {roleCounts.map((role) => (
                <div
                  key={role.id}
                  className="flex items-center justify-between rounded-2xl bg-[#F6F8FB] p-4"
                >
                  <Badge variant={getRoleVariant(role.name)}>{role.name}</Badge>
                  <p className="text-lg font-black">{role.count}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <p className="text-sm font-black text-[#FF3F4D]">
              Admin safety note
            </p>
            <p className="mt-2 text-sm leading-6 text-[#667085]">
              This admin dashboard uses the Supabase service role on the server
              only. Never expose service role keys to client components or
              browser code.
            </p>
          </Card>
        </aside>
      </div>

      <Card className="mt-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <Badge variant="info">Audit trail</Badge>
            <h2 className="mt-4 text-2xl font-black">Recent audit logs</h2>
            <p className="mt-2 text-sm text-[#667085]">
              Latest 50 audit events from Supabase.
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {auditLogs.length === 0 ? (
            <div className="rounded-3xl bg-[#F6F8FB] p-5 text-sm text-[#667085]">
              No audit logs found.
            </div>
          ) : (
            auditLogs.map((log) => {
              const actor = log.actor_id ? profileMap.get(log.actor_id) : null;
              const metadata =
                log.metadata && Object.keys(log.metadata).length > 0
                  ? JSON.stringify(log.metadata, null, 2)
                  : null;

              return (
                <div
                  key={log.id}
                  className="rounded-[2rem] border border-[#E6EAF0] bg-[#F6F8FB] p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <Badge variant={getActionVariant(log.action)}>
                          {log.action}
                        </Badge>
                        <span className="text-xs font-black uppercase tracking-wide text-[#667085]">
                          {formatDateTime(log.created_at)}
                        </span>
                      </div>

                      <p className="mt-3 text-sm text-[#667085]">
                        Actor:{" "}
                        <span className="font-bold text-[#101828]">
                          {actor?.full_name ?? log.actor_id ?? "System"}
                        </span>
                      </p>

                      <p className="mt-1 text-sm text-[#667085]">
                        Target:{" "}
                        <span className="font-bold text-[#101828]">
                          {log.target_type}
                          {log.target_id ? ` • ${log.target_id}` : ""}
                        </span>
                      </p>
                    </div>

                    {metadata ? (
                      <pre className="max-h-40 overflow-auto rounded-2xl bg-white p-4 text-xs leading-5 text-[#667085]">
                        {metadata}
                      </pre>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>
    </AppShell>
  );
}