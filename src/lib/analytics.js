import { getFilterMonthYear, getProjectStack, statusOf } from "./utils";

const monthFormatter = new Intl.DateTimeFormat("en-US", { month: "short", year: "2-digit" });

function amount(project) {
  return Number(project.price) || 0;
}

function sum(rows) {
  return rows.reduce((total, project) => total + amount(project), 0);
}

function grouped(rows, key) {
  const map = new Map();
  rows.forEach((row) => {
    const name = key(row) || "Unassigned";
    const current = map.get(name) || { name, projects: 0, value: 0 };
    current.projects += 1;
    current.value += amount(row);
    map.set(name, current);
  });
  return [...map.values()];
}

function workflowStatus(project) {
  const status = String(project.teamLeadStatus || "").trim().toLowerCase();
  if (status === "delivered") return "Delivered";
  if (status === "cancelled" || status === "canceled") return "Cancelled";
  return "WIP";
}

function isLate(project) {
  if (workflowStatus(project) !== "WIP") return false;
  return String(project.dateline || "").trim().toLowerCase().includes("order late");
}

function salesPersonName(project) {
  const name = String(project.salesPerson || "").trim();
  if (!name || /^#?n\/a$/i.test(name)) return "Unassigned";
  return name;
}

function monthKeyFromParts(month, year) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function ensureMonth(map, month, year) {
  const key = monthKeyFromParts(month, year);
  if (!map.has(key)) {
    map.set(key, {
      key,
      date: new Date(year, month - 1, 1),
      projects: 0,
      value: 0,
      delivered: 0,
      deliveredValue: 0,
    });
  }
  return map.get(key);
}

/**
 * Attribute work to the Google Sheet tab month (STA Aug 2026), matching the
 * dashboard calendar filter. Initial Date is often a carry-over from an
 * earlier month, and completed rows rarely have a usable due date.
 */
function analyticsMonthYear(project) {
  return getFilterMonthYear(project);
}

function fillMonthRange(map) {
  if (!map.size) return;
  const keys = [...map.keys()].sort();
  const [minYear, minMonth] = keys[0].split("-").map(Number);
  const [maxYear, maxMonth] = keys[keys.length - 1].split("-").map(Number);
  let year = minYear;
  let month = minMonth;
  while (year < maxYear || (year === maxYear && month <= maxMonth)) {
    ensureMonth(map, month, year);
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
}

export function buildAnalytics(projects) {
  const rows = Array.isArray(projects) ? projects : [];
  const delivered = rows.filter((project) => statusOf(project) === "delivered");
  const wip = rows.filter((project) => workflowStatus(project) === "WIP");
  const late = rows.filter(isLate);

  const monthlyMap = new Map();

  rows.forEach((project) => {
    const { month, year } = analyticsMonthYear(project);
    if (!month || !year) return;
    const current = ensureMonth(monthlyMap, month, year);
    current.projects += 1;
    current.value += amount(project);
  });

  delivered.forEach((project) => {
    const { month, year } = analyticsMonthYear(project);
    if (!month || !year) return;
    const current = ensureMonth(monthlyMap, month, year);
    current.delivered += 1;
    current.deliveredValue += amount(project);
  });

  fillMonthRange(monthlyMap);

  const monthly = [...monthlyMap.values()]
    .sort((a, b) => a.date - b.date)
    .map(({ date, ...row }) => ({ ...row, month: monthFormatter.format(date) }));

  const statuses = ["Delivered", "WIP", "Cancelled"].map((name) => ({
    name,
    value: rows.filter((project) => workflowStatus(project) === name).length,
  }));

  return {
    kpis: {
      total: rows.length,
      totalValue: sum(rows),
      averageValue: rows.length ? sum(rows) / rows.length : 0,
      delivered: delivered.length,
      deliveryRate: rows.length ? Math.round((delivered.length / rows.length) * 100) : 0,
      wipValue: sum(wip),
      lateCount: late.length,
      lateValue: sum(late),
    },
    monthly,
    statuses,
    stacks: grouped(rows, getProjectStack).sort((a, b) => b.value - a.value),
    salesPeople: grouped(rows, salesPersonName).sort((a, b) => b.value - a.value),
    lateStacks: grouped(late, getProjectStack).sort((a, b) => b.value - a.value),
    wipStacks: grouped(wip, getProjectStack).sort((a, b) => b.value - a.value),
    lateProjects: late.sort((a, b) => amount(b) - amount(a)),
    wipProjects: wip.sort((a, b) => amount(b) - amount(a)),
  };
}
