import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { getRequestUser } from "./authApiMiddleware.js";
import { pathnameOf, readJsonBody, sendJson } from "./httpHelpers.js";
import { isSuperAdmin } from "./roles.js";
import { syncAssignmentsFromProjects } from "./usersStore.js";
import { interconnectClientAndPhases } from "./clientProjectsStore.js";
import { DELIVERY_TEMPLATES, getPreSetTemplate } from "./deliveryTemplates.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
dotenv.config({ path: path.join(ROOT, ".env") });

const DB_PATH = path.resolve(ROOT, "public/data/projects.json");
const DIST_DB_PATH = path.resolve(ROOT, "dist/data/projects.json");

function readProjects() {
  const target = fs.existsSync(DB_PATH) ? DB_PATH : DIST_DB_PATH;
  if (!fs.existsSync(target)) return [];
  try {
    const raw = fs.readFileSync(target, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("[delivery-message-api] Failed to read projects:", err.message);
    return [];
  }
}

function writeProjects(projects) {
  const { phases: linked } = interconnectClientAndPhases(projects, { writePhases: false });
  const pretty = JSON.stringify(linked, null, 2) + "\n";
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, pretty, "utf8");
  try {
    fs.mkdirSync(path.dirname(DIST_DB_PATH), { recursive: true });
    fs.writeFileSync(DIST_DB_PATH, pretty, "utf8");
  } catch {
    /* dist may not exist */
  }
  try {
    syncAssignmentsFromProjects(linked);
  } catch (err) {
    console.error("[delivery-message-api] assignment sync failed:", err.message);
  }
}

const AI_DELIVERY_SYSTEM_PROMPT = `You are the Senior Delivery Operations Specialist at Crextio.
Your task is to compose a professional, ready-to-send phase delivery message for a client based on the user's provided inputs:
1. What was done / completed features list
2. Deliverable links (Figma, Google Drive APK/demo, Live Web URLs, Admin Dashboard, etc.)
3. The specific phase style requested (UI/UX, Frontend App, Frontend Web, Backend, etc.)

CORE FORMATTING RULES:
1. Return ONLY the final delivery message text. Do NOT wrap the entire message in markdown backticks (\`\`\`). Do NOT include conversational filler like "Here is your delivery message:" or "Sure, here it is:".
2. Address the client properly (e.g. "Hello [Client Name],\\nHope you are doing well." or "Hello [Client Name],").
3. Clearly state the completion of the phase and project name.
4. Structure the completed features logically:
   - For UI/UX: Group into "App Feature:-" and "Admin Dashboard:-" if applicable.
   - For Frontend App: Group into "User Side:" and "Admin Panel:" if applicable.
   - For Frontend Web: Group into completed panels/roles (e.g. Landing Page, Buyer Panel, Seller Panel, Admin Dashboard).
   - For Backend: Group into core completed backend and integration modules.
5. Include all provided links clearly with descriptive labels.
6. Include relevant discipline instructions:
   - For UI/UX: Include the polite note asking the client to leave messages in the chatbox if any updates are needed rather than pressing the Fiverr revision button, so revisions can be accommodated smoothly.
   - For Mobile App / APK: Mention that the APK and demo video are in the Drive folder and invite them to test on Android.
   - For Frontend Web: Mention that the frontend is ready for review and feedback before proceeding to the next phase.
   - For Backend: Mention testing the integration and preparing for the next phase of deployment.
7. Keep a warm, polite, confident, and professional agency tone with a proper closing (e.g. "Best regards," or "Best regards,\\nDeveloper Team").`;

/**
 * Handle delivery message routes
 */
