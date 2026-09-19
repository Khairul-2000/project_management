/**
 * CSV Import and Export engine for Delivery Ops Console.
 * Allows operations teams to download spreadsheet reports or upload project batches.
 */

import { getProjectStack, normalizePossibility, statusOf } from "./utils";

function escapeCsvCell(value) {
  if (value == null) return '""';
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

export function exportProjectsToCsv(projects, filename = `projects-${new Date().toISOString().slice(0, 10)}.csv`) {
  const headers = [
    "Date",
    "Order ID",
    "Project Name",
    "Phase",
    "Department",
    "Fiverr Profile",
    "Sales Person",
    "Team Name",
    "Price",
    "Dateline",
    "Status",
    "Possible",
    "GitHub URL",
    "GitLab URL",
    "Order URL",
  ];

  const rows = (projects || []).map((p) => [
    escapeCsvCell(p.date || ""),
    escapeCsvCell(p.orderId || ""),
    escapeCsvCell(p.projectName || ""),
    escapeCsvCell(p.phase || ""),
    escapeCsvCell(getProjectStack(p)),
    escapeCsvCell(p.profile || ""),
    escapeCsvCell(p.salesPerson || ""),
    escapeCsvCell(p.teamName || ""),
    escapeCsvCell(p.price || 0),
    escapeCsvCell(p.dateline || ""),
    escapeCsvCell(statusOf(p)),
    escapeCsvCell(normalizePossibility(p.possibility)),
    escapeCsvCell(p.githubUrl || ""),
    escapeCsvCell(p.gitlabUrl || ""),
    escapeCsvCell(p.orderUrl || ""),
  ]);

  const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function parseCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export function parseCsvToProjects(csvString) {
  if (!csvString || typeof csvString !== "string") return [];

  // Split into lines, handle CRLF or LF
  const rawLines = csvString.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (rawLines.length < 2) return [];

  const headerRow = parseCsvLine(rawLines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ""));

  const keyMap = {
    date: ["date", "initialdate", "startdate"],
    orderId: ["orderid", "order", "id"],
    orderUrl: ["orderurl", "fiverrurl", "link"],
    projectName: ["projectname", "project", "clientproject", "title"],
    phase: ["phase", "phasename", "milestone"],
    stack: ["department", "stack", "dept"],
    profile: ["fiverrprofile", "profile", "profilename", "account"],
    salesPerson: ["salesperson", "sales", "seller"],
    teamName: ["teamname", "team", "lead"],
    price: ["price", "usd", "amount", "cost", "value"],
    dateline: ["dateline", "deadline", "deliverytime", "days"],
    teamLeadStatus: ["status", "teamleadstatus", "leadstatus", "state"],
    possibility: ["possible", "possibility"],
    githubUrl: ["github", "githuburl", "ghurl", "repo"],
    gitlabUrl: ["gitlab", "gitlaburl", "glurl"],
  };

  const colIndices = {};
  for (const [targetKey, aliases] of Object.entries(keyMap)) {
    for (const alias of aliases) {
      const idx = headerRow.findIndex((h) => h === alias);
      if (idx !== -1) {
        colIndices[targetKey] = idx;
        break;
      }
    }
  }

  const projects = [];
  for (let i = 1; i < rawLines.length; i++) {
    const row = parseCsvLine(rawLines[i]);
    if (row.length === 0 || (row.length === 1 && !row[0])) continue;

    const getValue = (key) => {
      const idx = colIndices[key];
      return idx != null && idx < row.length ? row[idx] : "";
    };

    const name = getValue("projectName");
    if (!name) continue;

    const rawStatus = getValue("teamLeadStatus").toLowerCase();
    const status = rawStatus.includes("deliv") ? "Delivered" : "WIP";
    const orderId = getValue("orderId");
    const orderUrl = getValue("orderUrl") || (orderId ? `https://www.fiverr.com/orders/${orderId}/activities` : "");

    projects.push({
      id: `p-csv-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
      date: getValue("date") || new Date().toLocaleDateString("en-US"),
      projectName: name,
      phase: getValue("phase") || "Development",
      stack: getValue("stack") || "Other",
      profile: getValue("profile") || "code_muse_Fiverr",
      salesPerson: getValue("salesPerson") || "Direct",
      teamName: getValue("teamName") || "",
      price: Number(getValue("price")) || 0,
      dateline: getValue("dateline") || "In Progress",
      teamLeadStatus: status,
      salesStatus: status,
      possibility: normalizePossibility(getValue("possibility")),
      orderId,
      orderUrl,
      githubUrl: getValue("githubUrl") || "",
      gitlabUrl: getValue("gitlabUrl") || "",
      teamMembers: [],
      notes: "",
      subtasks: [
        { id: "1", text: "Requirements gathering & analysis", completed: false },
        { id: "2", text: "UI/UX Mockup design", completed: false },
        { id: "3", text: "Core API development", completed: false },
        { id: "4", text: "Frontend integration & testing", completed: false },
        { id: "5", text: "Client review & revisions", completed: false },
        { id: "6", text: "Final deployment & delivery", completed: false },
      ],
    });
  }

  return projects;
}
