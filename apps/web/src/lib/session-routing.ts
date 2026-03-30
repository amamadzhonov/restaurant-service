import type { AuthSession, UserRole } from "@/lib/types";

type AppRoute = `/${string}`;

export function routeForRole(role: UserRole, tenantSlug?: string | null): AppRoute {
  if (role === "super_admin") {
    return "/platform";
  }
  if (!tenantSlug) {
    return "/";
  }
  if (role === "admin") {
    return `/admin/${tenantSlug}`;
  }
  if (role === "waiter") {
    return `/waiter/${tenantSlug}`;
  }
  return `/kitchen/${tenantSlug}`;
}

export function routeForSession(session: AuthSession): AppRoute {
  return routeForRole(session.user.role, session.tenant?.slug);
}
