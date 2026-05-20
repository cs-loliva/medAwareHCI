import Link from "next/link";
import { MobileNav } from "./MobileNav";
import { SignOutButton } from "./SignOutButton";

type TopBarProps = {
  title: string;
  subtitle?: string;
  activePath?: string;
  roleNames: string[];
};

export function TopBar({ title, subtitle, activePath, roleNames }: TopBarProps) {
  return (
    <header className="sticky top-0 z-10 border-b border-[#E6EAF0] bg-[#F6F8FB]/90 px-4 py-4 backdrop-blur print:hidden sm:px-6 sm:py-5">
      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#FF3F4D]">
              MedAware
            </p>
            <h1 className="mt-1 text-xl font-black tracking-tight text-[#101828] sm:text-2xl">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-1 text-sm leading-6 text-[#667085]">
                {subtitle}
              </p>
            ) : null}
          </div>

          <MobileNav activePath={activePath} roleNames={roleNames} />
        </div>

        <div className="hidden flex-wrap items-center gap-3 lg:flex">
          <Link
            href="/role-select"
            className="rounded-2xl bg-white px-4 py-2 text-sm font-black text-[#101828] shadow-sm transition hover:bg-[#F6F8FB]"
          >
            Switch role
          </Link>

          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
