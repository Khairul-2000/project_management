import { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  MoreVertical,
  ArrowUp,
  ArrowUpRight,
  Copy,
  Check,
  RotateCw,
  RotateCcw,
  X,
  ThumbsUp,
  ExternalLink,
  Sparkles,
  MessageSquare,
  Zap,
  FolderPlus,
  UserPlus,
  CheckCircle2,
  XCircle,
  Loader2,
  Calendar,
  Layers,
  DollarSign,
  User,
  Clock,
} from "lucide-react";
import { useTheme } from "../lib/theme";

// 4-Point Star / Sparkle Avatar matching the reference image
export const SparkleAvatar = ({ size = 32, animated = false, style = {} }) => {
  const { isDark } = useTheme();
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: isDark
          ? "radial-gradient(circle at 35% 35%, #0F2D20 0%, #08090A 100%)"
          : "radial-gradient(circle at 35% 35%, #2D1A38 0%, #14151F 100%)",
        border: isDark
          ? "1px solid rgba(0, 229, 153, 0.45)"
          : "1px solid rgba(244, 114, 182, 0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: isDark
          ? "0 0 16px rgba(0, 229, 153, 0.35)"
          : "0 0 16px rgba(236, 72, 153, 0.35)",
        flexShrink: 0,
        position: "relative",
        ...style,
      }}
    >
      <svg
        width={size * 0.58}
        height={size * 0.58}
        viewBox="0 0 24 24"
        fill="none"
        style={{
          filter: isDark
            ? "drop-shadow(0 0 5px rgba(0, 229, 153, 0.8))"
            : "drop-shadow(0 0 5px rgba(244, 114, 182, 0.75))",
          animation: animated ? "sparkleSpin 10s linear infinite" : undefined,
        }}
      >
        <path
          d="M12 2C12 7.52 7.52 12 2 12C7.52 12 12 16.48 12 22C12 16.48 16.48 12 22 12C16.48 12 12 7.52 12 2Z"
          fill={isDark ? "url(#sparkleGradModalDark)" : "url(#sparkleGradModal)"}
        />
        <defs>
          <linearGradient id="sparkleGradModalDark" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
            <stop stopColor="#A7F3D0" />
            <stop offset="0.5" stopColor="#00E599" />
            <stop offset="1" stopColor="#059669" />
          </linearGradient>
          <linearGradient id="sparkleGradModal" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FDE047" />
            <stop offset="0.45" stopColor="#FB7185" />
            <stop offset="1" stopColor="#C084FC" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
};

// Backward-compatible export
export const CuteAvatar = SparkleAvatar;

// Markdown renderer adapted for clean theme integration
function MarkdownContent({ text, isDark, colors, onSelectProject }) {
  if (!text) return null;

  const lines = text.split("\n");
  const rendered = [];

  let inList = false;
  let listItems = [];

  const flushList = (key) => {
    if (listItems.length > 0) {
      rendered.push(
        <ul
          key={`ul-${key}`}
          style={{
            margin: "6px 0 10px 18px",
            padding: 0,
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          {listItems}
        </ul>
      );
      listItems = [];
      inList = false;
    }
  };

  const parseInline = (lineStr) => {
    const parts = [];
    let current = "";
    let i = 0;

    const pushCurrent = () => {
      if (current) {
        parts.push(current);
        current = "";
      }
    };

    while (i < lineStr.length) {
      if (lineStr.slice(i, i + 2) === "**") {
        const end = lineStr.indexOf("**", i + 2);
        if (end !== -1) {
          pushCurrent();
          parts.push(
            <strong
              key={`b-${i}`}
              style={{
                fontWeight: 700,
                color: isDark ? "#FFFFFF" : colors?.text || "#111827",
              }}
            >
              {lineStr.slice(i + 2, end)}
            </strong>
          );
          i = end + 2;
          continue;
        }
      }

      if (lineStr[i] === "`") {
        const end = lineStr.indexOf("`", i + 1);
        if (end !== -1) {
          pushCurrent();
          parts.push(
            <code
              key={`c-${i}`}
              style={{
                background: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)",
                color: isDark ? "#F472B6" : "#A855F7",
                padding: "2px 6px",
                borderRadius: 5,
                fontSize: "0.85em",
                fontFamily: "monospace",
              }}
            >
              {lineStr.slice(i + 1, end)}
            </code>
          );
          i = end + 1;
          continue;
        }
      }

      if (lineStr[i] === "[") {
        const textEnd = lineStr.indexOf("]", i + 1);
        const urlStart = textEnd !== -1 ? lineStr.indexOf("(", textEnd) : -1;
        const urlEnd = urlStart !== -1 ? lineStr.indexOf(")", urlStart) : -1;
        if (textEnd !== -1 && urlStart === textEnd + 1 && urlEnd !== -1) {
          pushCurrent();
          const linkText = lineStr.slice(i + 1, textEnd);
          const linkUrl = lineStr.slice(urlStart + 1, urlEnd);
          const isProjectLink = linkUrl.startsWith("project:") || linkUrl.startsWith("#project-");

          if (isProjectLink && onSelectProject) {
            const projName = linkUrl.replace(/^(project:|#project-)/, "");
            parts.push(
              <button
                key={`p-${i}`}
                type="button"
                onClick={() => onSelectProject(projName || linkText)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  background: isDark ? "rgba(0, 229, 153, 0.12)" : "rgba(168, 85, 247, 0.12)",
                  color: isDark ? "#00E599" : "#9333EA",
                  border: `1px solid ${isDark ? "rgba(0, 229, 153, 0.3)" : "rgba(168, 85, 247, 0.25)"}`,
                  padding: "2px 8px",
                  borderRadius: 6,
                  fontSize: "0.88em",
                  fontWeight: 600,
                  cursor: "pointer",
                  margin: "0 2px",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.03)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                }}
              >
                <span>{linkText}</span>
                <ExternalLink size={11} />
              </button>
            );
          } else {
            parts.push(
              <a
                key={`a-${i}`}
                href={linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: isDark ? "#F472B6" : "#9333EA",
                  textDecoration: "underline",
                  fontWeight: 600,
                }}
              >
                {linkText}
              </a>
            );
          }
          i = urlEnd + 1;
          continue;
        }
      }

      current += lineStr[i];
      i++;
    }
    pushCurrent();
    return parts;
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushList(idx);
      rendered.push(<div key={`br-${idx}`} style={{ height: 6 }} />);
      return;
    }

    if (trimmed.startsWith("### ")) {
      flushList(idx);
      rendered.push(
        <div
          key={`h4-${idx}`}
          style={{
            margin: "12px 0 4px 0",
            fontSize: "0.95rem",
            fontWeight: 700,
            color: isDark ? "#FFFFFF" : colors?.text || "#111827",
          }}
        >
          {parseInline(trimmed.slice(4))}
        </div>
      );
      return;
    }

    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      inList = true;
      listItems.push(
        <li key={`li-${idx}`} style={{ fontSize: "0.92rem", lineHeight: 1.55 }}>
          {parseInline(trimmed.slice(2))}
        </li>
      );
      return;
    }

    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      inList = true;
      listItems.push(
        <li key={`li-num-${idx}`} style={{ fontSize: "0.92rem", lineHeight: 1.55 }}>
          <span style={{ fontWeight: 700, marginRight: 6 }}>{numMatch[1]}.</span>
          {parseInline(numMatch[2])}
        </li>
      );
      return;
    }

    flushList(idx);

    rendered.push(
      <p
        key={`p-${idx}`}
        style={{
          margin: "2px 0",
          fontSize: "0.93rem",
          lineHeight: 1.55,
          color: isDark ? "rgba(255, 255, 255, 0.9)" : colors?.text || "#1E2028",
        }}
      >
        {parseInline(trimmed)}
      </p>
    );
  });

  flushList(lines.length);

  return <div style={{ display: "flex", flexDirection: "column" }}>{rendered}</div>;
}

