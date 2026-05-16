"use client";

import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useMemo, useState } from "react";

type Medication = {
  id: string;
  name: string;
  dose_amount: number;
  dose_unit: string;
};

type OfflineDoseAction = {
  id: string;
  medication_id: string;
  medication_name: string;
  scheduled_at: string;
  status: "taken" | "missed" | "skipped";
  created_at: string;
};

const STORAGE_KEY = "medaware_offline_queue";

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `offline-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function loadQueue(): OfflineDoseAction[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as OfflineDoseAction[]) : [];
  } catch {
    return [];
  }
}

function saveQueue(queue: OfflineDoseAction[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

export default function OfflineSyncPage() {
  const [isOnline, setIsOnline] = useState(true);
  const [queue, setQueue] = useState<OfflineDoseAction[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [selectedMedicationId, setSelectedMedicationId] = useState("");
  const [selectedStatus, setSelectedStatus] =
    useState<OfflineDoseAction["status"]>("taken");
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const selectedMedication = useMemo(
    () =>
      medications.find((medication) => medication.id === selectedMedicationId),
    [medications, selectedMedicationId]
  );

  useEffect(() => {
    setQueue(loadQueue());
    setIsOnline(window.navigator.onLine);

    function handleOnline() {
      setIsOnline(true);
    }

    function handleOffline() {
      setIsOnline(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    async function loadMedications() {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data } = await supabase
        .from("medications")
        .select("id, name, dose_amount, dose_unit")
        .eq("user_id", user.id)
        .neq("status", "inactive")
        .order("created_at", { ascending: true });

      const medicationData = (data ?? []) as Medication[];
      setMedications(medicationData);

      if (medicationData.length > 0) {
        setSelectedMedicationId(medicationData[0].id);
      }
    }

    loadMedications();
  }, []);

  function queueDoseAction() {
    setMessage(null);
    setErrorMessage(null);

    if (!selectedMedication) {
      setErrorMessage("No medication selected.");
      return;
    }

    const action: OfflineDoseAction = {
      id: createId(),
      medication_id: selectedMedication.id,
      medication_name: selectedMedication.name,
      scheduled_at: new Date().toISOString(),
      status: selectedStatus,
      created_at: new Date().toISOString(),
    };

    const nextQueue = [action, ...queue];
    setQueue(nextQueue);
    saveQueue(nextQueue);
    setMessage("Dose action queued locally.");
  }

  function clearQueue() {
    setQueue([]);
    saveQueue([]);
    setMessage("Offline queue cleared.");
    setErrorMessage(null);
  }

  async function syncQueue() {
    setMessage(null);
    setErrorMessage(null);

    if (queue.length === 0) {
      setMessage("There are no queued actions to sync.");
      return;
    }

    if (!window.navigator.onLine) {
      setErrorMessage("You are offline. Reconnect before syncing.");
      return;
    }

    setIsSyncing(true);

    const supabase = createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setIsSyncing(false);
      setErrorMessage("You must be signed in before syncing.");
      return;
    }

    const payload = queue.map((action) => ({
      medication_id: action.medication_id,
      user_id: user.id,
      scheduled_at: action.scheduled_at,
      logged_at:
        action.status === "taken" ? new Date().toISOString() : null,
      status: action.status,
      source: "offline_sync",
      idempotency_key: action.id,
    }));

    const { error } = await supabase.from("medication_logs").insert(payload);

    setIsSyncing(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setQueue([]);
    saveQueue([]);
    setMessage("Offline queue synced successfully to Supabase.");
  }

  return (
    <AppShell
      title="Offline and Sync State"
      subtitle="Queue dose actions locally and sync them when connectivity returns."
      activePath="/offline"
    >
      {message ? (
        <Card className="mb-5 border-[#12B76A]/40 bg-[#EAFBF3]">
          <Badge variant="success">Success</Badge>
          <p className="mt-3 text-sm font-bold text-[#101828]">{message}</p>
        </Card>
      ) : null}

      {errorMessage ? (
        <Card className="mb-5 border-[#FF3F4D]/40 bg-[#FFF6F7]">
          <Badge variant="danger">Error</Badge>
          <p className="mt-3 text-sm font-bold text-[#FF3F4D]">
            {errorMessage}
          </p>
        </Card>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <section className="space-y-5">
          <Card>
            <Badge variant={isOnline ? "success" : "danger"}>
              {isOnline ? "Online" : "Offline"}
            </Badge>

            <h2 className="mt-4 text-2xl font-black">Connectivity status</h2>

            <p className="mt-2 text-sm leading-6 text-[#667085]">
              MedAware detects the browser network state and allows dose actions
              to be queued locally before syncing to Supabase.
            </p>

            <div className="mt-6 rounded-3xl bg-[#F6F8FB] p-5">
              <p className="text-sm font-black text-[#101828]">
                Current state
              </p>
              <p className="mt-2 text-sm leading-6 text-[#667085]">
                {isOnline
                  ? "The app is online. Queued actions can be synced."
                  : "The app is offline. Actions can still be queued locally."}
              </p>
            </div>
          </Card>

          <Card>
            <Badge variant="info">Queue action</Badge>
            <h2 className="mt-4 text-2xl font-black">Log a dose offline</h2>
            <p className="mt-2 text-sm leading-6 text-[#667085]">
              This simulates logging a medication dose while offline. The action
              is stored in local browser storage until synced.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-bold text-[#101828]">
                  Medication
                </span>
                <select
                  value={selectedMedicationId}
                  onChange={(event) =>
                    setSelectedMedicationId(event.target.value)
                  }
                  className="mt-2 w-full rounded-2xl border border-[#E6EAF0] bg-[#F6F8FB] px-4 py-3 outline-none focus:border-[#FF3F4D] focus:ring-4 focus:ring-[#FFE8EC]"
                >
                  {medications.map((medication) => (
                    <option key={medication.id} value={medication.id}>
                      {medication.name} — {medication.dose_amount}{" "}
                      {medication.dose_unit}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-bold text-[#101828]">
                  Dose status
                </span>
                <select
                  value={selectedStatus}
                  onChange={(event) =>
                    setSelectedStatus(
                      event.target.value as OfflineDoseAction["status"]
                    )
                  }
                  className="mt-2 w-full rounded-2xl border border-[#E6EAF0] bg-[#F6F8FB] px-4 py-3 outline-none focus:border-[#FF3F4D] focus:ring-4 focus:ring-[#FFE8EC]"
                >
                  <option value="taken">Taken</option>
                  <option value="missed">Missed</option>
                  <option value="skipped">Skipped</option>
                </select>
              </label>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={queueDoseAction}
                className="rounded-2xl bg-[#FF3F4D] px-5 py-3 text-sm font-black text-white"
              >
                Queue dose action
              </button>

              <button
                type="button"
                onClick={syncQueue}
                disabled={isSyncing}
                className="rounded-2xl bg-[#101828] px-5 py-3 text-sm font-black text-white disabled:opacity-60"
              >
                {isSyncing ? "Syncing..." : "Sync now"}
              </button>

              <button
                type="button"
                onClick={clearQueue}
                className="rounded-2xl bg-[#FFE8EC] px-5 py-3 text-sm font-black text-[#FF3F4D]"
              >
                Clear queue
              </button>
            </div>
          </Card>

          <Card>
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <Badge variant={queue.length > 0 ? "warning" : "success"}>
                  {queue.length} queued
                </Badge>
                <h2 className="mt-4 text-2xl font-black">Offline queue</h2>
                <p className="mt-2 text-sm text-[#667085]">
                  These actions are stored in local browser storage.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {queue.length === 0 ? (
                <div className="rounded-3xl bg-[#F6F8FB] p-5 text-sm text-[#667085]">
                  No actions are currently queued.
                </div>
              ) : (
                queue.map((action) => (
                  <div
                    key={action.id}
                    className="rounded-3xl border border-[#E6EAF0] bg-[#F6F8FB] p-5"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-lg font-black">
                          {action.medication_name}
                        </p>
                        <p className="mt-1 text-sm text-[#667085]">
                          Scheduled: {formatDateTime(action.scheduled_at)}
                        </p>
                      </div>

                      <Badge
                        variant={
                          action.status === "taken"
                            ? "success"
                            : action.status === "missed"
                              ? "danger"
                              : "warning"
                        }
                      >
                        {action.status}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </section>

        <aside className="space-y-5">
          <Card>
            <Badge variant="warning">Sync design</Badge>
            <h2 className="mt-4 text-xl font-black">How this works</h2>
            <p className="mt-2 text-sm leading-6 text-[#667085]">
              This MVP stores offline actions in localStorage and syncs them to
              Supabase medication logs with an idempotency key. This prevents
              duplicate records when syncing the same queued action.
            </p>
          </Card>

          <Card>
            <p className="text-sm font-black text-[#FF3F4D]">
              Academic prototype
            </p>
            <p className="mt-2 text-sm leading-6 text-[#667085]">
              Real offline healthcare workflows require stronger conflict
              resolution, device-level encryption, audit handling, and clinical
              governance.
            </p>
          </Card>
        </aside>
      </div>
    </AppShell>
  );
}