export async function handleDeliveryMessageApi(req, res) {
  const pathname = pathnameOf(req);
  if (!pathname.startsWith("/api/delivery-message")) {
    return false;
  }

  const user = getRequestUser(req);
  if (!user) {
    sendJson(res, 401, { error: "Unauthorized" });
    return true;
  }

  // GET /api/delivery-message/templates
  if (req.method === "GET" && pathname === "/api/delivery-message/templates") {
    sendJson(res, 200, {
      templates: DELIVERY_TEMPLATES,
    });
    return true;
  }

  // GET /api/delivery-message/phase/:phaseId
  if (req.method === "GET" && pathname.startsWith("/api/delivery-message/phase/")) {
    const phaseId = pathname.replace("/api/delivery-message/phase/", "").trim();
    const projects = readProjects();
    const phase = projects.find((p) => String(p.id) === String(phaseId));
    if (!phase) {
      sendJson(res, 404, { error: "Phase not found" });
      return true;
    }

    sendJson(res, 200, {
      deliveryMessage: phase.deliveryMessage || null,
      deliveryLinks: phase.deliveryLinks || {},
    });
    return true;
  }

  // POST /api/delivery-message/ai-create
  // Strictly limited to 1 time per phase
  if (req.method === "POST" && pathname === "/api/delivery-message/ai-create") {
    const body = await readJsonBody(req);
    const { phaseId, templateId, clientName, projectName, whatDone, links } = body;

    if (!phaseId) {
      sendJson(res, 400, { error: "Phase ID is required" });
      return true;
    }

    const projects = readProjects();
    const phaseIndex = projects.findIndex((p) => String(p.id) === String(phaseId));
    if (phaseIndex === -1) {
      sendJson(res, 404, { error: "Phase not found" });
      return true;
    }

    const phase = projects[phaseIndex];

    // Enforce 1-time AI Magic limit per phase
    if (phase.deliveryMessage?.aiUsed) {
      sendJson(res, 400, {
        error: "AI Magic has already been used for this phase. Each phase is limited to 1 AI generation across the team.",
        deliveryMessage: phase.deliveryMessage,
      });
      return true;
    }

    const apiKey = (process.env.GROQ_API_KEY || process.env.AI_API_KEY || "").trim();
    const baseUrl = (process.env.AI_BASE_URL || "https://api.groq.com/openai/v1").replace(/\/+$/, "");
    const model = process.env.AI_MODEL || "llama-3.1-8b-instant";

    if (!apiKey) {
      sendJson(res, 500, {
        error: "AI API key is not configured on the server. Please set GROQ_API_KEY in the environment or use the pre-set template mode.",
      });
      return true;
    }

    // Build the user prompt
    const chosenTemplate = DELIVERY_TEMPLATES.find((t) => t.id === templateId) || DELIVERY_TEMPLATES[0];
    const userPrompt = `Please write a phase delivery message for:
- Phase Style / Department: ${chosenTemplate.name}
- Phase Name: ${phase.phase || phase.name || "Main Phase"}
- Client Name: ${clientName || phase.projectName || "Client"}
- Project Name: ${projectName || phase.projectName || "Project"}

WHAT WE DONE / COMPLETED WORK:
${whatDone || "Phase completed according to requirements."}

DELIVERABLE LINKS:
${Object.entries(links || {})
  .filter(([_, val]) => Boolean(val && String(val).trim()))
  .map(([k, val]) => `- ${k}: ${val}`)
  .join("\n") || "No links provided yet"}

REFERENCE TEMPLATE STYLE:
${chosenTemplate.template}

Generate the final ready-to-send delivery message following the style of the reference template.`;

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: AI_DELIVERY_SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.3,
          max_tokens: 1500,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("[delivery-message-api] AI service error:", response.status, errText);
        sendJson(res, 502, {
          error: `AI service error (${response.status}): ${errText.slice(0, 200)}`,
        });
        return true;
      }

      const data = await response.json();
      let generatedMessage = data?.choices?.[0]?.message?.content || "";
      // Strip any accidental outer backtick blocks if present
      generatedMessage = generatedMessage.replace(/^```[a-z]*\n([\s\S]*?)\n```$/i, "$1").trim();

      // Record 1-time usage on the phase
      const deliveryMessageData = {
        aiUsed: true,
        aiUsedAt: new Date().toISOString(),
        aiUsedBy: user.name || user.username || user.email || "Team Member",
        aiUserId: user.id || null,
        message: generatedMessage,
        whatDone: whatDone || "",
        templateId: templateId || chosenTemplate.id,
      };

      const updatedPhase = {
        ...phase,
        deliveryMessage: deliveryMessageData,
        deliveryLinks: {
          ...(phase.deliveryLinks || {}),
          ...(links || {}),
        },
      };

      projects[phaseIndex] = updatedPhase;
      writeProjects(projects);

      sendJson(res, 200, {
        ok: true,
        message: generatedMessage,
        deliveryMessage: updatedPhase.deliveryMessage,
        deliveryLinks: updatedPhase.deliveryLinks,
      });
      return true;
    } catch (err) {
      console.error("[delivery-message-api] AI request failed:", err);
      sendJson(res, 500, { error: `Failed to generate delivery message: ${err.message}` });
      return true;
    }
  }

  // POST /api/delivery-message/save
  // Save manually edited message or updated links without consuming AI
  if (req.method === "POST" && pathname === "/api/delivery-message/save") {
    const body = await readJsonBody(req);
    const { phaseId, message, links, whatDone, templateId } = body;

    if (!phaseId) {
      sendJson(res, 400, { error: "Phase ID is required" });
      return true;
    }

    const projects = readProjects();
    const phaseIndex = projects.findIndex((p) => String(p.id) === String(phaseId));
    if (phaseIndex === -1) {
      sendJson(res, 404, { error: "Phase not found" });
      return true;
    }

    const phase = projects[phaseIndex];
    const prevDeliveryMessage = phase.deliveryMessage || {};

    const updatedPhase = {
      ...phase,
      deliveryMessage: {
        ...prevDeliveryMessage,
        message: message != null ? message : prevDeliveryMessage.message,
        whatDone: whatDone != null ? whatDone : prevDeliveryMessage.whatDone,
        templateId: templateId || prevDeliveryMessage.templateId,
        updatedAt: new Date().toISOString(),
        updatedBy: user.name || user.username || "Team Member",
      },
      deliveryLinks: {
        ...(phase.deliveryLinks || {}),
        ...(links || {}),
      },
    };

    projects[phaseIndex] = updatedPhase;
    writeProjects(projects);

    sendJson(res, 200, {
      ok: true,
      deliveryMessage: updatedPhase.deliveryMessage,
      deliveryLinks: updatedPhase.deliveryLinks,
    });
    return true;
  }

  // POST /api/delivery-message/reset-ai (Super Admin only)
  if (req.method === "POST" && pathname === "/api/delivery-message/reset-ai") {
    if (!isSuperAdmin(user)) {
      sendJson(res, 403, { error: "Only Super Admin can reset AI Magic usage for a phase" });
      return true;
    }

    const body = await readJsonBody(req);
    const { phaseId } = body;

    if (!phaseId) {
      sendJson(res, 400, { error: "Phase ID is required" });
      return true;
    }

    const projects = readProjects();
    const phaseIndex = projects.findIndex((p) => String(p.id) === String(phaseId));
    if (phaseIndex === -1) {
      sendJson(res, 404, { error: "Phase not found" });
      return true;
    }

    const phase = projects[phaseIndex];
    const updatedPhase = {
      ...phase,
      deliveryMessage: {
        ...(phase.deliveryMessage || {}),
        aiUsed: false,
        aiResetAt: new Date().toISOString(),
        aiResetBy: user.name || user.username || "Super Admin",
      },
    };

    projects[phaseIndex] = updatedPhase;
    writeProjects(projects);

    sendJson(res, 200, {
      ok: true,
      message: "AI Magic has been reset for this phase.",
      deliveryMessage: updatedPhase.deliveryMessage,
    });
    return true;
  }

  sendJson(res, 405, { error: "Method Not Allowed" });
  return true;
}

/**
 * Connect/Express middleware wrapper for Vite dev server
 */
export function deliveryMessageApiMiddleware(req, res, next) {
  const pathname = pathnameOf(req);
  if (!pathname.startsWith("/api/delivery-message")) {
    if (typeof next === "function") return next();
    return false;
  }

  const handled = handleDeliveryMessageApi(req, res).catch((err) => {
    console.error("[delivery-message-api-middleware]", err);
    if (!res.headersSent) sendJson(res, 500, { error: err.message || "Delivery Message API error" });
  });

  return handled.then(() => true);
}
