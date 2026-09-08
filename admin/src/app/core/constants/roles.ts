/** Roles allowed to access the BuyMeAShake admin panel. */
export const ADMIN_ROLES = ['admin'] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];

export function isAdminRole(role: string): role is AdminRole {
  return ADMIN_ROLES.includes(role as AdminRole);
}

export function hasAdminAccess(roles: string[]): boolean {
  return roles.some((r) => isAdminRole(String(r).toLowerCase()));
}
