"use client";

import {
  LANDING_ROUTE_BY_ROLE,
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
  ROLES,
  isRole,
  type Role,
} from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const hasSupabaseEnv =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

type UserRoleRow = {
  roles: { name: string } | { name: string }[] | null;
};

export default function RoleSelectPage() {
  const router = useRouter();
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadRoles() {
      if (!hasSupabaseEnv) {
        setRoles(["civilian", "nurse", "doctor", "pharmacist", "admin"]);
        setIsLoading(false);
        return;
      }

      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data } = await supabase
        .from("user_roles")
        .select("roles(name)")
        .eq("user_id", user.id);

      const parsedRoles = ((data ?? []) as UserRoleRow[])
        .flatMap((row) => {
          if (Array.isArray(row.roles)) {
            return row.roles.map((role) => role.name);
          }

          return row.roles?.name;
        })
        .filter((role): role is Role => Boolean(role && isRole(role)));

      setRoles(parsedRoles);
      setIsLoading(false);
    }

    loadRoles();
  }, [router]);

  function chooseRole(role: Role) {
    router.push(LANDING_ROUTE_BY_ROLE[role]);
  }

  const visibleRoles = roles.length > 0 ? roles : [...ROLES];

  return (
    <main className="min-h-screen bg-[#F6F8FB] px-6 py-10 text-[#101828]">
      <section className="mx-auto max-w-5xl">
        <div className="mb-10">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-[#FF3F4D] text-2xl font-black text-white">
            M+
          </div>

          <h1 className="text-4xl font-black tracking-tight">
            Choose your MedAware workspace
          </h1>

          <p className="mt-3 max-w-2xl text-[#667085]">
            Your landing page changes depending on your role. Civilian users
            start with medication timers, while clinical users start with patient
            dashboards.
          </p>
        </div>

        {isLoading ? (
          <div className="rounded-3xl border border-[#E6EAF0] bg-white p-8 text-[#667085]">
            Loading roles...
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {visibleRoles.map((role) => (
              <button
                key={role}
                onClick={() => chooseRole(role)}
                className="rounded-3xl border border-[#E6EAF0] bg-white p-6 text-left shadow-sm transition hover:border-[#FF3F4D] hover:shadow-md"
              >
                <p className="text-lg font-black">{ROLE_LABELS[role]}</p>
                <p className="mt-2 text-sm leading-6 text-[#667085]">
                  {ROLE_DESCRIPTIONS[role]}
                </p>
                <p className="mt-5 text-sm font-bold text-[#FF3F4D]">
                  Continue →
                </p>
              </button>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}