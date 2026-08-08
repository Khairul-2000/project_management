export function deriveStack(phase) {
  const p = (phase || "").toLowerCase();
  if (p.includes("backend")) return "Backend";
  if (p.includes("frontend")) return "Frontend";
  if (p.includes("ui/ux")) return "UI/UX";
  if (p.includes("automation")) return "Automation";
  if (p.includes("deploy")) return "Deploy";
  return "Other";
}

export function getDeveloperRole(stack) {
  const s = (stack || "").toLowerCase();
  if (s.includes("backend")) return "Backend Developer";
  if (s.includes("frontend")) return "Frontend Developer";
  if (s.includes("ui") || s.includes("ux")) return "UI/UX Designer";
  if (s.includes("automation")) return "QA/Automation Engineer";
  if (s.includes("deploy")) return "DevOps Engineer";
  return "Developer";
}

export function getProjectMonthYear(dateStr) {
  const value = String(dateStr || "").trim();
  if (!value) return { month: null, year: null };

  const slashDate = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slashDate) {
    const year = parseInt(slashDate[3], 10);
    return { month: parseInt(slashDate[1], 10), year: year < 100 ? 2000 + year : year };
  }

  const isoDate = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoDate) return { month: parseInt(isoDate[2], 10), year: parseInt(isoDate[1], 10) };

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return { month: parsed.getMonth() + 1, year: parsed.getFullYear() };

  return { month: null, year: null };
}

export function normalizeProjects(list) {
  if (!Array.isArray(list)) return [];
  return list.map((p) => ({
    ...p,
    stack: p.stack || deriveStack(p.phase),
    teamMembers: p.teamMembers || [
      { id: "m1", name: "Alex Chen", role: "Project Lead" },
      { id: "m2", name: "Elena Rostova", role: "UI/UX Designer" },
    ],
    subtasks: p.subtasks || [
      { id: "1", text: "Requirements gathering & analysis", completed: false },
      { id: "2", text: "UI/UX Mockup design", completed: false },
      { id: "3", text: "Core API development", completed: false },
      { id: "4", text: "Frontend integration & testing", completed: false },
      { id: "5", text: "Client review & revisions", completed: false },
      { id: "6", text: "Final deployment & delivery", completed: false },
    ],
    notes: p.notes || "",
  }));
}

export function extractOrderId(urlOrId) {
  const value = String(urlOrId || "").trim();
  if (!value) return "";
  const match = value.match(/\/orders\/([^/]+)/i);
  return match ? match[1] : value;
}

export function statusOf(p) {
  if (p.salesStatus === "Delivered") return "delivered";
  if ((p.dateline || "").toLowerCase().includes("late")) return "late";
  return "wip";
}

export function fmtMoney(n) {
  return "$" + Number(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}