// Interactive Action Card rendered in Work Mode
function InteractiveActionCard({
  actionId,
  type,
  data,
  status, // "pending" | "executing" | "applied" | "cancelled"
  isAdmin,
  isDark,
  colors,
  onExecute,
  onCancel,
}) {
  const isPending = !status || status === "pending";
  const isExecuting = status === "executing";
  const isApplied = status === "applied";
  const isCancelled = status === "cancelled";

  return (
    <div
      style={{
        marginTop: 10,
        background: isDark
          ? "linear-gradient(145deg, rgba(17, 19, 23, 0.85) 0%, rgba(11, 13, 17, 0.95) 100%)"
          : "linear-gradient(145deg, #FFFFFF 0%, #FAF5FF 100%)",
        border: isApplied
          ? "1px solid rgba(0, 229, 153, 0.5)"
          : isDark
          ? "1px solid rgba(0, 229, 153, 0.28)"
          : "1px solid rgba(168, 85, 247, 0.25)",
        borderRadius: 18,
        padding: "14px 16px",
        boxShadow: isDark
          ? "0 8px 24px rgba(0, 0, 0, 0.4), 0 0 16px rgba(0, 229, 153, 0.08)"
          : "0 6px 20px rgba(168, 85, 247, 0.08)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        animation: "messageSlideUp 0.25s ease",
      }}
    >
      {/* Header with Type badge and status */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          {type === "create_project" && <FolderPlus size={16} color={isDark ? "#00E599" : "#EC4899"} />}
          {type === "assign_member" && <UserPlus size={16} color={isDark ? "#10B981" : "#A855F7"} />}
          {type === "update_status" && <RotateCw size={16} color={isDark ? "#34D399" : "#3B82F6"} />}
          <span
            style={{
              fontSize: 11.5,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              color: isDark ? "#00E599" : "#9333EA",
            }}
          >
            {type === "create_project" && "Proposed: Create Project"}
            {type === "assign_member" && "Proposed: Assign Member"}
            {type === "update_status" && "Proposed: Update Status"}
          </span>
        </div>

        <span
          style={{
            fontSize: 10.5,
            fontWeight: 700,
            padding: "2px 8px",
            borderRadius: 6,
            background: isApplied
              ? "rgba(16, 185, 129, 0.15)"
              : isCancelled
              ? "rgba(107, 114, 128, 0.15)"
              : isExecuting
              ? "rgba(59, 130, 246, 0.15)"
              : "rgba(245, 158, 11, 0.15)",
            color: isApplied
              ? "#10B981"
              : isCancelled
              ? "#9CA3AF"
              : isExecuting
              ? "#3B82F6"
              : "#F59E0B",
          }}
        >
          {isApplied ? "Applied ✓" : isCancelled ? "Cancelled" : isExecuting ? "Applying..." : "Draft"}
        </span>
      </div>

      {/* Structured Fields Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
          gap: 8,
          background: isDark ? "rgba(0, 0, 0, 0.25)" : "rgba(255, 255, 255, 0.8)",
          borderRadius: 12,
          padding: "10px 12px",
          border: isDark ? "1px solid rgba(255, 255, 255, 0.05)" : `1px solid ${colors.border}`,
        }}
      >
        {type === "create_project" && (
          <>
            <div>
              <span style={{ fontSize: 10, color: colors.muted, display: "block" }}>Project Name</span>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: isDark ? "#FFFFFF" : colors.text }}>
                {data.projectName || "New Project"}
              </span>
            </div>
            <div>
              <span style={{ fontSize: 10, color: colors.muted, display: "block" }}>Fiverr Profile</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#EC4899" }}>
                {data.profile || "code_muse_Fiverr"}
              </span>
            </div>
            <div>
              <span style={{ fontSize: 10, color: colors.muted, display: "block" }}>Price (USD)</span>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: "#10B981" }}>
                ${data.price ?? 450}
              </span>
            </div>
            <div>
              <span style={{ fontSize: 10, color: colors.muted, display: "block" }}>Department / Stack</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: isDark ? "#E5E7EB" : colors.text }}>
                {data.stack || "Fullstack"}
              </span>
            </div>
            <div>
              <span style={{ fontSize: 10, color: colors.muted, display: "block" }}>Supervisor</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: isDark ? "#E5E7EB" : colors.text }}>
                {data.supervisor || "None"}
              </span>
            </div>
            <div>
              <span style={{ fontSize: 10, color: colors.muted, display: "block" }}>Dateline & Shift</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: isDark ? "#E5E7EB" : colors.text }}>
                {data.dateline || "5 Days"} • {data.shift || "Day"}
              </span>
            </div>
          </>
        )}

        {type === "assign_member" && (
          <>
            <div>
              <span style={{ fontSize: 10, color: colors.muted, display: "block" }}>Target Project</span>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: isDark ? "#FFFFFF" : colors.text }}>
                {data.projectName}
              </span>
            </div>
            <div>
              <span style={{ fontSize: 10, color: colors.muted, display: "block" }}>Team Member</span>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: "#A855F7" }}>
                {data.memberName}
              </span>
            </div>
            <div>
              <span style={{ fontSize: 10, color: colors.muted, display: "block" }}>Assigned Role</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: isDark ? "#E5E7EB" : colors.text }}>
                {data.role || "Developer"}
              </span>
            </div>
          </>
        )}

        {type === "update_status" && (
          <>
            <div>
              <span style={{ fontSize: 10, color: colors.muted, display: "block" }}>Target Project</span>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: isDark ? "#FFFFFF" : colors.text }}>
                {data.projectName}
              </span>
            </div>
            <div>
              <span style={{ fontSize: 10, color: colors.muted, display: "block" }}>New Status</span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: data.status === "Delivered" ? "#10B981" : "#F59E0B",
                }}
              >
                {data.status || "WIP"}
              </span>
            </div>
            {data.dateline && (
              <div>
                <span style={{ fontSize: 10, color: colors.muted, display: "block" }}>New Dateline</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: isDark ? "#E5E7EB" : colors.text }}>
                  {data.dateline}
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Action Buttons */}
      {isPending && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
          <button
            type="button"
            disabled={!isAdmin || isExecuting}
            onClick={() => onExecute(actionId, type, data)}
            title={!isAdmin ? "Admin permissions required" : "Execute action"}
            style={{
              flex: 1,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              background: isAdmin
                ? isDark
                  ? "linear-gradient(135deg, #00F5A0 0%, #00D287 100%)"
                  : "linear-gradient(135deg, #EC4899 0%, #A855F7 100%)"
                : isDark
                ? "#374151"
                : "#D1D5DB",
              color: isDark && isAdmin ? "#041D14" : "#FFFFFF",
              border: "none",
              borderRadius: 10,
              padding: "8px 14px",
              fontSize: 12.5,
              fontWeight: 700,
              cursor: isAdmin ? "pointer" : "not-allowed",
              boxShadow: isAdmin
                ? isDark
                  ? "0 4px 14px rgba(0, 229, 153, 0.35)"
                  : "0 4px 14px rgba(236, 72, 153, 0.35)"
                : "none",
              transition: "all 0.18s ease",
            }}
            onMouseEnter={(e) => {
              if (isAdmin) e.currentTarget.style.transform = "scale(1.02)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            <Check size={14} strokeWidth={2.6} />
            <span>Confirm & Apply</span>
          </button>

          <button
            type="button"
            onClick={() => onCancel(actionId)}
            style={{
              background: isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.04)",
              border: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : `1px solid ${colors.border}`,
              borderRadius: 10,
              padding: "8px 12px",
              fontSize: 12,
              fontWeight: 600,
              color: colors.muted,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      )}

      {isExecuting && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#3B82F6", fontSize: 12, fontWeight: 600 }}>
          <Loader2 size={14} className="spin-loader" />
          <span>Applying changes to dashboard...</span>
        </div>
      )}

      {isApplied && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#10B981", fontSize: 12, fontWeight: 700 }}>
          <CheckCircle2 size={15} />
          <span>Applied successfully to live projects!</span>
        </div>
      )}

      {isCancelled && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, color: colors.muted, fontSize: 11.5 }}>
          <XCircle size={14} />
          <span>Action was discarded.</span>
        </div>
      )}
    </div>
  );
}

