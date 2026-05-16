"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect } from "react";

type ProfileSettings = {
  font_size: "default" | "large" | "xl";
  high_contrast: boolean;
};

export function AccessibilityApplier() {
  useEffect(() => {
    async function applySettings() {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("font_size, high_contrast")
        .eq("id", user.id)
        .single();

      const settings = data as ProfileSettings | null;

      const root = document.documentElement;

      root.classList.remove(
        "medaware-font-default",
        "medaware-font-large",
        "medaware-font-xl",
        "medaware-high-contrast"
      );

      root.classList.add(
        `medaware-font-${settings?.font_size ?? "default"}`
      );

      if (settings?.high_contrast) {
        root.classList.add("medaware-high-contrast");
      }
    }

    applySettings();
  }, []);

  return null;
}