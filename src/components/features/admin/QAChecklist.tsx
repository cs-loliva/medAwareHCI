"use client";

import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type ChecklistSection = { id: string; title: string; badge: string; items: string[] };
const CHECKLIST_SECTIONS: ChecklistSection[] = [
  { id: "authentication", title: "Authentication", badge: "A", items: ["Email/password demo login works.", "Google OAuth login works.", "New Google user reaches profile setup.", "Profile setup saves first name and last name.", "New Google user receives civilian role.", "Sign out works on desktop.", "Sign out works on mobile."] },
  { id: "civilian-medication-flow", title: "Civilian medication flow", badge: "B", items: ["Dashboard loads for new Google user.", "Empty dashboard states display correctly.", "Add medication works with recognized drug name.", "Invalid drug name is blocked.", "Invalid dose is blocked.", "Medication appears on dashboard.", "Safety evidence page opens.", "Interaction evidence review opens.", "Edit medication works.", "Archive medication requires confirmation.", "Restore medication requires confirmation."] },
  { id: "care-circle", title: "Care Circle", badge: "C", items: ["Invite caregiver works.", "Permission update works.", "Revoke access works.", "Caregiver shared medication view only opens with access."] },
  { id: "notifications", title: "Notifications", badge: "D", items: ["Notification inbox loads.", "Mark one notification as read works.", "Mark all notifications as read works.", "Empty state works for new users."] },
  { id: "clinical", title: "Clinical workflows", badge: "E", items: ["Nurse dashboard shows assigned patients.", "Doctor dashboard shows assigned patients.", "Patient tracker opens.", "Medication administration confirmation appears.", "Clinical alert detail opens.", "Clinical notes can be added.", "Discharge instructions print layout works."] },
  { id: "pharmacist", title: "Pharmacist workflows", badge: "F", items: ["Pharmacist dashboard title is correct.", "Review queue loads.", "Approve action works.", "Flag unsafe action works.", "Audit log is written."] },
  { id: "admin", title: "Admin workflows", badge: "G", items: ["Admin dashboard loads.", "Role assignment works.", "Last admin cannot be removed.", "Audit logs display.", "System overview loads.", "Schema health page loads.", "Missing schema columns are clearly flagged if any."] },
  { id: "mobile", title: "Mobile responsiveness", badge: "H", items: ["Mobile menu opens.", "Mobile sign out works.", "Dashboard fits iPhone SE width.", "Forms do not horizontally overflow.", "Print layout remains clean."] },
  { id: "deployment", title: "Deployment/environment", badge: "I", items: ["Vercel production URL loads.", "NEXT_PUBLIC_SUPABASE_URL points to the correct Supabase project.", "Supabase Auth Site URL is correct.", "Supabase redirect URLs include localhost and Vercel.", "Medication metadata columns exist in Supabase.", "PostgREST schema cache was reloaded after migrations."] },
];
const VERIFICATION_QUERIES = [
  { label: "Verify medication metadata columns", sql: `select column_name, data_type\nfrom information_schema.columns\nwhere table_schema = 'public'\n  and table_name = 'medications'\n  and column_name in ('rxnorm_code', 'fda_rxcui', 'openfda_generic_name', 'openfda_brand_name')\norder by column_name;` },
  { label: "Reload schema cache", sql: `select pg_notify('pgrst', 'reload schema');` },
  { label: "Check Google-created profiles", sql: `select p.id, p.email, p.full_name, p.created_at\nfrom public.profiles p\njoin auth.users u on u.id = p.id\nwhere u.raw_app_meta_data ->> 'provider' = 'google'\norder by p.created_at desc\nlimit 20;` },
  { label: "Check user roles for a user", sql: `select p.email, r.name as role\nfrom public.profiles p\njoin public.user_roles ur on ur.user_id = p.id\njoin public.roles r on r.id = ur.role_id\nwhere p.email = 'user@example.com'\norder by r.name;` },
  { label: "Check schema health dependency used by /admin/schema", sql: `select *\nfrom public.schema_health_checks\nlimit 50;` },
];
const QUICK_LINKS = ["/dashboard", "/medications/new", "/medications/interactions", "/notifications", "/care-circle", "/clinical/patients", "/clinical/reviews", "/admin", "/admin/system", "/admin/schema"];
const STORAGE_KEY = "medaware-admin-qa-checklist-v1";

export function QAChecklist() {
  const allIds = useMemo(() => CHECKLIST_SECTIONS.flatMap((section) => section.items.map((item) => `${section.id}:${item}`)), []);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try { setCheckedItems(JSON.parse(raw) as Record<string, boolean>); } catch { setCheckedItems({}); }
  }, []);
  useEffect(() => { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(checkedItems)); }, [checkedItems]);
  const checkedCount = allIds.filter((id) => checkedItems[id]).length;

  return <div className="space-y-5"><Card><div className="flex flex-wrap items-center justify-between gap-3"><div><Badge variant="info">Progress</Badge><p className="mt-2 text-sm text-[#667085]">Saved only in this browser via localStorage.</p></div><p className="text-2xl font-black">{checkedCount}/{allIds.length}</p></div></Card><div className="grid gap-5 lg:grid-cols-2">{CHECKLIST_SECTIONS.map((section) => <Card key={section.id}><div className="flex items-center gap-3"><Badge variant="warning">Section {section.badge}</Badge><h2 className="text-xl font-black">{section.title}</h2></div><ul className="mt-4 space-y-3">{section.items.map((item) => { const key = `${section.id}:${item}`; return <li key={key} className="rounded-2xl bg-[#F6F8FB] p-3"><label className="flex items-start gap-3 text-sm text-[#101828]"><input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-[#D0D5DD]" checked={Boolean(checkedItems[key])} onChange={(event) => setCheckedItems((prev) => ({ ...prev, [key]: event.target.checked }))} /><span>{item}</span></label></li>; })}</ul></Card>)}</div><Card><Badge variant="info">Critical Supabase verification queries</Badge><div className="mt-4 space-y-4">{VERIFICATION_QUERIES.map((query) => <div key={query.label} className="rounded-2xl bg-[#F6F8FB] p-4"><p className="text-sm font-black text-[#101828]">{query.label}</p><pre className="mt-2 overflow-x-auto rounded-xl bg-white p-3 text-xs text-[#334155]">{query.sql}</pre></div>)}</div></Card><Card><Badge variant="success">Deployment smoke-test links</Badge><div className="mt-4 flex flex-wrap gap-3">{QUICK_LINKS.map((href) => <Link key={href} href={href} className="rounded-full border border-[#D0D5DD] bg-[#F6F8FB] px-4 py-2 text-sm font-bold text-[#101828] hover:bg-[#EAF3FF]">{href}</Link>)}</div></Card></div>;
}