// Quick action prompt templates for Chat Mode vs Work Mode
const CHAT_PROMPT_CARDS = [
  {
    title: "Project status",
    desc: "Active & in-progress deliveries",
    prompt: "What projects are currently In Progress?",
  },
  {
    title: "Late & overdue",
    desc: "Critical delays requiring action",
    prompt: "Are there any late or overdue projects?",
  },
  {
    title: "Workload insights",
    desc: "Assignments & team capacity",
    prompt: "Who is working on project ahomesllc?",
  },
  {
    title: "Supervisor check",
    desc: "Projects with unassigned leads",
    prompt: "List projects with missing supervisor",
  },
];

const WORK_PROMPT_CARDS = [
  {
    title: "Create Project",
    desc: "Draft a new phase with price & stack",
    prompt: "Create project Nova App for profile code_muse_Fiverr price 500 stack MERN supervisor Khairul",
  },
  {
    title: "Assign Member",
    desc: "Assign a developer to a project",
    prompt: "Assign Pritom to Nova App as Frontend Developer",
  },
  {
    title: "Mark Delivered",
    desc: "Update a phase status to Delivered",
    prompt: "Mark Nova App as Delivered",
  },
  {
    title: "Update Dateline",
    desc: "Extend or adjust deadline & shift",
    prompt: "Set Nova App dateline to 3 Days with Day shift",
  },
];

