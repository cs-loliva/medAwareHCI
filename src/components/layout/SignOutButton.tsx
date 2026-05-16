"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();

    document.cookie =
      "medaware_active_role=; path=/; max-age=0; samesite=lax";

    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="rounded-2xl bg-[#FFE8EC] px-4 py-2 text-sm font-black text-[#FF3F4D] transition hover:bg-[#FFD6DD] focus:outline-none focus:ring-4 focus:ring-[#FFE8EC]"
    >
      Sign out
    </button>
  );
}