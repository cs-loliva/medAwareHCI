import Link from "next/link";

type SidebarProps = {
  activePath?: string;
};

const navItems = [
  { href: "/dashboard", label: "Civilian Dashboard" },
  { href: "/adherence", label: "Adherence Risk" },
  { href: "/care-circle", label: "Care Circle" },
  { href: "/offline", label: "Offline Sync" },
  { href: "/settings", label: "Settings" },
  { href: "/widgets", label: "Widgets" },
  { href: "/clinical/patients", label: "Patient Board" },
  { href: "/clinical/clinic", label: "Clinic Queue" },
  { href: "/clinical/alerts", label: "Alert Center" },
  { href: "/clinical/reviews", label: "Review Queue" },
  { href: "/admin", label: "Admin" },
  { href: "/admin/system", label: "System Overview" },
  { href: "/role-select", label: "Switch Role" },
];

export function Sidebar({ activePath }: SidebarProps) {
  return (
    <aside className="hidden min-h-screen w-72 border-r border-[#E6EAF0] bg-white px-5 py-6 lg:block print:hidden">
      <Link href="/" className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FF3F4D] text-lg font-black text-white shadow-sm">
          M+
        </div>

        <div>
          <p className="text-lg font-black text-[#101828]">MedAware</p>
          <p className="text-xs font-semibold text-[#667085]">
            Your health. On time.
          </p>
        </div>
      </Link>

      <nav className="mt-10 space-y-2">
        {navItems.map((item) => {
          const isActive = activePath === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-2xl px-4 py-3 text-sm font-bold transition ${
                isActive
                  ? "bg-[#FFE8EC] text-[#FF3F4D]"
                  : "text-[#667085] hover:bg-[#F6F8FB] hover:text-[#101828]"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-10 rounded-3xl bg-[#FFF6F7] p-4">
        <p className="text-xs font-black uppercase tracking-wide text-[#FF3F4D]">
          Prototype Notice
        </p>
        <p className="mt-2 text-xs leading-5 text-[#667085]">
          Mock medication safety logic only. Not for real clinical use.
        </p>
      </div>
    </aside>
  );
}