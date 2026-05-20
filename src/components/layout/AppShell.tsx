"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isRole, type Role } from "@/lib/auth/roles";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { AccessibilityApplier } from "./AccessibilityApplier";

type AppShellProps = {
  children: ReactNode;
  title: string;
  subtitle?: string;
  activePath?: string;
};

export function AppShell({ children, title, subtitle, activePath }: AppShellProps) {
  const [roleNames, setRoleNames] = useState<Role[]>([]);

  useEffect(() => {
    async function loadRoles() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setRoleNames([]);
        return;
      }

      const { data } = await supabase
        .from("user_roles")
        .select("roles(name)")
        .eq("user_id", user.id);

      const roles = (data ?? [])
        .flatMap((row: { roles: { name: string } | { name: string }[] | null }) => {
          const relatedRole = row.roles;
          if (Array.isArray(relatedRole)) {
            return relatedRole.map((role) => role?.name);
          }
          return relatedRole?.name;
        })
        .filter((role): role is Role => Boolean(role && isRole(role)));

      setRoleNames(roles);
    }

    loadRoles();
  }, []);

  return (
    <main className="min-h-screen bg-[#F6F8FB] text-[#101828]">
      <AccessibilityApplier />
      <div className="flex min-h-screen">
        <Sidebar activePath={activePath} roleNames={roleNames} />

        <section className="min-w-0 flex-1">
          <TopBar title={title} subtitle={subtitle} activePath={activePath} roleNames={roleNames} />

          <div className="px-4 py-4 sm:px-6 sm:py-6">{children}</div>
        </section>
      </div>
    </main>
  );
}
