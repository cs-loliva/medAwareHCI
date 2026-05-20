import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type Notification = {
  id: string;
  title: string;
  body: string | null;
  message: string | null;
  type: string | null;
  href: string | null;
  read_at: string | null;
  created_at: string;
};

function formatDate(iso: string | null) {
  if (!iso) return "—";

  return new Date(iso).toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

async function markNotificationRead(formData: FormData) {
  "use server";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const notificationId = String(formData.get("notificationId") ?? "").trim();

  if (!notificationId) {
    revalidatePath("/notifications");
    redirect("/notifications");
  }

  await supabase
    .from("notifications")
    .update({
      read_at: new Date().toISOString(),
      status: "read",
    })
    .eq("id", notificationId)
    .eq("user_id", user.id);

  revalidatePath("/notifications");
  redirect("/notifications");
}

async function markAllNotificationsRead() {
  "use server";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const readAt = new Date().toISOString();

  await supabase
    .from("notifications")
    .update({
      read_at: readAt,
      status: "read",
    })
    .eq("user_id", user.id)
    .is("read_at", null);

  revalidatePath("/notifications");
}

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data, error } = await supabase
    .from("notifications")
    .select("id, title, body, message, type, href, read_at, created_at")
    .eq("user_id", user.id)
    .order("read_at", { ascending: true, nullsFirst: true })
    .order("created_at", { ascending: false });

  const notifications: Notification[] = (data as Notification[] | null) ?? [];
  const unreadCount = notifications.filter((item) => !item.read_at).length;
  const latestDate = notifications[0]?.created_at ?? null;

  return (
    <AppShell
      title="Notification Inbox"
      subtitle="Review medication reminders, safety updates, care circle activity, and system messages."
    >
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <p className="text-sm text-slate-500">Total notifications</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{notifications.length}</p>
          </Card>
          <Card>
            <p className="text-sm text-slate-500">Unread notifications</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{unreadCount}</p>
          </Card>
          <Card>
            <p className="text-sm text-slate-500">Latest notification date</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{formatDate(latestDate)}</p>
          </Card>
        </div>

        <Card className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-slate-600">
              Notifications are prototype messages only and do not replace professional medical advice or emergency care.
            </p>
            {unreadCount > 0 ? (
              <form action={markAllNotificationsRead}>
                <button
                  type="submit"
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Mark all as read
                </button>
              </form>
            ) : null}
          </div>
          {error ? <p className="text-sm text-rose-700">Unable to load notifications: {error.message}</p> : null}
        </Card>

        {notifications.length === 0 ? (
          <Card>
            <p className="text-sm text-slate-600">
              No notifications yet. Medication reminders, care circle updates, and safety messages will appear here.
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => {
              const isUnread = !notification.read_at;

              return (
                <Card
                  key={notification.id}
                  className={isUnread ? "border-l-4 border-l-blue-500 bg-blue-50/30" : ""}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-slate-900">{notification.title}</h3>
                        {notification.type ? <Badge variant="info">{notification.type}</Badge> : null}
                        <Badge variant={isUnread ? "warning" : "success"}>{isUnread ? "Unread" : "Read"}</Badge>
                      </div>
                      <p className="text-sm text-slate-600">{notification.body ?? notification.message ?? "No details provided."}</p>
                      <p className="text-xs text-slate-500">Created {formatDate(notification.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {notification.href ? (
                        <Link className="text-sm font-medium text-blue-700 hover:underline" href={notification.href}>
                          Open
                        </Link>
                      ) : null}
                      {isUnread ? (
                        <form action={markNotificationRead}>
                          <input type="hidden" name="notificationId" value={notification.id} />
                          <button
                            type="submit"
                            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                          >
                            Mark as read
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
