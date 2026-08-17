import { getCurrentDeliveryDate, getProjectMonthYear, getProjectStack, statusOf } from "./utils";

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
  return String(project.dateline || "").trim().toLowerCase().includes("order late");
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

function deliveryMonthYear(project) {
  const due = getCurrentDeliveryDate(project);
  if (due) return { month: due.getMonth() + 1, year: due.getFullYear() };
  return getProjectMonthYear(project.date);
}

export function buildAnalytics(projects) {
  const rows = Array.isArray(projects) ? projects : [];
  const delivered = rows.filter((project) => statusOf(project) === "delivered");
  const wip = rows.filter((project) => workflowStatus(project) === "WIP");
  const late = rows.filter(isLate);

  const monthlyMap = new Map();

  rows.forEach((project) => {
    const { month, year } = getProjectMonthYear(project.date);
    if (!month || !year) return;
    const current = ensureMonth(monthlyMap, month, year);
    current.projects += 1;
    current.value += amount(project);
  });

  delivered.forEach((project) => {
    const { month, year } = deliveryMonthYear(project);
    if (!month || !year) return;
    const current = ensureMonth(monthlyMap, month, year);
    current.delivered += 1;
    current.deliveredValue += amount(project);
  });

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
    salesPeople: grouped(rows, (project) => project.salesPerson).sort((a, b) => b.value - a.value),
    lateStacks: grouped(late, getProjectStack).sort((a, b) => b.value - a.value),
    wipStacks: grouped(wip, getProjectStack).sort((a, b) => b.value - a.value),
    lateProjects: late.sort((a, b) => amount(b) - amount(a)),
    wipProjects: wip.sort((a, b) => amount(b) - amount(a)),
  };
}
