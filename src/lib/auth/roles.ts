export const ROLES = [
  "civilian",
  "caregiver",
  "nurse",
  "doctor",
  "pharmacist",
  "admin",
] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_PRIORITY: Role[] = [
  "admin",
  "doctor",
  "nurse",
  "pharmacist",
  "caregiver",
  "civilian",
];

export const ROLE_LABELS: Record<Role, string> = {
  civilian: "Civilian User",
  caregiver: "Caregiver",
  nurse: "Nurse",
  doctor: "Doctor",
  pharmacist: "Pharmacist",
  admin: "Admin",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  civilian: "Manage personal medications, reminders, adherence, and safety alerts.",
  caregiver: "Support a shared user through care circle medication visibility.",
  nurse: "Monitor assigned patients, medication timing, and clinical alerts.",
  doctor: "Review patients, medication plans, care notes, and discharge guidance.",
  pharmacist: "Review medication safety cases and pharmacist queues.",
  admin: "Manage roles, audit logs, and system overview.",
};

export const LANDING_ROUTE_BY_ROLE: Record<Role, string> = {
  civilian: "/dashboard",
  caregiver: "/care-circle",
  nurse: "/clinical/patients",
  doctor: "/clinical/patients",
  pharmacist: "/clinical/reviews",
  admin: "/admin",
};

export function isRole(value: string): value is Role {
  return ROLES.includes(value as Role);
}

export function getPreferredLandingRoute(roles: Role[]) {
  if (roles.length === 0) return "/login";
  if (roles.length === 1) return LANDING_ROUTE_BY_ROLE[roles[0]];

  return "/role-select";
}

export function getHighestPriorityRole(roles: Role[]): Role | null {
  return ROLE_PRIORITY.find((role) => roles.includes(role)) ?? null;
}

export function getEffectiveRole(
  roles: Role[],
  preferredRole?: string | null
): Role | null {
  if (preferredRole && isRole(preferredRole) && roles.includes(preferredRole)) {
    return preferredRole;
  }

  return getHighestPriorityRole(roles);
}
