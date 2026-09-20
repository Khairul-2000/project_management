import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { getRequestUser } from "./authApiMiddleware.js";
import { isAdminRole } from "./roles.js";
import { listClientProjects, projectNameKey } from "./clientProjectsStore.js";
import { pathnameOf, readJsonBody, sendJson } from "./httpHelpers.js";
import { listUsers } from "./usersStore.js";
import {
  getQuotaStatus,
  checkAndConsumeChat,
  checkAndConsumeWorkTask,
  resetUserQuota,
} from "./agentQuotaStore.js";


const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
dotenv.config({ path: path.join(ROOT, ".env") });

const PROJECTS_PATH = path.resolve(ROOT, "public/data/projects.json");
const DIST_PROJECTS_PATH = path.resolve(ROOT, "dist/data/projects.json");

function readProjects() {
  try {
    const target = fs.existsSync(PROJECTS_PATH) ? PROJECTS_PATH : DIST_PROJECTS_PATH;
    if (!fs.existsSync(target)) return [];
    const raw = fs.readFileSync(target, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("[agent-api] Failed reading projects:", err.message);
    return [];
  }
}

/**
 * Filter projects and client-projects based on user permissions
 */
function getAccessibleData(user) {
  const allProjects = readProjects();
  const allClientProjects = listClientProjects();

  if (isAdminRole(user)) {
    return { projects: allProjects, clientProjects: allClientProjects };
  }

  const allowedPhaseIds = new Set((user.assignedProjectIds || []).map(String));
  const userNameLower = (user.name || "").trim().toLowerCase();
  const userIdStr = String(user.id || "");

  // Match phases
  const userProjects = allProjects.filter((p) => {
    if (allowedPhaseIds.has(String(p.id))) return true;
    if (p.developer && p.developer.toLowerCase().includes(userNameLower)) return true;
    return false;
  });

  // Allowed project keys
  const allowedProjectKeys = new Set(
    userProjects.map((p) => projectNameKey(p.projectName)).filter(Boolean)
  );

  // Match client projects
  const userClientProjects = allClientProjects.filter((cp) => {
    const key = cp.projectNameKey || projectNameKey(cp.projectName);
    if (allowedProjectKeys.has(key)) return true;
    if (cp.supervisor && cp.supervisor.toLowerCase().includes(userNameLower)) return true;
    const isMember = (cp.teamMembers || []).some(
      (m) =>
        String(m.userId || m.id) === userIdStr ||
        (m.name && m.name.toLowerCase().includes(userNameLower))
    );
    return isMember;
  });

  return { projects: userProjects, clientProjects: userClientProjects };
}

/**
 * Extract concise, relevant context for the LLM prompt based on the user's question
 */
function buildRelevantContext(message, user, projects, clientProjects) {
  const q = (message || "").toLowerCase();
  const matchedClientProjects = [];
  const matchedPhases = [];

  // Search for project names mentioned in query
  for (const cp of clientProjects) {
    const name = (cp.projectName || "").toLowerCase();
    if (name && (q.includes(name) || name.includes(q.replace(/[^a-z0-9]/g, "")))) {
      matchedClientProjects.push(cp);
    }
  }

  // Search for team members mentioned in query
  const memberMatches = new Set();
  for (const cp of clientProjects) {
    for (const m of cp.teamMembers || []) {
      const memName = (m.name || "").toLowerCase();
      if (memName && memName.length > 3 && q.includes(memName)) {
        memberMatches.add(cp);
      }
    }
  }
  for (const cp of memberMatches) {
    if (!matchedClientProjects.includes(cp)) {
      matchedClientProjects.push(cp);
    }
  }

  // If specific projects were matched, pull their phases
  if (matchedClientProjects.length > 0) {
    const matchedNames = new Set(matchedClientProjects.map((cp) => projectNameKey(cp.projectName)));
    for (const p of projects) {
      if (matchedNames.has(projectNameKey(p.projectName))) {
        matchedPhases.push(p);
      }
    }
  }

  // Summary counts for general queries
  const statusCounts = {};
  let lateCount = 0;
  for (const p of projects) {
    const st = p.salesStatus || p.teamLeadStatus || p.status || "Unknown";
    statusCounts[st] = (statusCounts[st] || 0) + 1;
    if (String(p.dateline || "").toLowerCase().includes("late")) {
      lateCount++;
    }
  }

  let context = `Current User: ${user.name} (Role: ${user.role})\n`;
  context += `Total accessible client projects: ${clientProjects.length}\n`;
  context += `Total phase entries: ${projects.length} (Late/Overdue: ${lateCount})\n`;
  context += `Status breakdown: ${JSON.stringify(statusCounts)}\n\n`;

  if (matchedClientProjects.length > 0) {
    context += `### MATCHED PROJECT DETAILS:\n`;
    for (const cp of matchedClientProjects.slice(0, 5)) {
      context += `Project: "${cp.projectName}"\n`;
      context += `  - Supervisor: ${cp.supervisor || "Not assigned"}\n`;
      const members = (cp.teamMembers || []).map((m) => `${m.name} (${(m.roles || [m.role || "Member"]).join(", ")})`);
      context += `  - Team Members: ${members.length > 0 ? members.join("; ") : "None specified"}\n`;
      if (cp.notes) context += `  - Notes: ${cp.notes.slice(0, 200)}\n`;

      const phases = matchedPhases.filter((p) => projectNameKey(p.projectName) === projectNameKey(cp.projectName));
      if (phases.length > 0) {
        context += `  - Phases (${phases.length}):\n`;
        for (const ph of phases.slice(0, 6)) {
          context += `    * ${ph.phase || ph.stack || "Phase"}: Status: ${ph.salesStatus || ph.status || "WIP"}, Dateline: ${ph.dateline || "N/A"}, Developer: ${ph.developer || "Unassigned"}\n`;
        }
      }
      context += `\n`;
    }
  } else {
    // If no specific project was named, provide a clean project catalog snippet
    context += `### ACTIVE PROJECTS OVERVIEW (Top 25):\n`;
    for (const cp of clientProjects.slice(0, 25)) {
      const memberCount = (cp.teamMembers || []).length;
      context += `- **${cp.projectName}**: Supervisor: ${cp.supervisor || "None"} | Team size: ${memberCount} members\n`;
    }
    if (clientProjects.length > 25) {
      context += `(and ${clientProjects.length - 25} more projects)\n`;
    }
  }

  return { context, matchedClientProjects };
}

/**
 * Handle agent status check
 */
function handleStatus(res) {
  const apiKey = (process.env.GROQ_API_KEY || process.env.AI_API_KEY || "").trim();
  sendJson(res, 200, {
    ready: Boolean(apiKey),
    provider: "Groq Cloud (Open-Source)",
    model: process.env.AI_MODEL || "llama-3.1-8b-instant",
  });
}

function parseWorkModeOffline(message, user, projects, clientProjects, allUsers) {
  const q = message.trim();
  const lower = q.toLowerCase();

  // 1. Create Project check
  if (lower.includes("create") || lower.includes("new project") || lower.includes("add project")) {
    let projectName = "";
    const nameMatch = q.match(/(?:named|project|called)\s+["']?([^"'\n,]+?)["']?(?:\s+(?:for|with|in|price|stack|supervisor|due)|$)/i);
    if (nameMatch && nameMatch[1]) {
      projectName = nameMatch[1].trim().replace(/^(a|an|the)\s+/i, "");
    }
    if (!projectName) {
      const match2 = q.match(/create\s+(?:a\s+)?(?:new\s+)?project\s+([A-Za-z0-9 _-]+)/i);
      if (match2) projectName = match2[1].trim();
    }
    if (!projectName) projectName = "New Project Phase";

    let price = 450;
    const priceMatch = q.match(/(?:price|\$)\s*[:=]?\s*(\d+)/i) || q.match(/(\d+)\s*(?:usd|\$)/i);
    if (priceMatch) price = Number(priceMatch[1]);

    const profiles = [
      "code_muse_Fiverr", "Web_Chrome_Fiverr", "binary_bards_fiverr",
      "Ui_verse_Fiverr", "SparkFlow_Fiverr", "Web_wafels_Fiverr",
      "App_cake_Fiverr", "ai_nachos_fiverr", "theme_pilot_fiverr"
    ];
    let profile = "code_muse_Fiverr";
    for (const pf of profiles) {
      if (lower.includes(pf.toLowerCase()) || lower.includes(pf.toLowerCase().replace(/_fiverr/g, ""))) {
        profile = pf;
        break;
      }
    }

    const stacks = ["Backend", "Frontend", "App Development", "UI/UX", "Automation", "Deploy", "MERN", "Python", "Fullstack"];
    let stack = "Fullstack";
    for (const st of stacks) {
      if (lower.includes(st.toLowerCase())) {
        stack = st;
        break;
      }
    }

    let supervisor = "";
    const supMatch = q.match(/supervisor\s+[:=]?\s*([A-Za-z]+)/i);
    if (supMatch) {
      supervisor = supMatch[1].trim();
    } else {
      for (const u of allUsers) {
        if (u.name && lower.includes(u.name.toLowerCase())) {
          supervisor = u.name;
          break;
        }
      }
    }

    let dateline = "5 Days";
    const dateMatch = q.match(/(\d+\s*(?:days?|hours?|weeks?))/i);
    if (dateMatch) dateline = dateMatch[1];

    const actionJson = {
      projectName,
      phase: projectName,
      profile,
      price,
      stack,
      supervisor: supervisor || "Khairul",
      dateline,
      shift: lower.includes("night") ? "Night" : "Day"
    };

    return `I've prepared the operational draft for **${projectName}**.\n\nPlease review the configuration below and click confirm to create this project:\n\n\`\`\`action:create_project\n${JSON.stringify(actionJson, null, 2)}\n\`\`\``;
  }

  // 2. Assign Member check
  if (lower.includes("assign") || lower.includes("add member") || lower.includes("assign member")) {
    let memberName = "";
    for (const u of allUsers) {
      if (u.name && lower.includes(u.name.toLowerCase())) {
        memberName = u.name;
        break;
      }
    }
    if (!memberName) {
      const match = q.match(/assign\s+([A-Za-z ]+)\s+to/i);
      if (match) memberName = match[1].trim();
    }
    if (!memberName) memberName = "Pritom Banerjee";

    let targetProject = "";
    for (const cp of clientProjects) {
      if (cp.projectName && lower.includes(cp.projectName.toLowerCase())) {
        targetProject = cp.projectName;
        break;
      }
    }
    if (!targetProject) {
      const matchProj = q.match(/to\s+([A-Za-z0-9 _-]+)/i);
      if (matchProj) targetProject = matchProj[1].trim();
    }
    if (!targetProject) targetProject = clientProjects[0]?.projectName || "Active Project";

    let role = "Developer";
    if (lower.includes("frontend")) role = "Frontend Developer";
    else if (lower.includes("backend")) role = "Backend Developer";
    else if (lower.includes("fullstack") || lower.includes("full stack")) role = "Fullstack Developer";
    else if (lower.includes("supervisor")) role = "Supervisor";
    else if (lower.includes("lead")) role = "Team Lead";
    else if (lower.includes("qa") || lower.includes("tester")) role = "QA Engineer";

    const actionJson = {
      projectName: targetProject,
      memberName,
      role
    };

    return `I've prepared the team assignment for **${memberName}** to **${targetProject}** as **${role}**.\n\nPlease verify and click confirm to apply this change:\n\n\`\`\`action:assign_member\n${JSON.stringify(actionJson, null, 2)}\n\`\`\``;
  }

  // 3. Update Status check
  if (lower.includes("status") || lower.includes("mark") || lower.includes("delivered") || lower.includes("wip")) {
    let status = "WIP";
    if (lower.includes("delivered")) status = "Delivered";
    else if (lower.includes("nra")) status = "NRA";

    let targetProject = "";
    for (const cp of clientProjects) {
      if (cp.projectName && lower.includes(cp.projectName.toLowerCase())) {
        targetProject = cp.projectName;
        break;
      }
    }
    if (!targetProject) targetProject = clientProjects[0]?.projectName || "Project";

    const actionJson = {
      projectName: targetProject,
      status
    };

    return `I've prepared a status update for **${targetProject}** to **${status}**.\n\nClick confirm to apply this update:\n\n\`\`\`action:update_status\n${JSON.stringify(actionJson, null, 2)}\n\`\`\``;
  }

  return `⚡ **Crextio Work Mode Active**\n\nI can execute operational actions for you. Try asking:\n- **Create Project**: *"Create project Nova App for profile code_muse_Fiverr price 500 stack MERN supervisor Khairul"*\n- **Assign Member**: *"Assign Pritom to Nova App as Frontend Developer"*\n- **Update Status**: *"Mark Nova App as Delivered"*`;
}

/**
 * Main chat handler supporting SSE streaming
 */
async function handleChat(req, res) {
  const user = getRequestUser(req);
  if (!user) {
    sendJson(res, 401, { error: "Unauthorized. Please log in first." });
    return;
  }
  if (!isAdminRole(user)) {
    sendJson(res, 403, { error: "Forbidden. The AI Agent is restricted to administrators." });
    return;
  }

  const body = await readJsonBody(req);
  const { message = "", history = [], mode = "chat" } = body;

  if (!message.trim()) {
    sendJson(res, 400, { error: "Message is required." });
    return;
  }

  const { projects, clientProjects } = getAccessibleData(user);
  const { context, matchedClientProjects } = buildRelevantContext(message, user, projects, clientProjects);
  const allUsers = listUsers();

  const apiKey = (process.env.GROQ_API_KEY || process.env.AI_API_KEY || "").trim();
  const baseUrl = (process.env.AI_BASE_URL || "https://api.groq.com/openai/v1").replace(/\/+$/, "");
  const model = process.env.AI_MODEL || "openai/gpt-oss-120b";

  // Enforce quota limits for Work Mode vs Chat Mode
  if (mode === "work") {
    const quotaCheck = checkAndConsumeWorkTask(user, "work_mode_query", message);
    if (!quotaCheck.allowed) {
      res.writeHead(200, {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
      });
      const resetMins = Math.max(1, Math.ceil((quotaCheck.status.work.resetInSeconds || 0) / 60));
      const resetDateStr = quotaCheck.status.work.resetAt
        ? new Date(quotaCheck.status.work.resetAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : "";
      const limitText = `⏳ **Work Mode Quota Reached**\n\nYou have reached the limit of **${quotaCheck.status.work.limit} tasks** per **${quotaCheck.status.windowHours}-hour window**.\n\nNext task will unlock in approx **${resetMins} min**${resetDateStr ? ` (at ~${resetDateStr})` : ""}.\n\n*Tip: You can switch to **Chat Mode** to ask questions about projects and workload.*`;

      res.write(`data: ${JSON.stringify({ content: limitText, quota: quotaCheck.status, limitReached: true })}\n\n`);
      res.write(`data: [DONE]\n\n`);
      res.end();
      return;
    }
  } else {
    const quotaCheck = checkAndConsumeChat(user);
    if (!quotaCheck.allowed) {
      res.writeHead(200, {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
      });
      const resetMins = Math.max(1, Math.ceil((quotaCheck.status.chat.resetInSeconds || 0) / 60));
      const resetDateStr = quotaCheck.status.chat.resetAt
        ? new Date(quotaCheck.status.chat.resetAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : "";
      const limitText = `⏳ **Chat Quota Reached**\n\nYou have used your allowance of **${quotaCheck.status.chat.limit} queries** for this **${quotaCheck.status.windowHours}-hour window**.\n\nNext query slot will unlock in approx **${resetMins} min**${resetDateStr ? ` (at ~${resetDateStr})` : ""}.`;

      res.write(`data: ${JSON.stringify({ content: limitText, quota: quotaCheck.status, limitReached: true })}\n\n`);
      res.write(`data: [DONE]\n\n`);
      res.end();
      return;
    }
  }

  // Prepare SSE Headers
  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
  });

  const sendEvent = (data) => {
    if (res.writableEnded) return;
    res.write(`data: ${typeof data === "string" ? data : JSON.stringify(data)}\n\n`);
  };

  // Broadcast current real-time quota state so frontend updates instantly
  sendEvent({ quota: getQuotaStatus(user) });

  // If no API key configured, use local intelligent parser
  if (!apiKey) {
    if (mode === "work") {
      if (!isAdminRole(user)) {
        sendEvent({
          content: `⚠️ **Admin Permissions Required**\n\nWork Mode actions (creating projects, assigning team members, and updating statuses) require an **admin** or **super_admin** account.`,
        });
      } else {
        const offlineReply = parseWorkModeOffline(message, user, projects, clientProjects, allUsers);
        sendEvent({ content: offlineReply });
      }
    } else {
      let setupNotice = `⚠️ **Groq API Key Not Configured**\n\nTo activate conversational AI responses with blazing-fast Llama 3.1 speeds (free):\n\n`;
      setupNotice += `1. Get a free API key at [console.groq.com](https://console.groq.com)\n`;
      setupNotice += `2. Add \`GROQ_API_KEY=gsk_...\` to your \`.env\` file\n`;
      setupNotice += `3. Restart your dev server (\`npm run dev\`) or production server\n\n`;

      if (matchedClientProjects.length > 0) {
        setupNotice += `---\n### Local Lookup Found:\n`;
        for (const cp of matchedClientProjects) {
          setupNotice += `**Project:** ${cp.projectName}\n`;
          setupNotice += `- **Supervisor:** ${cp.supervisor || "None"}\n`;
          const members = (cp.teamMembers || []).map((m) => `${m.name} (${(m.roles || [m.role]).join(", ")})`);
          setupNotice += `- **Team:** ${members.length ? members.join(", ") : "None"}\n\n`;
        }
      } else {
        setupNotice += `*Currently you have access to **${clientProjects.length}** client projects.*`;
      }
      sendEvent({ content: setupNotice });
    }
    sendEvent("[DONE]");
    res.end();
    return;
  }

  // Construct System Prompt based on Mode
  let systemPrompt = "";
  if (mode === "work") {
    const userNames = allUsers.map((u) => u.name).filter(Boolean);
    const stacksList = ["Backend", "Frontend", "App Development", "UI/UX", "Automation", "Deploy", "Other", "MERN", "Python", "Fullstack"];
    const profilesList = [
      "code_muse_Fiverr", "Web_Chrome_Fiverr", "binary_bards_fiverr",
      "Ui_verse_Fiverr", "SparkFlow_Fiverr", "Web_wafels_Fiverr",
      "App_cake_Fiverr", "ai_nachos_fiverr", "theme_pilot_fiverr"
    ];

    systemPrompt = `You are the Crextio Operations AI Assistant in WORK MODE (Execution & Action Assistant).
Your primary role is to assist managers and administrators with project operations:
1. Creating a new project phase
2. Assigning team members to a project or phase
3. Updating project status, dateline, or lead information

User Role: ${user.role} (Is Admin: ${isAdminRole(user)})

CRITICAL WORK MODE INSTRUCTIONS:
- You are action-oriented. When the user asks you to create a project, assign a member, or update a status, extract the necessary parameters.
- Valid Fiverr Profiles: ${profilesList.join(", ")}
- Valid Stacks / Departments: ${stacksList.join(", ")}
- Registered Team Members: ${userNames.join(", ")}
- Always output a friendly, concise natural language response explaining what you prepared.
- When an action is requested, YOU MUST append a structured action block using this exact code fence:

For creating a project:
\`\`\`action:create_project
{
  "projectName": "Name of the project",
  "phase": "Phase title (defaults to projectName)",
  "profile": "One of the valid profiles",
  "price": 450,
  "stack": "One of the valid stacks",
  "supervisor": "Supervisor name if mentioned",
  "dateline": "5 Days",
  "shift": "Day"
}
\`\`\`

For assigning a member:
\`\`\`action:assign_member
{
  "projectName": "Target project name",
  "memberName": "Team member name",
  "role": "Role (e.g. Frontend Developer, Fullstack Developer, Supervisor)",
  "phase": "Optional phase name"
}
\`\`\`

For updating status or dateline:
\`\`\`action:update_status
{
  "projectName": "Target project name",
  "status": "WIP" | "Delivered" | "NRA",
  "dateline": "Optional new dateline"
}
\`\`\`

Context Data:
${context}`;
  } else {
    systemPrompt = `You are the Delivery Operations AI Assistant for Crextio in CHAT MODE.
Your job is to answer team members and managers about project delivery status, assigned team members, supervisors, deadlines, and project workloads.

Rules:
1. Ground your answers ONLY on the provided project data context below.
2. Be concise, direct, helpful, and polite.
3. If a supervisor or team member is listed, state it clearly.
4. If a project is not in the context or the user doesn't have permission to view it, tell them clearly that you could not find the project in their accessible list.
5. Use clean markdown formatting (bolding, bullet points).
6. Format your answer nicely so it can be quickly scanned.

${context}`;
  }

  // Format messages array
  const formattedHistory = Array.isArray(history)
    ? history.slice(-6).map((h) => ({
        role: h.sender === "user" ? "user" : "assistant",
        content: String(h.text || h.content || ""),
      }))
    : [];

  const messages = [
    { role: "system", content: systemPrompt },
    ...formattedHistory,
    { role: "user", content: message },
  ];

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.2,
        max_tokens: 1024,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[agent-api] Cloud AI API error:", response.status, errText);
      sendEvent({
        content: `❌ Error from AI service (${response.status}): ${errText.slice(0, 300)}`,
      });
      sendEvent("[DONE]");
      res.end();
      return;
    }

    // Stream the tokens
    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (payload === "[DONE]") {
          sendEvent("[DONE]");
          continue;
        }

        try {
          const parsed = JSON.parse(payload);
          const deltaContent = parsed.choices?.[0]?.delta?.content;
          if (deltaContent) {
            sendEvent({ content: deltaContent });
          }
        } catch {
          // Ignore JSON parse error on incomplete chunks
        }
      }
    }

    sendEvent("[DONE]");
    res.end();
  } catch (err) {
    console.error("[agent-api] Error in chat streaming:", err);
    sendEvent({
      content: `❌ Failed to communicate with AI service: ${err.message}`,
    });
    sendEvent("[DONE]");
    res.end();
  }
}