export default function AgentChatModal({
  isOpen,
  onClose,
  currentUser,
  onSelectProject,
  onExecuteAction, // ({ type, data }) => Promise<{ success: boolean, message?: string }>
}) {
  const { colors, isDark } = useTheme();
  const isAdmin = currentUser?.role === "admin" || currentUser?.role === "super_admin";

  // Mode state: "chat" (read-only queries) vs "work" (operational execution)
  const [mode, setMode] = useState("chat");

  const initialChatMessage = {
    id: "welcome-chat",
    sender: "assistant",
    mode: "chat",
    text: `Hello! I'm your Delivery Operations Assistant in **Chat Mode**. Ask me anything about project deadlines, stack assignments, or team workloads.`,
  };

  const initialWorkMessage = {
    id: "welcome-work",
    sender: "assistant",
    mode: "work",
    text: `⚡ **Work Mode Active**. Tell me to create projects, assign team members, or update delivery statuses. Use the action cards below or type a command!`,
  };

  const [chatMessages, setChatMessages] = useState([initialChatMessage]);
  const [workMessages, setWorkMessages] = useState([initialWorkMessage]);

  const messages = mode === "work" ? workMessages : chatMessages;
  const setMessages = (updater) => {
    if (mode === "work") {
      setWorkMessages(updater);
    } else {
      setChatMessages(updater);
    }
  };

  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [likedMap, setLikedMap] = useState({});
  const [menuOpen, setMenuOpen] = useState(false);
  const [actionStatusMap, setActionStatusMap] = useState({});
  const [quota, setQuota] = useState(null);

  const fetchQuota = async () => {
    try {
      const res = await fetch(`/api/agent/quota?t=${Date.now()}`, {
        cache: "no-store",
        headers: { Pragma: "no-cache", "Cache-Control": "no-cache" },
      });
      if (res.ok) {
        const data = await res.json();
        setQuota(data);
      }
    } catch (err) {
      console.warn("[agent-quota] Failed to fetch quota:", err);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    fetchQuota();
    const interval = setInterval(() => {
      fetchQuota();
    }, 30000);
    return () => clearInterval(interval);
  }, [isOpen]);

  const currentQuota = mode === "work" ? quota?.work : quota?.chat;
  const isUnlimited = Boolean(quota?.isUnlimited);
  const remaining = isUnlimited ? 999 : (currentQuota?.remaining ?? (mode === "work" ? 3 : 25));
  const limit = currentQuota?.limit ?? (mode === "work" ? 3 : 25);
  const resetInSeconds = currentQuota?.resetInSeconds || 0;
  const windowHours = quota?.windowHours || 5;
  const isExhausted = !isUnlimited && remaining <= 0;

  const formatCountdown = (secs) => {
    if (!secs || secs <= 0) return "";
    const hours = Math.floor(secs / 3600);
    const mins = Math.ceil((secs % 3600) / 60);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
        scrollToBottom();
      }, 120);
    }
  }, [isOpen, mode]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming, actionStatusMap]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleSend = async (textToSend) => {
    const query = (textToSend || input).trim();
    if (!query || isStreaming || isExhausted) return;

    const currentMode = mode;
    const targetSetMessages = currentMode === "work" ? setWorkMessages : setChatMessages;
    const currentList = currentMode === "work" ? workMessages : chatMessages;

    setInput("");

    const userMessageId = `u-${Date.now()}`;
    const botMessageId = `b-${Date.now() + 1}`;

    targetSetMessages((prev) => [
      ...prev,
      { id: userMessageId, sender: "user", mode: currentMode, text: query },
      { id: botMessageId, sender: "assistant", mode: currentMode, text: "" },
    ]);
    setIsStreaming(true);

    try {
      const response = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: query,
          mode: currentMode,
          history: currentList.slice(-5),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        targetSetMessages((prev) =>
          prev.map((msg) =>
            msg.id === botMessageId
              ? { ...msg, text: `⚠️ Request failed: ${errorData.error || "Please authenticate."}` }
              : msg
          )
        );
        setIsStreaming(false);
        return;
      }

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
          if (payload === "[DONE]") continue;

          try {
            const parsed = JSON.parse(payload);
            if (parsed.quota) {
              setQuota(parsed.quota);
            }
            if (parsed.content) {
              targetSetMessages((prev) =>
                prev.map((msg) =>
                  msg.id === botMessageId
                    ? { ...msg, text: msg.text + parsed.content }
                    : msg
                )
              );
            }
          } catch {
            // parse error
          }
        }
      }
    } catch (err) {
      targetSetMessages((prev) =>
        prev.map((msg) =>
          msg.id === botMessageId ? { ...msg, text: `⚠️ Error: ${err.message}` } : msg
        )
      );
    } finally {
      setIsStreaming(false);
      fetchQuota();
    }
  };

  const handleCopy = (id, text) => {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleToggleLike = (id) => {
    setLikedMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleNewChat = (targetMode = mode) => {
    if (targetMode === "work") {
      setWorkMessages([
        {
          ...initialWorkMessage,
          id: `welcome-work-${Date.now()}`,
        },
      ]);
    } else {
      setChatMessages([
        {
          ...initialChatMessage,
          id: `welcome-chat-${Date.now()}`,
        },
      ]);
    }
    setMenuOpen(false);
  };

  const handleClearHistory = () => {
    handleNewChat(mode);
  };

  const handleBackClick = () => {
    // If the user has chatted in this mode (more than the welcome prompt),
    // go back to the fresh Hero screen with the prompt cards!
    if (messages.length > 1) {
      handleNewChat(mode);
    } else {
      // If already on the Hero screen, minimize/close the modal
      onClose();
    }
  };

  const handleRegenerate = (lastBotIndex) => {
    if (isStreaming) return;
    for (let i = lastBotIndex - 1; i >= 0; i--) {
      if (messages[i].sender === "user") {
        handleSend(messages[i].text);
        break;
      }
    }
  };

  // Execute proposed action from Work Mode card
  const handleExecuteAction = async (actionId, type, data) => {
    if (!onExecuteAction) return;
    setActionStatusMap((prev) => ({ ...prev, [actionId]: "executing" }));
    try {
      const res = await onExecuteAction({ type, data });
      if (res && res.success === false) {
        setActionStatusMap((prev) => ({ ...prev, [actionId]: "pending" }));
        alert(res.message || "Failed to execute action.");
      } else {
        setActionStatusMap((prev) => ({ ...prev, [actionId]: "applied" }));
        fetchQuota();
      }
    } catch (err) {
      setActionStatusMap((prev) => ({ ...prev, [actionId]: "pending" }));
      alert(err.message || "Action execution error");
    }
  };

  const handleCancelAction = (actionId) => {
    setActionStatusMap((prev) => ({ ...prev, [actionId]: "cancelled" }));
  };

  // Helper to parse action block from assistant text
  const parseActionBlock = (fullText) => {
    if (!fullText) return { cleanText: "", action: null };
    const regex = /```action:([a-z_]+)\s*\n([\s\S]*?)\n```/i;
    const match = fullText.match(regex);
    if (!match) return { cleanText: fullText, action: null };

    try {
      const actionType = match[1].toLowerCase();
      const actionData = JSON.parse(match[2]);
      const cleanText = fullText.replace(regex, "").trim();
      return { cleanText, action: { type: actionType, data: actionData } };
    } catch {
      return { cleanText: fullText, action: null };
    }
  };

  if (!isOpen) return null;

  const showHeroView = messages.length <= 1;
  const promptCards = mode === "work" ? WORK_PROMPT_CARDS : CHAT_PROMPT_CARDS;

  return (
    <>
      <style>{`
        @keyframes glowPulse {
          0%, 100% {
            transform: scale(1) translate(0, 0);
            opacity: 0.65;
          }
          50% {
            transform: scale(1.18) translate(-12px, 8px);
            opacity: 0.9;
          }
        }
        @keyframes modalEnter {
          from {
            opacity: 0;
            transform: translateY(24px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes messageSlideUp {
          from {
            opacity: 0;
            transform: translateY(14px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes typingWave {
          0%, 60%, 100% {
            transform: translateY(0);
            opacity: 0.35;
          }
          30% {
            transform: translateY(-6px);
            opacity: 1;
          }
        }
        @keyframes sparkleSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes spinLoader {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin-loader {
          animation: spinLoader 1s linear infinite;
        }
        .ref-card {
          transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .ref-card:hover {
          transform: translateY(-3px) scale(1.015);
        }
        .ref-card:hover .arrow-icon {
          transform: translate(3px, -3px);
          color: ${isDark ? "#00E599" : "#EC4899"} !important;
        }
        .action-btn {
          transition: all 0.16s ease;
        }
        .action-btn:hover {
          transform: scale(1.12);
          color: ${isDark ? "#00E599" : "#EC4899"} !important;
        }
      `}</style>

      {/* Main Container */}
      <div
        style={{
          position: "fixed",
          right: 24,
          bottom: 24,
          width: "min(430px, calc(100vw - 32px))",
          height: "min(730px, calc(100vh - 48px))",
          background: isDark ? "#08090A" : colors.bg,
          color: isDark ? "#FFFFFF" : colors.text,
          borderRadius: 32,
          boxShadow: isDark
            ? "0 28px 70px rgba(0, 0, 0, 0.8), 0 0 35px rgba(0, 229, 153, 0.14)"
            : "0 24px 60px rgba(45, 38, 20, 0.15), 0 0 30px rgba(168, 85, 247, 0.12)",
          display: "flex",
          flexDirection: "column",
          zIndex: 9999,
          overflow: "hidden",
          border: isDark
            ? "1px solid rgba(255, 255, 255, 0.08)"
            : `1px solid ${colors.border}`,
          animation: "modalEnter 0.32s cubic-bezier(0.16, 1, 0.3, 1)",
          fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
        }}
      >
        {/* Ambient Top Glow */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: -60,
            right: -40,
            width: 320,
            height: 280,
            background: mode === "work"
              ? isDark
                ? "radial-gradient(circle at 60% 40%, rgba(0, 229, 153, 0.35) 0%, rgba(16, 185, 129, 0.2) 45%, transparent 70%)"
                : "radial-gradient(circle at 60% 40%, rgba(244, 114, 182, 0.4) 0%, rgba(251, 113, 133, 0.3) 45%, transparent 70%)"
              : isDark
              ? "radial-gradient(circle at 60% 40%, rgba(0, 229, 153, 0.28) 0%, rgba(5, 150, 105, 0.18) 40%, transparent 70%)"
              : "radial-gradient(circle at 60% 40%, rgba(192, 132, 252, 0.35) 0%, rgba(165, 180, 252, 0.25) 45%, transparent 70%)",
            filter: "blur(40px)",
            pointerEvents: "none",
            zIndex: 0,
            animation: "glowPulse 8s ease-in-out infinite",
            transition: "background 0.4s ease",
          }}
        />

        {/* Header with Dual Mode Switcher */}
        <header
          style={{
            position: "relative",
            zIndex: 2,
            display: "flex",
            flexDirection: "column",
            gap: 12,
            padding: "16px 20px 12px 20px",
            borderBottom: isDark
              ? "1px solid rgba(255, 255, 255, 0.06)"
              : `1px solid ${colors.border}`,
            flexShrink: 0,
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
        >
          {/* Top Bar: Back, Brand, Actions (New Chat, Options, Close) */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            {/* Back button: Returns to Hero prompt cards if in chat, or closes if on Hero */}
            <button
              onClick={handleBackClick}
              title={messages.length > 1 ? "Back to prompt cards" : "Close"}
              style={{
                background: isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.04)",
                border: `1px solid ${isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.05)"}`,
                borderRadius: "50%",
                width: 32,
                height: 32,
                display: "grid",
                placeItems: "center",
                cursor: "pointer",
                color: isDark ? "#E5E7EB" : colors.text,
                transition: "all 0.18s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.08)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
            >
              <ArrowLeft size={16} strokeWidth={2.4} />
            </button>

            {/* Brand identity */}
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <SparkleAvatar size={26} animated />
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: isDark ? "#FFFFFF" : colors.text,
                    lineHeight: 1.2,
                    letterSpacing: "-0.2px",
                  }}
                >
                  Crextio AI
                </span>
                <span
                  style={{
                    fontSize: 10,
                    color: isDark ? "rgba(255, 255, 255, 0.55)" : colors.muted,
                    fontWeight: 600,
                  }}
                >
                  {mode === "work" ? "⚡ Work & Action Mode" : "💬 Conversational Chat"}
                </span>
              </div>
            </div>

            {/* Right Controls: New Chat, Menu, Close */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {/* Dedicated New Chat Button */}
              <button
                onClick={() => handleNewChat(mode)}
                title="Start fresh chat"
                style={{
                  background: isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.04)",
                  border: `1px solid ${isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.05)"}`,
                  borderRadius: "50%",
                  width: 30,
                  height: 30,
                  display: "grid",
                  placeItems: "center",
                  cursor: "pointer",
                  color: isDark ? "#E5E7EB" : colors.text,
                  transition: "all 0.18s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.08)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
              >
                <RotateCcw size={13} strokeWidth={2.3} />
              </button>

              {/* Options Menu */}
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => setMenuOpen((prev) => !prev)}
                  title="Options"
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: isDark ? "rgba(255, 255, 255, 0.7)" : colors.muted,
                    padding: 4,
                    display: "grid",
                    placeItems: "center",
                    borderRadius: 8,
                  }}
                >
                  <MoreVertical size={17} />
                </button>

              {menuOpen && (
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: 36,
                    background: isDark ? "#181A22" : colors.panel,
                    border: isDark
                      ? "1px solid rgba(255, 255, 255, 0.12)"
                      : `1px solid ${colors.border}`,
                    borderRadius: 14,
                    boxShadow: "0 12px 30px rgba(0, 0, 0, 0.35)",
                    padding: 6,
                    minWidth: 150,
                    zIndex: 20,
                    animation: "modalEnter 0.15s ease",
                  }}
                >
                  <button
                    onClick={handleClearHistory}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 12px",
                      background: "transparent",
                      border: "none",
                      borderRadius: 8,
                      fontSize: 12.5,
                      fontWeight: 600,
                      color: isDark ? "#F87171" : "#DC2626",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = isDark
                        ? "rgba(248, 113, 113, 0.1)"
                        : "rgba(220, 38, 38, 0.08)")
                    }
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <RotateCw size={14} /> Clear chat
                  </button>
                </div>
              )}
            </div>

              {/* Close Button */}
              <button
                onClick={onClose}
                title="Close modal"
                style={{
                  background: isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.04)",
                  border: `1px solid ${isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.05)"}`,
                  borderRadius: "50%",
                  width: 30,
                  height: 30,
                  display: "grid",
                  placeItems: "center",
                  cursor: "pointer",
                  color: isDark ? "#E5E7EB" : colors.text,
                  transition: "all 0.18s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.08)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
              >
                <X size={15} strokeWidth={2.4} />
              </button>
            </div>
          </div>

          {/* DUAL MODE SWITCHER: Chat Mode vs Work Mode */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.04)",
              border: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : `1px solid ${colors.border}`,
              borderRadius: 9999,
              padding: 3,
              position: "relative",
            }}
          >
            {/* Chat Mode Button */}
            <button
              type="button"
              onClick={() => setMode("chat")}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: 9999,
                border: "none",
                background: mode === "chat"
                  ? isDark
                    ? "#171A20"
                    : "#FFFFFF"
                  : "transparent",
                color: mode === "chat"
                  ? isDark
                    ? "#00E599"
                    : "#7C3AED"
                  : isDark
                  ? "rgba(255, 255, 255, 0.6)"
                  : colors.muted,
                fontWeight: mode === "chat" ? 750 : 600,
                fontSize: 12,
                cursor: "pointer",
                boxShadow: mode === "chat" ? (isDark ? "0 2px 10px rgba(0, 0, 0, 0.3)" : "0 2px 8px rgba(0, 0, 0, 0.15)") : "none",
                transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            >
              <MessageSquare size={13} strokeWidth={2.4} />
              <span>Chat Mode</span>
            </button>

            {/* Work Mode Button */}
            <button
              type="button"
              onClick={() => setMode("work")}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: 9999,
                border: "none",
                background: mode === "work"
                  ? isDark
                    ? "linear-gradient(135deg, #00F5A0 0%, #00D287 100%)"
                    : "linear-gradient(135deg, #EC4899 0%, #A855F7 100%)"
                  : "transparent",
                color: mode === "work"
                  ? isDark
                    ? "#041D14"
                    : "#FFFFFF"
                  : isDark
                  ? "rgba(255, 255, 255, 0.6)"
                  : colors.muted,
                fontWeight: mode === "work" ? 750 : 600,
                fontSize: 12,
                cursor: "pointer",
                boxShadow: mode === "work"
                  ? isDark
                    ? "0 2px 14px rgba(0, 229, 153, 0.4)"
                    : "0 2px 12px rgba(236, 72, 153, 0.35)"
                  : "none",
                transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            >
              <Zap size={13} strokeWidth={2.4} />
              <span>Work Mode</span>
            </button>
          </div>

          {/* Quota & Reset Indicator Strip */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "4px 8px 0 8px",
              fontSize: 11,
              fontWeight: 600,
              color: isDark ? "rgba(255, 255, 255, 0.65)" : colors.muted,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  backgroundColor: isUnlimited
                    ? "#3B82F6"
                    : isExhausted
                    ? "#EF4444"
                    : remaining <= 1
                    ? "#F59E0B"
                    : "#10B981",
                  boxShadow: isUnlimited
                    ? "0 0 7px #3B82F6"
                    : isExhausted
                    ? "0 0 7px #EF4444"
                    : "0 0 7px #10B981",
                  display: "inline-block",
                  flexShrink: 0,
                }}
              />
              {isUnlimited ? (
                <span>Super Admin: Unlimited {mode === "work" ? "Tasks" : "Queries"}</span>
              ) : mode === "work" ? (
                <span>
                  Quota: <strong style={{ color: isExhausted ? "#EF4444" : isDark ? "#FFFFFF" : "#111827" }}>{remaining} of {limit}</strong> tasks left
                </span>
              ) : (
                <span>
                  Quota: <strong style={{ color: isExhausted ? "#EF4444" : isDark ? "#FFFFFF" : "#111827" }}>{remaining} of {limit}</strong> chats left
                </span>
              )}
            </div>

            {!isUnlimited && (
              <div
                title={
                  isExhausted
                    ? `Quota resets in ${formatCountdown(resetInSeconds)}`
                    : `Rolling ${windowHours}-hour quota window`
                }
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 10.5,
                  opacity: 0.85,
                  color: isExhausted ? (isDark ? "#F87171" : "#DC2626") : undefined,
                }}
              >
                <Clock size={11} strokeWidth={2.2} />
                <span>
                  {isExhausted && resetInSeconds > 0
                    ? `Resets in ${formatCountdown(resetInSeconds)}`
                    : `${windowHours}h window`}
                </span>
              </div>
            )}
          </div>
        </header>


        {/* Body Content */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
            position: "relative",
            zIndex: 1,
          }}
        >
          {/* HERO VIEW */}
          {showHeroView && (
            <div style={{ padding: "8px 4px 16px 4px", animation: "messageSlideUp 0.3s ease" }}>
              <div style={{ margin: "10px 0 20px 0" }}>
                <h1
                  style={{
                    fontSize: 26,
                    fontWeight: 800,
                    lineHeight: 1.18,
                    margin: 0,
                    letterSpacing: "-0.5px",
                    color: isDark ? "#FFFFFF" : colors.text,
                  }}
                >
                  {mode === "work" ? (
                    <>
                      Operational AI,
                      <br />
                      <span
                        style={{
                          background: isDark
                            ? "linear-gradient(135deg, #00F5A0 0%, #00E599 60%, #10B981 100%)"
                            : "linear-gradient(135deg, #EC4899 0%, #A855F7 60%, #6366F1 100%)",
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                        }}
                      >
                        execute with ease
                      </span>
                    </>
                  ) : (
                    <>
                      Ask, analyze,
                      <br />
                      <span
                        style={{
                          background: isDark
                            ? "linear-gradient(135deg, #00F5A0 0%, #00E599 60%, #10B981 100%)"
                            : "linear-gradient(135deg, #EC4899 0%, #A855F7 60%, #6366F1 100%)",
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                        }}
                      >
                        optimize ops
                      </span>
                    </>
                  )}
                </h1>
                <p
                  style={{
                    fontSize: 12.5,
                    color: isDark ? "rgba(255, 255, 255, 0.55)" : colors.muted,
                    margin: "8px 0 0 0",
                    lineHeight: 1.45,
                  }}
                >
                  {mode === "work"
                    ? "Tell the assistant to create projects, assign team members, or update statuses via conversational commands."
                    : "Instant insights across live sprints, active delivery status, and team workload."}
                </p>
              </div>

              {/* 2x2 Quick Action Cards */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                }}
              >
                {promptCards.map((card, i) => (
                  <div
                    key={i}
                    className="ref-card"
                    onClick={() => !isExhausted && handleSend(card.prompt)}
                    style={{
                      background: isDark ? "rgba(255, 255, 255, 0.04)" : colors.panel,
                      border: isDark
                        ? "1px solid rgba(255, 255, 255, 0.08)"
                        : `1px solid ${colors.border}`,
                      borderRadius: 22,
                      padding: "16px 14px 14px 14px",
                      cursor: isExhausted ? "not-allowed" : "pointer",
                      opacity: isExhausted ? 0.45 : 1,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      minHeight: 105,
                      boxShadow: isDark
                        ? "0 4px 16px rgba(0, 0, 0, 0.2)"
                        : "0 4px 16px rgba(45, 38, 20, 0.04)",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 13.5,
                          fontWeight: 700,
                          color: isDark ? "#FFFFFF" : colors.text,
                          lineHeight: 1.25,
                        }}
                      >
                        {card.title}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: isDark ? "rgba(255, 255, 255, 0.45)" : colors.muted,
                          marginTop: 4,
                          lineHeight: 1.35,
                        }}
                      >
                        {card.desc}
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        marginTop: 10,
                      }}
                    >
                      <ArrowUpRight
                        className="arrow-icon"
                        size={17}
                        strokeWidth={2.4}
                        style={{
                          color: isDark ? "rgba(255, 255, 255, 0.4)" : colors.muted,
                          transition: "all 0.18s ease",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CHAT MESSAGES STREAM */}
          {messages.map((msg, idx) => {
            const isUser = msg.sender === "user";

            if (idx === 0 && showHeroView) return null;

            // Parse action block if assistant message
            const { cleanText, action } = !isUser ? parseActionBlock(msg.text) : { cleanText: msg.text, action: null };
            const actionId = `act-${msg.id}`;
            const actionStatus = actionStatusMap[actionId] || "pending";

            return (
              <div
                key={msg.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: isUser ? "flex-end" : "flex-start",
                  animation: "messageSlideUp 0.28s ease",
                  gap: 4,
                }}
              >
                {/* Message Header (Assistant only) */}
                {!isUser && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                      marginBottom: 4,
                      marginLeft: 2,
                    }}
                  >
                    <SparkleAvatar size={18} />
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: isDark ? "rgba(255, 255, 255, 0.75)" : colors.text,
                      }}
                    >
                      Crextio AI {msg.mode === "work" ? "• Work" : ""}
                    </span>
                  </div>
                )}

                {/* Bubble */}
                {isUser ? (
                  /* USER MESSAGE */
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-end",
                      gap: 8,
                      maxWidth: "88%",
                    }}
                  >
                    <div
                      style={{
                        background: isDark
                          ? "linear-gradient(135deg, #00F5A0 0%, #00D287 100%)"
                          : "linear-gradient(135deg, #EC4899 0%, #A855F7 50%, #6366F1 100%)",
                        color: isDark ? "#041D14" : "#FFFFFF",
                        padding: "13px 18px",
                        borderRadius: "22px 22px 4px 22px",
                        boxShadow: isDark
                          ? "0 6px 20px rgba(0, 229, 153, 0.28)"
                          : "0 8px 24px rgba(236, 72, 153, 0.25)",
                        fontSize: 14,
                        fontWeight: 600,
                        lineHeight: 1.5,
                        wordBreak: "break-word",
                      }}
                    >
                      {msg.text}
                    </div>

                    <div
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        background: isDark ? "#374151" : "#E5E7EB",
                        border: `1px solid ${isDark ? "#4B5563" : "#D1D5DB"}`,
                        display: "grid",
                        placeItems: "center",
                        fontSize: 10,
                        fontWeight: 700,
                        color: isDark ? "#F3F4F6" : "#374151",
                        flexShrink: 0,
                      }}
                    >
                      {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : "U"}
                    </div>
                  </div>
                ) : (
                  /* ASSISTANT MESSAGE */
                  <div
                    style={{
                      background: isDark ? "rgba(255, 255, 255, 0.045)" : colors.panel,
                      border: isDark
                        ? "1px solid rgba(255, 255, 255, 0.08)"
                        : `1px solid ${colors.border}`,
                      borderRadius: "22px 22px 22px 4px",
                      padding: "14px 18px 12px 18px",
                      maxWidth: "94%",
                      boxShadow: isDark
                        ? "0 6px 20px rgba(0, 0, 0, 0.25)"
                        : "0 6px 20px rgba(45, 38, 20, 0.04)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    {cleanText ? (
                      <MarkdownContent
                        text={cleanText}
                        isDark={isDark}
                        colors={colors}
                        onSelectProject={onSelectProject}
                      />
                    ) : (
                      /* Typing Indicator */
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                          padding: "6px 2px",
                        }}
                      >
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            background: "#EC4899",
                            animation: "typingWave 1.3s infinite ease-in-out",
                            animationDelay: "0s",
                          }}
                        />
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            background: "#A855F7",
                            animation: "typingWave 1.3s infinite ease-in-out",
                            animationDelay: "0.2s",
                          }}
                        />
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            background: "#6366F1",
                            animation: "typingWave 1.3s infinite ease-in-out",
                            animationDelay: "0.4s",
                          }}
                        />
                      </div>
                    )}

                    {/* Interactive Action Card in Work Mode */}
                    {action && (
                      <InteractiveActionCard
                        actionId={actionId}
                        type={action.type}
                        data={action.data}
                        status={actionStatus}
                        isAdmin={isAdmin}
                        isDark={isDark}
                        colors={colors}
                        onExecute={handleExecuteAction}
                        onCancel={handleCancelAction}
                      />
                    )}

                    {/* Action Footer Bar */}
                    {msg.text && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          paddingTop: 8,
                          marginTop: 4,
                          borderTop: isDark
                            ? "1px solid rgba(255, 255, 255, 0.06)"
                            : `1px solid ${colors.border}`,
                          color: isDark ? "rgba(255, 255, 255, 0.45)" : colors.muted,
                        }}
                      >
                        <button
                          type="button"
                          className="action-btn"
                          onClick={() => handleCopy(msg.id, cleanText)}
                          title="Copy response"
                          style={{
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            color: "inherit",
                            padding: 2,
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check size={13} style={{ color: "#10B981" }} />
                              <span style={{ fontSize: 10, color: "#10B981", fontWeight: 700 }}>
                                Copied
                              </span>
                            </>
                          ) : (
                            <Copy size={13} />
                          )}
                        </button>

                        <button
                          type="button"
                          className="action-btn"
                          onClick={() => handleToggleLike(msg.id)}
                          title="Helpful"
                          style={{
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            color: likedMap[msg.id] ? "#EC4899" : "inherit",
                            padding: 2,
                            display: "flex",
                          }}
                        >
                          <ThumbsUp size={13} />
                        </button>

                        <button
                          type="button"
                          className="action-btn"
                          onClick={() => handleRegenerate(idx)}
                          title="Regenerate answer"
                          style={{
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            color: "inherit",
                            padding: 2,
                            display: "flex",
                            marginLeft: "auto",
                          }}
                        >
                          <RotateCw size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div
          style={{
            padding: "12px 18px 18px 18px",
            background: "transparent",
            position: "relative",
            zIndex: 2,
            flexShrink: 0,
          }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: isDark ? "rgba(255, 255, 255, 0.05)" : colors.panel,
              border: isDark
                ? "1px solid rgba(255, 255, 255, 0.1)"
                : `1px solid ${colors.border}`,
              borderRadius: 9999,
              padding: "6px 8px 6px 18px",
              boxShadow: isDark
                ? "0 4px 20px rgba(0, 0, 0, 0.25)"
                : "0 4px 18px rgba(45, 38, 20, 0.04)",
              transition: "border-color 0.2s ease",
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                isExhausted
                  ? `Limit reached (${limit}/${limit} in ${windowHours}h). Resets in ${formatCountdown(resetInSeconds)}...`
                  : mode === "work"
                  ? "Instruct an action (e.g. Create project, assign member)..."
                  : "Ask anything about delivery ops..."
              }
              disabled={isStreaming || isExhausted}
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                background: "transparent",
                color: isDark ? "#FFFFFF" : colors.text,
                fontSize: 13.5,
                fontWeight: 500,
                padding: "8px 0",
                opacity: isExhausted ? 0.6 : 1,
                cursor: isExhausted ? "not-allowed" : "text",
              }}
            />

            {/* Gradient Circular Send Button */}
            <button
              type="submit"
              disabled={!input.trim() || isStreaming || isExhausted}
              title="Send message"
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background:
                  input.trim() && !isStreaming && !isExhausted
                    ? isDark
                      ? "linear-gradient(135deg, #00F5A0 0%, #00D287 100%)"
                      : "linear-gradient(135deg, #EC4899 0%, #A855F7 100%)"
                    : isDark
                    ? "rgba(255, 255, 255, 0.08)"
                    : "rgba(0, 0, 0, 0.06)",
                color: input.trim() && !isStreaming && !isExhausted && isDark ? "#041D14" : "#FFFFFF",
                border: "none",
                display: "grid",
                placeItems: "center",
                cursor: input.trim() && !isStreaming && !isExhausted ? "pointer" : "default",
                transition: "all 0.2s ease",
                flexShrink: 0,
                boxShadow:
                  input.trim() && !isStreaming && !isExhausted
                    ? isDark
                      ? "0 4px 16px rgba(0, 229, 153, 0.45)"
                      : "0 4px 14px rgba(236, 72, 153, 0.4)"
                    : "none",
              }}
              onMouseEnter={(e) => {
                if (input.trim() && !isStreaming && !isExhausted) {
                  e.currentTarget.style.transform = "scale(1.08)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              <ArrowUp size={18} strokeWidth={2.6} />
            </button>
          </form>

          {/* Exhaustion Notice Pill */}
          {isExhausted && (
            <div
              style={{
                marginTop: 8,
                padding: "8px 12px",
                borderRadius: 14,
                background: isDark ? "rgba(239, 68, 68, 0.12)" : "rgba(254, 226, 226, 0.75)",
                border: isDark ? "1px solid rgba(239, 68, 68, 0.3)" : "1px solid #FECACA",
                fontSize: 11.5,
                color: isDark ? "#FCA5A5" : "#B91C1C",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                animation: "messageSlideUp 0.2s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Clock size={13} strokeWidth={2.4} style={{ flexShrink: 0 }} />
                <span>
                  {mode === "work" ? "Work mode limit reached" : "Chat limit reached"} ({limit}/{limit}).{" "}
                  {resetInSeconds > 0 ? `Unlocks in ~${formatCountdown(resetInSeconds)}.` : ""}
                </span>
              </div>

              {mode === "work" && (quota?.chat?.remaining ?? 1) > 0 && (
                <button
                  type="button"
                  onClick={() => setMode("chat")}
                  style={{
                    background: isDark ? "rgba(0, 229, 153, 0.15)" : "rgba(124, 58, 237, 0.12)",
                    border: isDark ? "1px solid rgba(0, 229, 153, 0.3)" : "1px solid rgba(124, 58, 237, 0.25)",
                    color: isDark ? "#00E599" : "#7C3AED",
                    padding: "3px 8px",
                    borderRadius: 8,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontSize: 11,
                    flexShrink: 0,
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.04)")}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                >
                  Switch to Chat 💬
                </button>
              )}
            </div>
          )}

        </div>
      </div>
    </>
  );
}
