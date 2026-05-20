"use client";

import Link from "next/link";
import { useState } from "react";
import { getVisibleNavItems } from "./navItems";
import { SignOutButton } from "./SignOutButton";

type MobileNavProps = {
  activePath?: string;
  roleNames: string[];
};

export function MobileNav({ activePath, roleNames }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const visibleNavItems = getVisibleNavItems(roleNames);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="rounded-2xl bg-white px-4 py-2 text-sm font-black text-[#101828] shadow-sm"
        aria-expanded={isOpen}
        aria-controls="mobile-navigation"
      >
        {isOpen ? "Close menu" : "Menu"}
      </button>

      {isOpen ? (
        <div
          id="mobile-navigation"
          className="absolute left-4 right-4 top-full z-30 mt-3 rounded-[2rem] border border-[#E6EAF0] bg-white p-4 shadow-xl"
        >
          <div className="grid gap-2">
            {visibleNavItems.map((item) => {
              const isActive = activePath === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`rounded-2xl px-4 py-3 text-sm font-bold transition ${
                    isActive
                      ? "bg-[#FFE8EC] text-[#FF3F4D]"
                      : "text-[#667085] hover:bg-[#F6F8FB] hover:text-[#101828]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>

          <div className="mt-4 border-t border-[#E6EAF0] pt-4">
            <p className="mb-3 text-xs font-black uppercase tracking-wide text-[#667085]">
              Session
            </p>

            <div className="grid gap-2">
              <Link
                href="/role-select"
                onClick={() => setIsOpen(false)}
                className="rounded-2xl bg-[#F6F8FB] px-4 py-3 text-center text-sm font-black text-[#101828]"
              >
                Switch role
              </Link>

              <SignOutButton />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
