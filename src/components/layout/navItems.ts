import { type Role, isRole } from "@/lib/auth/roles";

export type NavItem = {
  href: string;
  label: string;
  roles: Role[];
};

export const navItems = [
  { href: "/dashboard", label: "Civilian Dashboard", roles: ["civilian"] },
  { href: "/adherence", label: "Adherence Risk", roles: ["civilian"] },
  { href: "/medications/interactions", label: "Interaction Review", roles: ["civilian"] },
  { href: "/care-circle", label: "Care Circle", roles: ["civilian", "caregiver"] },
  { href: "/offline", label: "Offline Sync", roles: ["civilian"] },
  { href: "/notifications", label: "Notifications", roles: ["civilian", "caregiver", "nurse", "doctor", "pharmacist", "admin"] },
  { href: "/settings", label: "Settings", roles: ["civilian", "caregiver", "nurse", "doctor", "pharmacist", "admin"] },
  { href: "/widgets", label: "Widgets", roles: ["civilian"] },
  { href: "/clinical/patients", label: "Patient Board", roles: ["nurse", "doctor", "admin"] },
  { href: "/clinical/alerts", label: "Alert Center", roles: ["nurse", "doctor", "admin"] },
  { href: "/clinical/clinic", label: "Clinic Queue", roles: ["nurse", "doctor", "admin"] },
  { href: "/clinical/reviews", label: "Review Queue", roles: ["pharmacist", "admin"] },
  { href: "/admin", label: "Admin", roles: ["admin"] },
  { href: "/admin/system", label: "System Overview", roles: ["admin"] },
  { href: "/admin/schema", label: "Schema Health", roles: ["admin"] },
  { href: "/role-select", label: "Switch Role", roles: ["civilian", "caregiver", "nurse", "doctor", "pharmacist", "admin"] },
] satisfies NavItem[];

export function getVisibleNavItems(roleNames: string[]) {
  const validRoles = roleNames.filter((role): role is Role => isRole(role));

  if (validRoles.length === 0) {
    return navItems.filter((item) => ["/settings", "/role-select"].includes(item.href));
  }

  return navItems.filter((item) => item.roles.some((role) => validRoles.includes(role)));
}
