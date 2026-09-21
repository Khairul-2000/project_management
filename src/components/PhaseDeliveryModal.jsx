import { useState, useEffect, useMemo } from "react";
import {
  X,
  Copy,
  Check,
  Sparkles,
  ExternalLink,
  RotateCcw,
  CheckCircle2,
  FileText,
  AlertTriangle,
  Send,
  Download,
  Info,
} from "lucide-react";
import { useTheme } from "../lib/theme";
import { STACK_COLOR } from "../lib/constants";
import { getProjectStack } from "../lib/utils";
import { isSuperAdmin } from "../lib/roles";

function cleanClientName(name) {
  if (!name) return "";
  const raw = String(name).replace(/^cp-/, "").replace(/[-_]+/g, " ").trim();
  return raw
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function PhaseDeliveryModal({
  phase,
  onClose,
  onUpdatePhase,
  currentUser = null,
}) {
  const { colors, card, isDark } = useTheme();
  const stack = getProjectStack(phase);
  const stackColor = STACK_COLOR[stack] || colors.accent;

  const [activeTab, setActiveTab] = useState("template"); // "template" | "ai"
  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  // Template Tab state
  const [selectedTemplateId, setSelectedTemplateId] = useState("ui-ux");
  const [templateCopied, setTemplateCopied] = useState(false);

  // AI Magic Tab state
  const [clientName, setClientName] = useState(() => cleanClientName(phase?.projectName));
  const [projectName, setProjectName] = useState(() => phase?.projectName || "App");
  const [whatDone, setWhatDone] = useState("");
  const [links, setLinks] = useState(() => ({
    figmaUrl: phase?.deliveryLinks?.figmaUrl || "",
    driveUrl: phase?.deliveryLinks?.driveUrl || "",
    adminUrl: phase?.deliveryLinks?.adminUrl || "",
    landingUrl: phase?.deliveryLinks?.landingUrl || "",
    buyerUrl: phase?.deliveryLinks?.buyerUrl || "",
    sellerUrl: phase?.deliveryLinks?.sellerUrl || "",
    apiDocUrl: phase?.deliveryLinks?.apiDocUrl || "",
    liveUrl: phase?.deliveryLinks?.liveUrl || "",
    ...(phase?.deliveryLinks || {}),
  }));

  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState("");
  const [messageDraft, setMessageDraft] = useState(() => phase?.deliveryMessage?.message || "");
  const [messageCopied, setMessageCopied] = useState(false);
  const [savingMessage, setSavingMessage] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [resettingAi, setResettingAi] = useState(false);

  const deliveryMessage = phase?.deliveryMessage || null;
  const isAiUsed = Boolean(deliveryMessage?.aiUsed);
  const canResetAi = isSuperAdmin(currentUser);

  // Load backend templates
  useEffect(() => {
    let mounted = true;
    async function fetchTemplates() {
      try {
        const res = await fetch("/api/delivery-message/templates");
        if (res.ok) {
          const data = await res.json();
          if (mounted && Array.isArray(data.templates)) {
            setTemplates(data.templates);
            // Detect default template based on phase
            const s = String(stack).toLowerCase();
            const p = String(phase?.phase || phase?.name || "").toLowerCase();
            let defaultId = "general";
            if (s.includes("ui") || s.includes("ux") || p.includes("ui") || p.includes("figma")) {
              defaultId = "ui-ux";
            } else if (s.includes("app") || p.includes("mobile") || p.includes("apk")) {
              defaultId = "frontend-app";
            } else if (s.includes("backend") || p.includes("backend") || p.includes("api")) {
              defaultId = "backend";
            } else if (s.includes("frontend") || p.includes("frontend") || p.includes("web")) {
              defaultId = "frontend-web";
            }
            setSelectedTemplateId(defaultId);
          }
        }
      } catch (err) {
        console.error("Failed to load delivery templates:", err);
      } finally {
        if (mounted) setLoadingTemplates(false);
      }
    }
    fetchTemplates();
    return () => {
      mounted = false;
    };
  }, [stack, phase]);

  // Update draft when phase changes
  useEffect(() => {
    if (phase?.deliveryMessage?.message) {
      setMessageDraft(phase.deliveryMessage.message);
    }
  }, [phase?.deliveryMessage?.message]);

  const activeTemplate = useMemo(() => {
    return (
      templates.find((t) => t.id === selectedTemplateId) ||
      templates[0] || {
        id: "ui-ux",
        name: "UI/UX",
        template: "Loading template...",
        requiredLinks: [],
      }
    );
  }, [templates, selectedTemplateId]);

  // Copy template text
  const handleCopyTemplate = async () => {
    try {
      await navigator.clipboard.writeText(activeTemplate.template);
      setTemplateCopied(true);
      setTimeout(() => setTemplateCopied(false), 2500);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // Copy finished AI / edited message
  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(messageDraft);
      setMessageCopied(true);
      setTimeout(() => setMessageCopied(false), 2500);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // Import completed subtasks from phase into whatDone
  const handleImportMilestones = () => {
    const subtasks = Array.isArray(phase?.subtasks) ? phase.subtasks : [];
    if (!subtasks.length) {
      setWhatDone("No milestones recorded on this phase yet.");
      return;
    }
    const completedOnly = subtasks.filter((s) => s.completed);
    const toImport = completedOnly.length > 0 ? completedOnly : subtasks;
    const formatted = toImport.map((s) => `- ${s.text}`).join("\n");
    setWhatDone(formatted);
  };

  // Trigger AI Magic Creation (1-time only)
  const handleCreateAiMessage = async () => {
    if (isAiUsed) {
      setAiError("AI Magic has already been used for this phase.");
      return;
    }
    setAiGenerating(true);
    setAiError("");

    try {
      const res = await fetch("/api/delivery-message/ai-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phaseId: phase.id,
          templateId: selectedTemplateId,
          clientName: clientName.trim(),
          projectName: projectName.trim(),
          whatDone: whatDone.trim(),
          links,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate delivery message.");
      }

      setMessageDraft(data.message || "");
      if (typeof onUpdatePhase === "function") {
        onUpdatePhase({
          ...phase,
          deliveryMessage: data.deliveryMessage,
          deliveryLinks: data.deliveryLinks,
        });
      }
    } catch (err) {
      setAiError(err.message || "Error generating message");
    } finally {
      setAiGenerating(false);
    }
  };

  // Save edits or updated links without re-running AI
  const handleSaveEdits = async () => {
    setSavingMessage(true);
    try {
      const res = await fetch("/api/delivery-message/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phaseId: phase.id,
          message: messageDraft,
          links,
          whatDone,
          templateId: selectedTemplateId,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
        if (typeof onUpdatePhase === "function") {
          onUpdatePhase({
            ...phase,
            deliveryMessage: data.deliveryMessage,
            deliveryLinks: data.deliveryLinks,
          });
        }
      }
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setSavingMessage(false);
    }
  };

  // Super Admin reset
  const handleResetAi = async () => {
    if (!window.confirm("Are you sure you want to reset the 1-time AI Magic limit for this phase?")) {
      return;
    }
    setResettingAi(true);
    try {
      const res = await fetch("/api/delivery-message/reset-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phaseId: phase.id }),
      });
      const data = await res.json();
      if (res.ok) {
        if (typeof onUpdatePhase === "function") {
          onUpdatePhase({
            ...phase,
            deliveryMessage: data.deliveryMessage,
          });
        }
      }
    } catch (err) {
      console.error("Reset error:", err);
    } finally {
      setResettingAi(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(10, 13, 20, 0.75)",
        backdropFilter: "blur(4px)",
        display: "grid",
        placeItems: "center",
        zIndex: 100,
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          ...card,
          width: "min(880px, 100%)",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          padding: 0,
          boxShadow: "0 24px 48px rgba(0,0,0,0.4)",
          border: `1px solid ${colors.border}`,
        }}
      >
        {/* HEADER */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 22px",
            borderBottom: `1px solid ${colors.border}`,
            background: colors.panel,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: stackColor + "22",
                color: stackColor,
                display: "grid",
                placeItems: "center",
              }}
            >
              <FileText size={20} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h2 className="disp" style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>
                  Phase Delivery Message
                </h2>
                <span
                  style={{
                    background: stackColor + "22",
                    color: stackColor,
                    borderRadius: 6,
                    padding: "2px 8px",
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                  }}
                >
                  {stack}
                </span>
                {isAiUsed ? (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      background: colors.delivered + "22",
                      color: colors.delivered,
                      border: `1px solid ${colors.delivered}44`,
                      borderRadius: 99,
                      padding: "2px 9px",
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    <CheckCircle2 size={12} /> AI Magic: Used (1/1)
                  </span>
                ) : (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      background: colors.accent + "22",
                      color: colors.accent,
                      border: `1px solid ${colors.accent}44`,
                      borderRadius: 99,
                      padding: "2px 9px",
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    <Sparkles size={12} /> AI Magic: Available (1 Use)
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12.5, color: colors.muted, marginTop: 2 }}>
                {phase.projectName} · {phase.phase || "Main Phase"}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: colors.panel2,
              border: `1px solid ${colors.border}`,
              borderRadius: 8,
              color: colors.muted,
              width: 32,
              height: 32,
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* TABS NAVIGATION */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "0 22px",
            borderBottom: `1px solid ${colors.border}`,
            background: colors.panel2,
            gap: 12,
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab("template")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "12px 14px",
              background: "transparent",
              border: "none",
              borderBottom: activeTab === "template" ? `2px solid ${colors.accent}` : "2px solid transparent",
              color: activeTab === "template" ? colors.text : colors.muted,
              fontSize: 13.5,
              fontWeight: activeTab === "template" ? 750 : 550,
              cursor: "pointer",
            }}
          >
            <Copy size={15} />
            📋 Copy Template
            <span
              style={{
                fontSize: 10.5,
                background: colors.panel,
                padding: "1px 6px",
                borderRadius: 99,
                color: colors.muted,
              }}
            >
              Unlimited
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("ai")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "12px 14px",
              background: "transparent",
              border: "none",
              borderBottom: activeTab === "ai" ? `2px solid ${colors.accent}` : "2px solid transparent",
              color: activeTab === "ai" ? colors.accent : colors.muted,
              fontSize: 13.5,
              fontWeight: activeTab === "ai" ? 750 : 550,
              cursor: "pointer",
            }}
          >
            <Sparkles size={15} />
            ✨ AI Magic Creation
            <span
              style={{
                fontSize: 10.5,
                background: isAiUsed ? colors.delivered + "22" : colors.accent + "22",
                color: isAiUsed ? colors.delivered : colors.accent,
                padding: "1px 6px",
                borderRadius: 99,
                fontWeight: 700,
              }}
            >
              {isAiUsed ? "Used (1/1)" : "1-Time Limit"}
            </span>
          </button>
        </div>

        {/* BODY CONTENT */}
        <div style={{ flex: 1, overflowY: "auto", padding: 22 }}>
          {/* ======================================================== */}
          {/* TAB 1: COPY TEMPLATE (UNLIMITED) */}
          {/* ======================================================== */}
          {activeTab === "template" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Discipline Selector */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: colors.muted, textTransform: "uppercase" }}>
                    Select Discipline Style
                  </label>
                  <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                    {templates.map((t) => {
                      const isSelected = t.id === selectedTemplateId;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setSelectedTemplateId(t.id)}
                          style={{
                            padding: "6px 12px",
                            borderRadius: 8,
                            fontSize: 12.5,
                            fontWeight: isSelected ? 700 : 500,
                            background: isSelected ? colors.accent : colors.panel2,
                            color: isSelected ? colors.onAccent : colors.text,
                            border: `1px solid ${isSelected ? colors.accent : colors.border}`,
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                          }}
                        >
                          {t.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCopyTemplate}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "9px 16px",
                    borderRadius: 8,
                    background: templateCopied ? colors.delivered : colors.panel2,
                    color: templateCopied ? "#fff" : colors.text,
                    border: `1px solid ${templateCopied ? colors.delivered : colors.border}`,
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                >
                  {templateCopied ? <Check size={16} /> : <Copy size={16} />}
                  {templateCopied ? "Copied to Clipboard!" : "Copy Template"}
                </button>
              </div>

              {/* Template Description Banner */}
              <div
                style={{
                  background: colors.panel2,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 10,
                  padding: "10px 14px",
                  fontSize: 12.5,
                  color: colors.muted,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Info size={16} style={{ color: colors.accent, flexShrink: 0 }} />
                <span>
                  <strong>{activeTemplate.name}</strong>: {activeTemplate.description} You can copy and use this
                  standard template as many times as you like.
                </span>
              </div>

              {/* Template Text Display */}
              <div
                style={{
                  background: colors.panel2,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 12,
                  padding: 16,
                  fontFamily: "monospace, Courier, monospace",
                  fontSize: 13,
                  lineHeight: 1.6,
                  color: colors.text,
                  whiteSpace: "pre-wrap",
                  userSelect: "text",
                  maxHeight: 400,
                  overflowY: "auto",
                }}
              >
                {activeTemplate.template}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: AI MAGIC CREATION (1-TIME PER PHASE) */}
          {/* ======================================================== */}
          {activeTab === "ai" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {/* CASE 1: AI MAGIC ALREADY USED */}
              {isAiUsed ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div
                    style={{
                      background: colors.delivered + "15",
                      border: `1px solid ${colors.delivered}44`,
                      borderRadius: 12,
                      padding: "14px 18px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: 12,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <CheckCircle2 size={22} style={{ color: colors.delivered, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 750, color: colors.text }}>
                          AI Magic Delivery Message Created
                        </div>
                        <div style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>
                          Generated by <strong>{deliveryMessage.aiUsedBy || "Team Member"}</strong> on{" "}
                          {deliveryMessage.aiUsedAt
                            ? new Date(deliveryMessage.aiUsedAt).toLocaleString()
                            : "record"}
                          . (1 of 1 AI generation limit reached for this phase).
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <button
                        type="button"
                        onClick={handleCopyMessage}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "8px 14px",
                          borderRadius: 8,
                          background: messageCopied ? colors.delivered : colors.accent,
                          color: colors.onAccent,
                          border: "none",
                          fontWeight: 700,
                          fontSize: 12.5,
                          cursor: "pointer",
                        }}
                      >
                        {messageCopied ? <Check size={14} /> : <Copy size={14} />}
                        {messageCopied ? "Copied!" : "Copy Message"}
                      </button>

                      {canResetAi && (
                        <button
                          type="button"
                          onClick={handleResetAi}
                          disabled={resettingAi}
                          title="Super Admin override to allow regenerating"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            padding: "8px 12px",
                            borderRadius: 8,
                            background: colors.panel2,
                            color: colors.muted,
                            border: `1px solid ${colors.border}`,
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          <RotateCcw size={13} /> {resettingAi ? "Resetting..." : "Reset AI Limit"}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Message editor / review */}
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 6,
                      }}
                    >
                      <label style={{ fontSize: 12, fontWeight: 700, color: colors.muted, textTransform: "uppercase" }}>
                        Delivery Message Text (Ready to send or tweak)
                      </label>
                      {saveSuccess && (
                        <span style={{ fontSize: 12, color: colors.delivered, fontWeight: 700 }}>
                          ✓ Changes saved to phase
                        </span>
                      )}
                    </div>
                    <textarea
                      value={messageDraft}
                      onChange={(e) => setMessageDraft(e.target.value)}
                      rows={14}
                      style={{
                        width: "100%",
                        boxSizing: "border-box",
                        background: colors.panel2,
                        border: `1px solid ${colors.border}`,
                        borderRadius: 10,
                        padding: 14,
                        color: colors.text,
                        fontFamily: "monospace, Courier, monospace",
                        fontSize: 13,
                        lineHeight: 1.6,
                        resize: "vertical",
                      }}
                    />
                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                      <button
                        type="button"
                        onClick={handleSaveEdits}
                        disabled={savingMessage}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "8px 14px",
                          borderRadius: 8,
                          background: colors.panel2,
                          color: colors.text,
                          border: `1px solid ${colors.border}`,
                          fontWeight: 700,
                          fontSize: 12.5,
                          cursor: "pointer",
                        }}
                      >
                        {savingMessage ? "Saving..." : "Save Text Edits"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* CASE 2: AI MAGIC AVAILABLE TO USE */
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {/* Alert banner explaining the 1-time limit */}
                  <div
                    style={{
                      background: colors.accent + "18",
                      border: `1px solid ${colors.accent}40`,
                      borderRadius: 12,
                      padding: "12px 16px",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 12,
                    }}
                  >
                    <Sparkles size={20} style={{ color: colors.accent, marginTop: 2, flexShrink: 0 }} />
                    <div style={{ fontSize: 13, color: colors.text, lineHeight: 1.5 }}>
                      <strong>AI Magic Creation (1-Time Access Per Phase)</strong>
                      <br />
                      <span style={{ color: colors.muted }}>
                        Provide <strong>what you completed</strong> and <strong>deliverable links</strong>. AI will
                        format and compose a finished, client-ready delivery message matching Crextio's delivery standards.
                        This can only be generated <strong>once</strong> for this phase.
                      </span>
                    </div>
                  </div>

                  {aiError && (
                    <div
                      style={{
                        background: colors.late + "18",
                        border: `1px solid ${colors.late}40`,
                        borderRadius: 10,
                        padding: "10px 14px",
                        color: colors.late,
                        fontSize: 13,
                      }}
                    >
                      {aiError}
                    </div>
                  )}

                  {/* Form fields */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 700, color: colors.muted, display: "block", marginBottom: 4 }}>
                        Client Name
                      </label>
                      <input
                        type="text"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        placeholder="e.g. Lexi Comb"
                        style={{
                          width: "100%",
                          boxSizing: "border-box",
                          background: colors.panel2,
                          border: `1px solid ${colors.border}`,
                          borderRadius: 8,
                          padding: "8px 10px",
                          color: colors.text,
                          fontSize: 13,
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: 12, fontWeight: 700, color: colors.muted, display: "block", marginBottom: 4 }}>
                        Project Title / App Name
                      </label>
                      <input
                        type="text"
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        placeholder="e.g. Fitness App"
                        style={{
                          width: "100%",
                          boxSizing: "border-box",
                          background: colors.panel2,
                          border: `1px solid ${colors.border}`,
                          borderRadius: 8,
                          padding: "8px 10px",
                          color: colors.text,
                          fontSize: 13,
                        }}
                      />
                    </div>
                  </div>

                  {/* Discipline Style */}
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: colors.muted, display: "block", marginBottom: 6 }}>
                      Target Discipline Style
                    </label>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {templates.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setSelectedTemplateId(t.id)}
                          style={{
                            padding: "6px 12px",
                            borderRadius: 8,
                            fontSize: 12,
                            fontWeight: selectedTemplateId === t.id ? 700 : 500,
                            background: selectedTemplateId === t.id ? colors.accent : colors.panel2,
                            color: selectedTemplateId === t.id ? colors.onAccent : colors.text,
                            border: `1px solid ${selectedTemplateId === t.id ? colors.accent : colors.border}`,
                            cursor: "pointer",
                          }}
                        >
                          {t.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Links to Share */}
                  <div
                    style={{
                      background: colors.panel2,
                      border: `1px solid ${colors.border}`,
                      borderRadius: 12,
                      padding: 14,
                    }}
                  >
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: colors.text, marginBottom: 10 }}>
                      Deliverable Links to Include
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      {selectedTemplateId === "ui-ux" ? (
                        <div style={{ gridColumn: "1 / -1" }}>
                          <label style={{ fontSize: 11.5, color: colors.muted, display: "block", marginBottom: 4 }}>
                            Figma Link *
                          </label>
                          <input
                            type="text"
                            value={links.figmaUrl || ""}
                            onChange={(e) => setLinks({ ...links, figmaUrl: e.target.value })}
                            placeholder="https://www.figma.com/design/..."
                            style={{
                              width: "100%",
                              boxSizing: "border-box",
                              background: colors.panel,
                              border: `1px solid ${colors.border}`,
                              borderRadius: 8,
                              padding: "8px 10px",
                              color: colors.text,
                              fontSize: 12.5,
                            }}
                          />
                        </div>
                      ) : selectedTemplateId === "frontend-app" ? (
                        <>
                          <div>
                            <label style={{ fontSize: 11.5, color: colors.muted, display: "block", marginBottom: 4 }}>
                              Google Drive Folder (APK & Demo)
                            </label>
                            <input
                              type="text"
                              value={links.driveUrl || ""}
                              onChange={(e) => setLinks({ ...links, driveUrl: e.target.value })}
                              placeholder="https://drive.google.com/drive/folders/..."
                              style={{
                                width: "100%",
                                boxSizing: "border-box",
                                background: colors.panel,
                                border: `1px solid ${colors.border}`,
                                borderRadius: 8,
                                padding: "8px 10px",
                                color: colors.text,
                                fontSize: 12.5,
                              }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: 11.5, color: colors.muted, display: "block", marginBottom: 4 }}>
                              Admin Dashboard URL
                            </label>
                            <input
                              type="text"
                              value={links.adminUrl || ""}
                              onChange={(e) => setLinks({ ...links, adminUrl: e.target.value })}
                              placeholder="https://admin.example.com"
                              style={{
                                width: "100%",
                                boxSizing: "border-box",
                                background: colors.panel,
                                border: `1px solid ${colors.border}`,
                                borderRadius: 8,
                                padding: "8px 10px",
                                color: colors.text,
                                fontSize: 12.5,
                              }}
                            />
                          </div>
                        </>
                      ) : selectedTemplateId === "frontend-web" ? (
                        <>
                          <div>
                            <label style={{ fontSize: 11.5, color: colors.muted, display: "block", marginBottom: 4 }}>
                              Landing Page URL
                            </label>
                            <input
                              type="text"
                              value={links.landingUrl || ""}
                              onChange={(e) => setLinks({ ...links, landingUrl: e.target.value })}
                              placeholder="https://app.vercel.app"
                              style={{
                                width: "100%",
                                boxSizing: "border-box",
                                background: colors.panel,
                                border: `1px solid ${colors.border}`,
                                borderRadius: 8,
                                padding: "8px 10px",
                                color: colors.text,
                                fontSize: 12.5,
                              }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: 11.5, color: colors.muted, display: "block", marginBottom: 4 }}>
                              Admin Panel URL
                            </label>
                            <input
                              type="text"
                              value={links.adminUrl || ""}
                              onChange={(e) => setLinks({ ...links, adminUrl: e.target.value })}
                              placeholder="https://app.vercel.app/admin"
                              style={{
                                width: "100%",
                                boxSizing: "border-box",
                                background: colors.panel,
                                border: `1px solid ${colors.border}`,
                                borderRadius: 8,
                                padding: "8px 10px",
                                color: colors.text,
                                fontSize: 12.5,
                              }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: 11.5, color: colors.muted, display: "block", marginBottom: 4 }}>
                              Buyer Panel URL (Optional)
                            </label>
                            <input
                              type="text"
                              value={links.buyerUrl || ""}
                              onChange={(e) => setLinks({ ...links, buyerUrl: e.target.value })}
                              placeholder="https://app.vercel.app/buyer"
                              style={{
                                width: "100%",
                                boxSizing: "border-box",
                                background: colors.panel,
                                border: `1px solid ${colors.border}`,
                                borderRadius: 8,
                                padding: "8px 10px",
                                color: colors.text,
                                fontSize: 12.5,
                              }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: 11.5, color: colors.muted, display: "block", marginBottom: 4 }}>
                              Seller Panel URL (Optional)
                            </label>
                            <input
                              type="text"
                              value={links.sellerUrl || ""}
                              onChange={(e) => setLinks({ ...links, sellerUrl: e.target.value })}
                              placeholder="https://app.vercel.app/seller"
                              style={{
                                width: "100%",
                                boxSizing: "border-box",
                                background: colors.panel,
                                border: `1px solid ${colors.border}`,
                                borderRadius: 8,
                                padding: "8px 10px",
                                color: colors.text,
                                fontSize: 12.5,
                              }}
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <label style={{ fontSize: 11.5, color: colors.muted, display: "block", marginBottom: 4 }}>
                              Google Drive Folder (APK / Deliverables)
                            </label>
                            <input
                              type="text"
                              value={links.driveUrl || ""}
                              onChange={(e) => setLinks({ ...links, driveUrl: e.target.value })}
                              placeholder="https://drive.google.com/..."
                              style={{
                                width: "100%",
                                boxSizing: "border-box",
                                background: colors.panel,
                                border: `1px solid ${colors.border}`,
                                borderRadius: 8,
                                padding: "8px 10px",
                                color: colors.text,
                                fontSize: 12.5,
                              }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: 11.5, color: colors.muted, display: "block", marginBottom: 4 }}>
                              API Docs / Staging URL (Optional)
                            </label>
                            <input
                              type="text"
                              value={links.apiDocUrl || ""}
                              onChange={(e) => setLinks({ ...links, apiDocUrl: e.target.value })}
                              placeholder="https://api.example.com/docs"
                              style={{
                                width: "100%",
                                boxSizing: "border-box",
                                background: colors.panel,
                                border: `1px solid ${colors.border}`,
                                borderRadius: 8,
                                padding: "8px 10px",
                                color: colors.text,
                                fontSize: 12.5,
                              }}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* What They Done */}
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 6,
                      }}
                    >
                      <label style={{ fontSize: 12, fontWeight: 700, color: colors.muted }}>
                        WHAT WAS DONE / COMPLETED MODULES *
                      </label>
                      <button
                        type="button"
                        onClick={handleImportMilestones}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: colors.accent,
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <Download size={13} /> Import completed milestones
                      </button>
                    </div>

                    <textarea
                      value={whatDone}
                      onChange={(e) => setWhatDone(e.target.value)}
                      placeholder="List the features, screens, or components built in this phase (e.g. Authentication, Dashboard, Onboarding, Payment integration...)"
                      rows={6}
                      style={{
                        width: "100%",
                        boxSizing: "border-box",
                        background: colors.panel2,
                        border: `1px solid ${colors.border}`,
                        borderRadius: 10,
                        padding: 12,
                        color: colors.text,
                        fontSize: 13,
                        lineHeight: 1.5,
                        resize: "vertical",
                      }}
                    />
                  </div>

                  {/* Action Button */}
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
                    <button
                      type="button"
                      onClick={handleCreateAiMessage}
                      disabled={aiGenerating || !whatDone.trim()}
                      style={{
                        position: "relative",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 9999,
                        padding: "2px",
                        overflow: "hidden",
                        border: "none",
                        background: "transparent",
                        cursor: aiGenerating || !whatDone.trim() ? "not-allowed" : "pointer",
                        opacity: aiGenerating || !whatDone.trim() ? 0.6 : 1,
                        boxShadow: aiGenerating || !whatDone.trim() ? "none" : "0 0 24px -2px rgba(0, 229, 153, 0.45)",
                        transition: "all 0.2s ease",
                      }}
                    >
                      {!aiGenerating && whatDone.trim() && (
                        <div
                          style={{
                            position: "absolute",
                            inset: "-250%",
                            background: `conic-gradient(
                              from 0deg,
                              transparent 0deg,
                              transparent 210deg,
                              rgba(0, 229, 153, 0.35) 270deg,
                              rgba(255, 255, 255, 0.95) 330deg,
                              #FFFFFF 345deg,
                              transparent 360deg
                            )`,
                            animation: "deliveryBorderBeamRotate 3s linear infinite",
                            pointerEvents: "none",
                          }}
                        />
                      )}
                      <div
                        style={{
                          position: "relative",
                          zIndex: 1,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 8,
                          borderRadius: 9999,
                          padding: "12px 26px",
                          background: aiGenerating || !whatDone.trim()
                            ? colors.panel2
                            : "linear-gradient(180deg, #10B981 0%, #059669 55%, #047857 100%)",
                          color: aiGenerating || !whatDone.trim() ? colors.muted : "#FFFFFF",
                          fontWeight: 750,
                          fontSize: 14,
                          boxShadow: aiGenerating || !whatDone.trim() ? "none" : "inset 0 1px 1px rgba(255, 255, 255, 0.4)",
                        }}
                      >
                        <Sparkles size={16} />
                        {aiGenerating ? "Creating Message with AI..." : "Create Message with AI Magic (1-Time)"}
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
