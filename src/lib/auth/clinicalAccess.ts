import { redirect } from "next/navigation";
import { isRole, type Role } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

type RoleRow = { roles: { name: string } | { name: string }[] | null };

export async function getCurrentUserWithRoles() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: roleRows } = await supabase
    .from("user_roles")
    .select("roles(name)")
    .eq("user_id", user.id);

  const roleNames = ((roleRows ?? []) as RoleRow[])
    .flatMap((row) => {
      if (Array.isArray(row.roles)) return row.roles.map((role) => role.name);
      return row.roles?.name ? [row.roles.name] : [];
    })
    .filter((role): role is Role => isRole(role));

  return { user, roleNames, supabase };
}

export function isAdmin(roleNames: Role[]) {
  return roleNames.includes("admin");
}

export async function getAccessiblePatientIds(userId: string, roleNames: Role[]) {
  if (isAdmin(roleNames)) return null;
  if (!roleNames.some((role) => role === "doctor" || role === "nurse")) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("patient_assignments")
    .select("patient_id")
    .eq("user_id", userId);

  return Array.from(new Set((data ?? []).map((row) => row.patient_id).filter(Boolean)));
}

export async function canAccessPatient(userId: string, roleNames: Role[], patientId: string) {
  if (isAdmin(roleNames)) return true;
  if (!roleNames.some((role) => role === "doctor" || role === "nurse")) return false;

  const supabase = await createClient();
  const { data } = await supabase
    .from("patient_assignments")
    .select("patient_id")
    .eq("user_id", userId)
    .eq("patient_id", patientId)
    .maybeSingle();

  return Boolean(data?.patient_id);
}
