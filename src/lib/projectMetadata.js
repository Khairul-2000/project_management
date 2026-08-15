export const PROJECT_ROLES = [
  "Backend Developer",
  "Frontend Developer",
  "App Developer",
  "AI Engineer",
  "UI/UX Designer",
  "DevOps Engineer",
  "QA Engineer",
  "Project Lead",
  "Supervisor",
];

export function normalizeMemberRoles(member) {
  const roles = Array.isArray(member?.roles) ? member.roles : [member?.role];
  return [...new Set(roles.map((role) => String(role || "").trim()).filter(Boolean))];
}

export function normalizeTeamMember(member) {
  const roles = normalizeMemberRoles(member);
  return { ...member, roles, role: roles[0] || "Member" };
}

export function memberRoleLabel(member) {
  return normalizeMemberRoles(member).join(" · ") || "Member";
}

export function mergeMemberRoles(member, roles) {
  const merged = [...new Set([...normalizeMemberRoles(member), ...(roles || [])].map((role) => String(role || "").trim()).filter(Boolean))];
  return { ...member, roles: merged, role: merged[0] || "Member" };
}

export function normalizeNotes(notes) {
  if (Array.isArray(notes)) {
    return notes
      .map((note) => ({ id: String(note?.id || `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`), text: String(note?.text || "").trim(), createdAt: note?.createdAt || "" }))
      .filter((note) => note.text);
  }
  const text = String(notes || "").trim();
  return text ? [{ id: "legacy-note", text, createdAt: "" }] : [];
}

export function createNote(text) {
  return { id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, text: String(text || "").trim(), createdAt: new Date().toISOString() };
}
