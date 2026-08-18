export const ACCOUNT_ROLES = ["member", "admin", "super_admin"];

export function normalizeAccountRole(role) {
  const value = String(role || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  if (value === "super_admin" || value === "superadmin") return "super_admin";
  if (value === "admin") return "admin";
  return "member";
}

export function isSuperAdmin(userOrRole) {
  const role = typeof userOrRole === "object" ? userOrRole?.role : userOrRole;
  return normalizeAccountRole(role) === "super_admin";
}

export function isAdminRole(userOrRole) {
  const role = typeof userOrRole === "object" ? userOrRole?.role : userOrRole;
  const normalized = normalizeAccountRole(role);
  return normalized === "admin" || normalized === "super_admin";
}

export function roleLabel(role) {
  const normalized = normalizeAccountRole(role);
  if (normalized === "super_admin") return "Super admin";
  if (normalized === "admin") return "Admin";
  return "Member";
}
