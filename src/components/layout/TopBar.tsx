import Link from "next/link";
import { SignOutButton } from "./SignOutButton";

type TopBarProps = {
  title: string;
  subtitle?: string;
};

export function TopBar({ title, subtitle }: TopBarProps) {
  return (
    <header className="sticky top-0 z-10 border-b border-[#E6EAF0] bg-[#F6F8FB]/90 px-6 py-5 backdrop-blur print:hidden"> 
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#FF3F4D]">
            MedAware
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-[#101828]">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-1 text-sm leading-6 text-[#667085]">{subtitle}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-3">
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