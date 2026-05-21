import type { Role } from "./roles";

export const PUBLIC_ROUTES = ["/", "/login", "/unauthorized", "/auth/callback"];

export function isPublicRoute(pathname: string) {
  return PUBLIC_ROUTES.some((route) => pathname === route);
}

export function getRequiredRolesForPath(pathname: string): Role[] {
  if (pathname === "/role-select") {
    return [];
  }

  if (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/medications") ||
    pathname.startsWith("/interactions") ||
    pathname.startsWith("/adherence") ||
    pathname.startsWith("/care-circle") ||
    pathname.startsWith("/offline") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/notifications") ||
    pathname.startsWith("/widgets")
  ) {
    return ["civilian", "caregiver", "admin"];
  }

  if (
    pathname.startsWith("/clinical/patients") ||
    pathname.startsWith("/clinical/alerts")
  ) {
    return ["nurse", "doctor", "pharmacist", "admin"];
  }

  if (pathname.startsWith("/clinical/reviews")) {
    return ["pharmacist", "doctor", "admin"];
  }

  if (pathname.startsWith("/clinical/clinic")) {
    return ["nurse", "doctor", "admin"];
  }

  if (pathname.startsWith("/clinical/discharge")) {
    return ["doctor", "nurse", "admin"];
  }

  if (pathname.startsWith("/admin/schema")) {
    return ["admin"];
  }

  if (pathname.startsWith("/admin")) {
    return ["admin"];
  }

  return [];
}

export function canAccessPath(pathname: string, roles: Role[]) {
  const requiredRoles = getRequiredRolesForPath(pathname);

  if (requiredRoles.length === 0) {
    return true;
  }

  return roles.some((role) => requiredRoles.includes(role));
}