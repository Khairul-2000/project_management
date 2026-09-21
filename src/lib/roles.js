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

export function isMemberRole(userOrRole) {
  const role = typeof userOrRole === "object" ? userOrRole?.role : userOrRole;
  return normalizeAccountRole(role) === "member";
}

export function roleLabel(role) {
  const normalized = normalizeAccountRole(role);
  if (normalized === "super_admin") return "Super Admin";
  if (normalized === "admin") return "Admin / Team Lead";
  return "Team Member";
}

export function roleBadgeColor(role, colors) {
  const normalized = normalizeAccountRole(role);
  if (normalized === "super_admin") return colors?.late || "#E24B4A";
  if (normalized === "admin") return colors?.wip || "#D9A117";
  return colors?.delivered || "#1F9D63";
}

export function canConnectGoogle(user) {
  return isSuperAdmin(user);
}

export function canSyncGoogle(user) {
  return isAdminRole(user);
}

export function canSyncGoogleSheets(user) {
  return isAdminRole(user);
}

export function canManageAdmins(user) {
  return isSuperAdmin(user);
}

export function canManageUsers(user) {
  return isAdminRole(user);
}

export function canDeleteProjects(user) {
  return isSuperAdmin(user);
}

export function canDeleteUsers(user) {
  return isSuperAdmin(user);
}

export function canCreateProjects(user) {
  return isAdminRole(user);
}

export function canEditProjects(user) {
  return isAdminRole(user);
}

export function canEditPricing(user) {
  return isAdminRole(user);
}

export function canViewFinancials(user) {
  return isAdminRole(user);
}

export function canChangeDeliveryStatus(user) {
  return isAdminRole(user);
}

export const canSignOffMilestones = canChangeDeliveryStatus;

export function canEditSchedule(user) {
  return isAdminRole(user);
}

export const canChangeSchedule = canEditSchedule;
export const canAddNotes = (user) => Boolean(user);

export function canExportFullBackup(user) {
  return isSuperAdmin(user);
}

export function canImportFullBackup(user) {
  return isSuperAdmin(user);
}

export const canRestoreDatabase = canImportFullBackup;

export function canExportCsv(user) {
  return isAdminRole(user);
}

export function canImportCsv(user) {
  return isAdminRole(user);
}

export function canEditChecklists(user) {
  return Boolean(user);
}

export function canEditChecklist(user) {
  return Boolean(user);
}

export function canLinkPhaseRepo(user) {
  return isAdminRole(user);
}

export function canLinkRepos(user) {
  return isAdminRole(user);
}

export function canLinkGlobalRepo(user) {
  return isAdminRole(user);
}
