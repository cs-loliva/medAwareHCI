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
          <TopBar title={title} subtitle={subtitle} activePath={activePath} />

          <div className="px-4 py-4 sm:px-6 sm:py-6">{children}</div>
        </section>
      </div>
    </main>
  );
}