/**
 * Middleware for Vite dev server
 */
export function agentApiMiddleware(req, res, next) {
  const pathname = pathnameOf(req);
  if (!pathname.startsWith("/api/agent/")) {
    if (typeof next === "function") return next();
    return false;
  }

  handle(req, res).catch((err) => {
    console.error("[agent-api-middleware]", err);
    if (!res.headersSent) sendJson(res, 500, { error: err.message || "Agent API error" });
  });
  return true;
}

/**
 * Handler for production server.js
 */
export async function handleAgentApi(req, res) {
  const pathname = pathnameOf(req);
  if (!pathname.startsWith("/api/agent/")) {
    return false;
  }
  await handle(req, res);
  return true;
}

function handleQuota(req, res) {
  const user = getRequestUser(req);
  if (!user) {
    sendJson(res, 401, { error: "Unauthorized. Please log in first." });
    return;
  }
  if (!isAdminRole(user)) {
    sendJson(res, 403, { error: "Forbidden. The AI Agent is restricted to administrators." });
    return;
  }
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  sendJson(res, 200, getQuotaStatus(user));
}


async function handleResetQuota(req, res) {
  const user = getRequestUser(req);
  if (!user || !isAdminRole(user)) {
    sendJson(res, 403, { error: "Forbidden. Admin access required." });
    return;
  }
  const body = await readJsonBody(req);
  const targetUserId = body?.userId || user.id;
  resetUserQuota(targetUserId);
  sendJson(res, 200, { success: true, quota: getQuotaStatus(user) });
}

async function handle(req, res) {
  const pathname = pathnameOf(req);

  if (pathname === "/api/agent/status" && req.method === "GET") {
    handleStatus(res);
    return;
  }

  if (pathname === "/api/agent/quota" && req.method === "GET") {
    handleQuota(req, res);
    return;
  }

  if (pathname === "/api/agent/quota/reset" && req.method === "POST") {
    await handleResetQuota(req, res);
    return;
  }

  if (pathname === "/api/agent/chat" && req.method === "POST") {
    await handleChat(req, res);
    return;
  }

  sendJson(res, 404, { error: "Agent route not found" });
}
