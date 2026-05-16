import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { AccessibilityApplier } from "./AccessibilityApplier";

type AppShellProps = {
  children: ReactNode;
  title: string;
  subtitle?: string;
  activePath?: string;
};

export function AppShell({
  children,
  title,
  subtitle,
  activePath,
}: AppShellProps) {
  return (
    <main className="min-h-screen bg-[#F6F8FB] text-[#101828]">
      <AccessibilityApplier />
      <div className="flex min-h-screen">
        <Sidebar activePath={activePath} />

        <section className="min-w-0 flex-1">
          <TopBar title={title} subtitle={subtitle} />

          <div className="px-6 py-6">{children}</div>
        </section>
      </div>
    </main>
  );
}