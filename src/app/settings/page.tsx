import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{
    message?: string;
    error?: string;
  }>;
};

type ProfileSettings = {
  id: string;
  full_name: string;
  email: string;
  font_size: "default" | "large" | "xl";
  high_contrast: boolean;
};

type NotificationPreferences = {
  reminder_minutes: 15 | 30 | 60;
  reminders_enabled: boolean;
  missed_dose_alerts: boolean;
  caregiver_alerts: boolean;
};

async function getCurrentUser() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

async function updateAccessibilitySettings(formData: FormData) {
  "use server";

  const user = await getCurrentUser();
  const supabase = await createClient();

  const fontSize = String(formData.get("font_size") ?? "default");
  const highContrast = formData.get("high_contrast") === "on";

  if (!["default", "large", "xl"].includes(fontSize)) {
    redirect("/settings?error=Invalid font size selected.");
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      font_size: fontSize,
      high_contrast: highContrast,
    })
    .eq("id", user.id);

  if (error) {
    redirect(`/settings?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/settings");
  redirect("/settings?message=Accessibility settings updated.");
}

async function updateNotificationSettings(formData: FormData) {
  "use server";

  const user = await getCurrentUser();
  const supabase = await createClient();

  const reminderMinutes = Number(formData.get("reminder_minutes"));
  const remindersEnabled = formData.get("reminders_enabled") === "on";
  const missedDoseAlerts = formData.get("missed_dose_alerts") === "on";
  const caregiverAlerts = formData.get("caregiver_alerts") === "on";

  if (![15, 30, 60].includes(reminderMinutes)) {
    redirect("/settings?error=Invalid reminder timing selected.");
  }

  const { error } = await supabase.from("notification_preferences").upsert(
    {
      user_id: user.id,
      reminder_minutes: reminderMinutes,
      reminders_enabled: remindersEnabled,
      missed_dose_alerts: missedDoseAlerts,
      caregiver_alerts: caregiverAlerts,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "user_id",
    }
  );

  if (error) {
    redirect(`/settings?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/settings");
  redirect("/settings?message=Notification preferences updated.");
}

export default async function SettingsPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  const params = searchParams ? await searchParams : {};

  const supabase = await createClient();

  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, email, font_size, high_contrast")
    .eq("id", user.id)
    .single();

  const { data: notificationData, error: notificationError } = await supabase
    .from("notification_preferences")
    .select(
      "reminder_minutes, reminders_enabled, missed_dose_alerts, caregiver_alerts"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  const profile = profileData as ProfileSettings | null;

  const notificationPreferences =
    (notificationData as NotificationPreferences | null) ?? {
      reminder_minutes: 30,
      reminders_enabled: true,
      missed_dose_alerts: true,
      caregiver_alerts: true,
    };

  return (
    <AppShell
      title="Accessibility and Settings"
      subtitle="Manage readability, contrast, reminders, and notification preferences."
      activePath="/settings"
    >
      {params.message ? (
        <Card className="mb-5 border-[#12B76A]/40 bg-[#EAFBF3]">
          <Badge variant="success">Success</Badge>
          <p className="mt-3 text-sm font-bold text-[#101828]">
            {params.message}
          </p>
        </Card>
      ) : null}

      {params.error ? (
        <Card className="mb-5 border-[#FF3F4D]/40 bg-[#FFF6F7]">
          <Badge variant="danger">Error</Badge>
          <p className="mt-3 text-sm font-bold text-[#FF3F4D]">
            {params.error}
          </p>
        </Card>
      ) : null}

      {profileError || notificationError ? (
        <Card className="mb-5">
          <Badge variant="danger">Load warning</Badge>
          <p className="mt-3 text-sm leading-6 text-[#667085]">
            {profileError?.message ?? notificationError?.message}
          </p>
        </Card>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <section className="space-y-5">
          <Card>
            <Badge variant="info">Profile</Badge>
            <h2 className="mt-4 text-2xl font-black">Current account</h2>

            <div className="mt-6 rounded-3xl bg-[#F6F8FB] p-5">
              <p className="text-sm font-black text-[#101828]">
                {profile?.full_name ?? user.email}
              </p>
              <p className="mt-1 text-sm text-[#667085]">
                {profile?.email ?? user.email}
              </p>
            </div>
          </Card>

          <Card>
            <Badge variant="warning">Accessibility</Badge>
            <h2 className="mt-4 text-2xl font-black">
              Readability preferences
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#667085]">
              Adjust the visual presentation for better readability. These
              values are stored in the user profile.
            </p>

            <form action={updateAccessibilitySettings} className="mt-6 space-y-6">
              <fieldset>
                <legend className="text-sm font-black text-[#101828]">
                  Font size
                </legend>

                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  {[
                    {
                      value: "default",
                      label: "Default",
                      description: "Standard text size",
                    },
                    {
                      value: "large",
                      label: "Large",
                      description: "More readable text",
                    },
                    {
                      value: "xl",
                      label: "Extra large",
                      description: "Maximum readability",
                    },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className="rounded-3xl border border-[#E6EAF0] bg-[#F6F8FB] p-5"
                    >
                      <input
                        type="radio"
                        name="font_size"
                        value={option.value}
                        defaultChecked={
                          (profile?.font_size ?? "default") === option.value
                        }
                        className="h-4 w-4"
                      />
                      <span className="ml-2 text-sm font-black">
                        {option.label}
                      </span>
                      <p className="mt-2 text-xs leading-5 text-[#667085]">
                        {option.description}
                      </p>
                    </label>
                  ))}
                </div>
              </fieldset>

              <label className="flex gap-3 rounded-3xl bg-[#F6F8FB] p-5">
                <input
                  type="checkbox"
                  name="high_contrast"
                  defaultChecked={profile?.high_contrast ?? false}
                  className="mt-1 h-5 w-5"
                />
                <span>
                  <span className="block text-sm font-black text-[#101828]">
                    Enable high-contrast mode
                  </span>
                  <span className="mt-1 block text-sm leading-6 text-[#667085]">
                    Increases contrast for better readability and visual
                    accessibility.
                  </span>
                </span>
              </label>

              <button
                type="submit"
                className="rounded-2xl bg-[#FF3F4D] px-5 py-3 text-sm font-black text-white"
              >
                Save accessibility settings
              </button>
            </form>
          </Card>

          <Card>
            <Badge variant="info">Notifications</Badge>
            <h2 className="mt-4 text-2xl font-black">
              Dose reminder preferences
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#667085]">
              Configure when MedAware should remind users before a scheduled
              medication dose.
            </p>

            <form action={updateNotificationSettings} className="mt-6 space-y-6">
              <label className="block">
                <span className="text-sm font-bold text-[#101828]">
                  Reminder timing
                </span>
                <select
                  name="reminder_minutes"
                  defaultValue={notificationPreferences.reminder_minutes}
                  className="mt-2 w-full rounded-2xl border border-[#E6EAF0] bg-[#F6F8FB] px-4 py-3 outline-none focus:border-[#FF3F4D] focus:ring-4 focus:ring-[#FFE8EC]"
                >
                  <option value={15}>15 minutes before dose</option>
                  <option value={30}>30 minutes before dose</option>
                  <option value={60}>1 hour before dose</option>
                </select>
              </label>

              <div className="space-y-3">
                <label className="flex gap-3 rounded-3xl bg-[#F6F8FB] p-5">
                  <input
                    type="checkbox"
                    name="reminders_enabled"
                    defaultChecked={notificationPreferences.reminders_enabled}
                    className="mt-1 h-5 w-5"
                  />
                  <span>
                    <span className="block text-sm font-black text-[#101828]">
                      Enable dose reminders
                    </span>
                    <span className="mt-1 block text-sm leading-6 text-[#667085]">
                      Sends reminders before scheduled medication times.
                    </span>
                  </span>
                </label>

                <label className="flex gap-3 rounded-3xl bg-[#F6F8FB] p-5">
                  <input
                    type="checkbox"
                    name="missed_dose_alerts"
                    defaultChecked={notificationPreferences.missed_dose_alerts}
                    className="mt-1 h-5 w-5"
                  />
                  <span>
                    <span className="block text-sm font-black text-[#101828]">
                      Enable missed-dose alerts
                    </span>
                    <span className="mt-1 block text-sm leading-6 text-[#667085]">
                      Alerts the user when a scheduled dose was not logged.
                    </span>
                  </span>
                </label>

                <label className="flex gap-3 rounded-3xl bg-[#F6F8FB] p-5">
                  <input
                    type="checkbox"
                    name="caregiver_alerts"
                    defaultChecked={notificationPreferences.caregiver_alerts}
                    className="mt-1 h-5 w-5"
                  />
                  <span>
                    <span className="block text-sm font-black text-[#101828]">
                      Enable caregiver alerts
                    </span>
                    <span className="mt-1 block text-sm leading-6 text-[#667085]">
                      Allows care circle members to receive adherence and safety
                      notifications.
                    </span>
                  </span>
                </label>
              </div>

              <button
                type="submit"
                className="rounded-2xl bg-[#FF3F4D] px-5 py-3 text-sm font-black text-white"
              >
                Save notification preferences
              </button>
            </form>
          </Card>
        </section>

        <aside className="space-y-5">
          <Card>
            <Badge variant="success">HCI alignment</Badge>
            <h2 className="mt-4 text-xl font-black">Why this matters</h2>
            <p className="mt-2 text-sm leading-6 text-[#667085]">
              Accessibility settings support flexibility and efficiency of use,
              error prevention, and user control. This is especially important
              for medication systems where readability and clarity affect safety.
            </p>
          </Card>

          <Card>
            <p className="text-sm font-black text-[#FF3F4D]">
              Academic prototype
            </p>
            <p className="mt-2 text-sm leading-6 text-[#667085]">
              Notification and accessibility preferences are stored in Supabase,
              but actual push notifications and native device accessibility
              integrations are future deployment features.
            </p>
          </Card>
        </aside>
      </div>
    </AppShell>
  );
}