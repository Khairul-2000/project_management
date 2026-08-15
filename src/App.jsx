import { useState, useEffect, useMemo } from "react";
import ProjectDetails from "./components/ProjectDetails";
import AppSidebar from "./components/AppSidebar";
import DashboardHeader from "./components/DashboardHeader";
import CalendarFilter from "./components/CalendarFilter";
import KpiStrip from "./components/KpiStrip";
import StackWorkload from "./components/StackWorkload";
import ProfileWorkload from "./components/ProfileWorkload";
import ChartsSection from "./components/ChartsSection";
import ProjectFilters from "./components/ProjectFilters";
import ProjectSearch from "./components/ProjectSearch";
import ProjectsTable from "./components/ProjectsTable";
import ProjectFormModal from "./components/ProjectFormModal";
import DeleteConfirmModal from "./components/DeleteConfirmModal";
import RunningHorseLoader from "./components/RunningHorseLoader";
import LoginPage from "./components/LoginPage";
import UsersAdmin from "./components/UsersAdmin";
import ClientProjects from "./components/ClientProjects";
import ClientProjectDetail from "./components/ClientProjectDetail";
import DueSoonBanner from "./components/DueSoonBanner";
import AnalyticsDashboard from "./components/AnalyticsDashboard";
import {
  FONTS,
  PROFILES,
  PROFILE_SHORT,
  STACKS,
  emptyForm,
} from "./lib/constants";
import { useTheme } from "./lib/theme";
import {
  deriveStack,
  getDeveloperRole,
  getFilterMonthYear,
  getProjectStack,
  normalizeProjects,
  extractOrderId,
  statusOf,
} from "./lib/utils";
import {
  loadProjectsFromDb,
  saveProjectsToDb,
  getGoogleStatus,
  getGoogleAuthUrl,
  syncFromSheets,
  loadClientProjects,
  patchClientProject,
} from "./lib/db";
import { fetchMe, logout as apiLogout } from "./lib/auth";

const SHEETS_POLL_MS = 2 * 60 * 1000;
const SIDEBAR_STORAGE_KEY = "delivery-ops-sidebar";
const MOBILE_MQ = "(max-width: 900px)";

export default function Dashboard() {
  const { colors, isDark } = useTheme();
  const [sessionChecked, setSessionChecked] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [view, setView] = useState("dashboard"); // dashboard | analytics | users | clientProjects | clientProjectDetail
  const [projects, setProjects] = useState([]);
  const [clientProjects, setClientProjects] = useState([]);
  const [activeClientProjectId, setActiveClientProjectId] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [canWriteDb, setCanWriteDb] = useState(false);
  const [saveState, setSaveState] = useState("");
  const [googleStatus, setGoogleStatus] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [stackFilter, setStackFilter] = useState("All");
  const [profileFilter, setProfileFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [currentHash, setCurrentHash] = useState(window.location.hash);
  const [selectedMonth, setSelectedMonth] = useState("All");
  const [selectedYear, setSelectedYear] = useState("All");
  const [monthDefaultApplied, setMonthDefaultApplied] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_STORAGE_KEY) === "collapsed";
    } catch {
      return false;
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(MOBILE_MQ).matches : false
  );

  const isAdmin = currentUser?.role === "admin";

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, sidebarCollapsed ? "collapsed" : "expanded");
    } catch {
      /* ignore */
    }
  }, [sidebarCollapsed]);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ);
    const onChange = () => {
      setIsMobile(mq.matches);
      if (!mq.matches) setMobileOpen(false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [stackFilter, profileFilter, statusFilter, selectedMonth, selectedYear, pageSize, searchQuery]);

  useEffect(() => {
    const handleHashChange = () => setCurrentHash(window.location.hash);
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const activeProjectId = useMemo(() => {
    const match = currentHash.match(/^#\/project\/(.+)$/);
    return match ? match[1] : null;
  }, [currentHash]);

  const activeProject = useMemo(
    () => projects.find((p) => p.id === activeProjectId),
    [projects, activeProjectId]
  );

  const activeClientProject = useMemo(
    () => clientProjects.find((cp) => cp.id === activeClientProjectId) || null,
    [clientProjects, activeClientProjectId]
  );

  async function refreshClientProjects() {
    try {
      const rows = await loadClientProjects();
      setClientProjects(rows);
    } catch (err) {
      console.error(err);
    }
  }

  const availableYears = useMemo(() => {
    const years = projects.map((p) => getFilterMonthYear(p).year).filter(Boolean);
    return [...new Set(years)].sort((a, b) => a - b);
  }, [projects]);

  const hasSheetTabs = useMemo(
    () => projects.some((p) => Boolean(p.sheetTab)),
    [projects]
  );

  // Default calendar filter to the most recent month present in the data (once).
  useEffect(() => {
    if (monthDefaultApplied || !projects.length) return;

    let best = null;
    for (const p of projects) {
      const { month, year } = getFilterMonthYear(p);
      if (!month || !year) continue;
      const key = year * 12 + month;
      if (!best || key > best.key) best = { month, year, key };
    }

    if (best) {
      setSelectedMonth(best.month);
      setSelectedYear(best.year);
    }
    setMonthDefaultApplied(true);
  }, [projects, monthDefaultApplied]);

  async function runSheetSync({ silent = false } = {}) {
    setSyncing(true);
    if (!silent) setSaveState("Syncing from Google Sheets…");
    try {
      const result = await syncFromSheets();
      setProjects(result.projects);
      setGoogleStatus((prev) => ({
        ...(prev || {}),
        connected: true,
        lastSyncAt: result.lastSyncAt,
      }));
      await refreshClientProjects().catch(() => {});
      const tabs = result.sheetTitles?.length
        ? result.sheetTitles.length
        : result.sheetTitle
          ? 1
          : 0;
      setSaveState(
        tabs > 1
          ? `Synced ${result.count} rows from ${tabs} tabs`
          : `Synced ${result.count} rows from Sheets`
      );
      return result;
    } catch (err) {
      console.error(err);
      if (!silent) setSaveState(err.message || "Sheet sync failed");
      throw err;
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const user = await fetchMe();
        if (cancelled) return;
        setCurrentUser(user);
      } catch (err) {
        console.error(err);
        if (!cancelled) setCurrentUser(null);
      } finally {
        if (!cancelled) setSessionChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setLoaded(false);
      setProjects([]);
      return undefined;
    }

    let cancelled = false;
    (async () => {
      setLoaded(false);
      try {
        localStorage.removeItem("delivery-ops-projects");
        localStorage.removeItem("delivery-ops-projects-version");

        const params = new URLSearchParams(window.location.search);
        const googleFlag = params.get("google");
        if (googleFlag) {
          const message = params.get("message");
          window.history.replaceState({}, "", window.location.pathname + window.location.hash);
          if (googleFlag === "connected") {
            setSaveState("Google connected — syncing sheet…");
          } else if (googleFlag === "error") {
            setSaveState(`Google auth failed${message ? `: ${message}` : ""}`);
          }
        }

        const { projects: rows, canWrite } = await loadProjectsFromDb();
        if (cancelled) return;
        setProjects(rows);
        setCanWriteDb(canWrite);
        try {
          const cps = await loadClientProjects();
          if (!cancelled) setClientProjects(cps);
        } catch (err) {
          console.error(err);
        }

        if (currentUser.role === "admin") {
          const status = await getGoogleStatus().catch(() => null);
          if (cancelled) return;
          if (status) setGoogleStatus(status);

          if (status?.connected || googleFlag === "connected") {
            try {
              const result = await syncFromSheets();
              if (cancelled) return;
              setProjects(result.projects);
              setGoogleStatus((prev) => ({
                ...(prev || status || {}),
                connected: true,
                lastSyncAt: result.lastSyncAt,
              }));
              try {
                const cps = await loadClientProjects();
                if (!cancelled) setClientProjects(cps);
              } catch {
                /* ignore */
              }
              const tabs = result.sheetTitles?.length || (result.sheetTitle ? 1 : 0);
              setSaveState(
                tabs > 1
                  ? `Synced ${result.count} rows from ${tabs} tabs`
                  : `Synced ${result.count} rows from Sheets`
              );
            } catch (err) {
              console.error(err);
              if (!cancelled) setSaveState(err.message || "Sheet sync failed");
            }
          }
        }
      } catch (err) {
        console.error(err);
        if (err.code === 401) {
          setCurrentUser(null);
        } else if (!cancelled) {
          setSaveState(err.message || "Failed to load projects");
        }
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUser?.id, currentUser?.role]);

  useEffect(() => {
    if (!isAdmin || !googleStatus?.connected) return undefined;
    const id = setInterval(() => {
      runSheetSync({ silent: true }).catch(() => {});
    }, SHEETS_POLL_MS);
    return () => clearInterval(id);
  }, [isAdmin, googleStatus?.connected]);

  async function handleLogout() {
    await apiLogout().catch(() => {});
    setCurrentUser(null);
    setProjects([]);
    setClientProjects([]);
    setActiveClientProjectId(null);
    setView("dashboard");
    setGoogleStatus(null);
    setSaveState("");
    setSelectedMonth("All");
    setSelectedYear("All");
    setMonthDefaultApplied(false);
    window.location.hash = "";
  }

  async function persistProjects(nextProjects) {
    setProjects(nextProjects);
    if (!canWriteDb) {
      setSaveState("Read-only on Vercel — edit via npm run dev to update JSON, then redeploy");
      return;
    }
    try {
      setSaveState("Saving…");
      await saveProjectsToDb(nextProjects);
      setSaveState("Saved to projects.json");
    } catch (err) {
      console.error(err);
      setSaveState(err.message || "Save failed");
    }
  }

  const monthFilteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const { month, year } = getFilterMonthYear(p);
      if (selectedMonth !== "All" && month !== selectedMonth) return false;
      if (selectedYear !== "All" && year !== selectedYear) return false;
      return true;
    });
  }, [projects, selectedMonth, selectedYear]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return monthFilteredProjects.filter((p) => {
      if (stackFilter !== "All" && getProjectStack(p) !== stackFilter) return false;
      if (profileFilter !== "All" && p.profile !== profileFilter) return false;
      if (statusFilter !== "All" && statusOf(p) !== statusFilter) return false;
      if (q) {
        const haystack = [
          p.projectName,
          p.orderId,
          p.orderUrl,
          p.salesPerson,
          p.teamName,
          p.profile,
          p.phase,
          p.stack,
          p.dateline,
          p.salesStatus,
          p.teamLeadStatus,
          p.supervisor,
          p.sheetTab,
          p.membersRaw,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [monthFilteredProjects, stackFilter, profileFilter, statusFilter, searchQuery]);

  const kpis = useMemo(() => {
    const total = monthFilteredProjects.length;
    const totalValue = monthFilteredProjects.reduce((s, p) => s + Number(p.price || 0), 0);
    const delivered = monthFilteredProjects.filter((p) => statusOf(p) === "delivered");
    const wip = monthFilteredProjects.filter((p) => statusOf(p) === "wip");
    return {
      total,
      totalValue,
      deliveredCount: delivered.length,
      deliveredValue: delivered.reduce((s, p) => s + Number(p.price || 0), 0),
      wipCount: wip.length,
      wipValue: wip.reduce((s, p) => s + Number(p.price || 0), 0),
    };
  }, [monthFilteredProjects]);

  const byStack = useMemo(() => {
    return STACKS.map((s) => {
      const rows = monthFilteredProjects.filter((p) => getProjectStack(p) === s);
      const delivered = rows.filter((p) => statusOf(p) === "delivered").length;
      const wip = rows.filter((p) => statusOf(p) === "wip").length;
      const value = rows.reduce((s2, p) => s2 + Number(p.price || 0), 0);
      return {
        stack: s,
        name: s,
        delivered,
        wip,
        total: rows.length,
        value,
        pct: rows.length ? Math.round((delivered / rows.length) * 100) : 0,
      };
    }).filter((d) => d.total > 0);
  }, [monthFilteredProjects]);

  const byProfile = useMemo(() => {
    return PROFILES.map((pf) => {
      const rows = monthFilteredProjects.filter((p) => p.profile === pf);
      const value = rows.reduce((s, p) => s + Number(p.price || 0), 0);
      const delivered = rows.filter((p) => statusOf(p) === "delivered").length;
      return { profile: pf, name: PROFILE_SHORT[pf], total: rows.length, value, delivered };
    });
  }, [monthFilteredProjects]);

  const statusPie = useMemo(
    () => [
      { name: "Delivered", value: kpis.deliveredCount, color: colors.delivered },
      { name: "WIP", value: kpis.wipCount, color: colors.wip },
    ].filter((d) => d.value > 0),
    [kpis, colors.delivered, colors.wip]
  );

  const timeline = useMemo(() => {
    const map = {};
    monthFilteredProjects.forEach((p) => {
      const key = p.date || "unknown";
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map)
      .sort((a, b) => new Date(a[0]) - new Date(b[0]))
      .map(([date, count]) => ({ date, count }));
  }, [monthFilteredProjects]);

  function openAdd() {
    setForm({
      ...emptyForm,
      date:
        selectedMonth !== "All" && selectedYear !== "All"
          ? `${selectedMonth}/1/${selectedYear}`
          : new Date().toLocaleDateString("en-US"),
    });
    setEditingId(null);
    setModalOpen(true);
  }

  function openEdit(p) {
    const nonSupMembers = p.teamMembers
      ? p.teamMembers.filter((m) => m.role !== "Supervisor").map((m) => m.name).join(", ")
      : "";
    setForm({
      ...emptyForm,
      ...p,
      price: String(p.price ?? ""),
      stack: getProjectStack(p),
      teamName: p.teamName || "",
      orderId: p.orderId || "",
      orderUrl: p.orderUrl || "",
      supervisor:
        p.supervisor ||
        (p.teamMembers ? p.teamMembers.find((m) => m.role === "Supervisor")?.name || "" : ""),
      membersRaw: p.membersRaw || nonSupMembers,
    });
    setEditingId(p.id);
    setModalOpen(true);
  }

  function saveForm() {
    if (!form.projectName.trim()) return;
    const orderId = extractOrderId(form.orderId || form.orderUrl);
    const orderUrl =
      form.orderUrl?.trim() ||
      (orderId ? `https://www.fiverr.com/orders/${orderId}/activities` : "");

    const existingTeamMembers = editingId
      ? projects.find((project) => project.id === editingId)?.teamMembers || []
      : [];
    // The quick-edit modal has legacy single-role fields. Preserve richer role assignments
    // created from the project detail screen instead of flattening them on save.
    const preserveMultiRoleTeam = existingTeamMembers.some((member) => Array.isArray(member.roles) && member.roles.length > 1);
    const teamMembers = preserveMultiRoleTeam ? existingTeamMembers : [];
    const seenNames = new Set();
    const supervisorVal = (form.supervisor || "").trim();
    if (!preserveMultiRoleTeam && supervisorVal) {
      teamMembers.push({
        id: `sup-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        name: supervisorVal,
        role: "Supervisor",
      });
      seenNames.add(supervisorVal.toLowerCase());
    }

    const membersRawVal = (form.membersRaw || "").trim();
    if (!preserveMultiRoleTeam && membersRawVal) {
      const list = membersRawVal.split(",").map((m) => m.trim()).filter(Boolean);
      list.forEach((name) => {
        if (!seenNames.has(name.toLowerCase())) {
          teamMembers.push({
            id: `mem-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            name,
            role: getDeveloperRole(form.stack || deriveStack(form.phase)),
          });
          seenNames.add(name.toLowerCase());
        }
      });
    }

    const payload = {
      ...form,
      price: Number(form.price) || 0,
      stack: form.stack || deriveStack(form.phase),
      orderId,
      orderUrl,
      teamMembers,
      subtasks: form.subtasks || [
        { id: "1", text: "Requirements gathering & analysis", completed: false },
        { id: "2", text: "UI/UX Mockup design", completed: false },
        { id: "3", text: "Core API development", completed: false },
        { id: "4", text: "Frontend integration & testing", completed: false },
        { id: "5", text: "Client review & revisions", completed: false },
        { id: "6", text: "Final deployment & delivery", completed: false },
      ],
      notes: form.notes || "",
      extensions: Array.isArray(form.extensions)
        ? form.extensions
        : editingId
          ? projects.find((p) => p.id === editingId)?.extensions || []
          : [],
      deliveryDate:
        form.deliveryDate ||
        (editingId ? projects.find((p) => p.id === editingId)?.deliveryDate || "" : ""),
    };
    const next = editingId
      ? projects.map((p) => (p.id === editingId ? { ...payload, id: editingId } : p))
      : [...projects, { ...payload, id: `p-${Date.now()}` }];
    persistProjects(next);
    setModalOpen(false);
  }

  function doDelete(id) {
    persistProjects(projects.filter((p) => p.id !== id));
    setConfirmDelete(null);
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(projects, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "projects.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function importJson(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        if (Array.isArray(parsed)) persistProjects(normalizeProjects(parsed));
      } catch {
        alert("That file isn't valid JSON from this dashboard.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  if (!sessionChecked) {
    return (
      <div
        style={{
          background: `linear-gradient(160deg, ${colors.bg} 0%, ${colors.bgAccent} 100%)`,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
        }}
      >
        <RunningHorseLoader size={52} />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <>
        <style>{FONTS}</style>
        <LoginPage onLoggedIn={(user) => setCurrentUser(user)} />
      </>
    );
  }

  if (!loaded) {
    return (
      <div
        style={{
          background: `linear-gradient(160deg, ${colors.bg} 0%, ${colors.bgAccent} 100%)`,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
        }}
      >
        <RunningHorseLoader size={52} />
      </div>
    );
  }

  return (
    <div
      style={{
        background: isDark
          ? `linear-gradient(160deg, ${colors.bg} 0%, ${colors.bgAccent} 55%, #10151D 100%)`
          : `linear-gradient(160deg, ${colors.bg} 0%, #F2F5FA 48%, ${colors.bgAccent} 100%)`,
        color: colors.text,
        minHeight: "100%",
        fontFamily: "Manrope, sans-serif",
      }}
    >
      <style>{FONTS}{`
        ::-webkit-scrollbar { height: 8px; width: 8px; }
        ::-webkit-scrollbar-thumb { background: ${colors.border}; border-radius: 8px; }
        .mono { font-family: 'IBM Plex Mono', monospace; }
        .disp { font-family: 'Manrope', sans-serif; }
        button { cursor: pointer; font-family: inherit; }
        input, select { font-family: 'Manrope', sans-serif; }
        .chip { transition: all .15s ease; }
        .project-link { color: ${colors.accent}; text-decoration: none; font-weight: 700; transition: color .15s ease; }
        .project-link:hover { color: ${isDark ? colors.accentSoft : "#3B4558"}; text-decoration: underline; }
        .month-scroll::-webkit-scrollbar { display: none; }
        .month-scroll { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 0.9s linear infinite; }
        .table-row { transition: background .12s ease; }
        .table-row:hover td { background: ${colors.rowHover} !important; }
        .analytics-kpis { display: grid; grid-template-columns: repeat(6, minmax(150px, 1fr)); gap: 12px; }
        .analytics-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; align-items: start; }
        @media (max-width: 900px) {
          .charts-grid { grid-template-columns: 1fr !important; }
          .analytics-kpis { grid-template-columns: repeat(3, minmax(150px, 1fr)); }
        }
        @media (max-width: 640px) {
          .analytics-kpis, .analytics-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      {isMobile && mobileOpen ? (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: colors.overlay,
            zIndex: 70,
          }}
        />
      ) : null}

      <div style={{ display: "flex", minHeight: "100vh", alignItems: "stretch" }}>
        <AppSidebar
          collapsed={sidebarCollapsed}
          mobileOpen={mobileOpen}
          isMobile={isMobile}
          currentUser={currentUser}
          isAdmin={isAdmin}
          activeView={
            view === "users" && isAdmin
              ? "users"
              : view === "analytics"
                ? "analytics"
              : view === "clientProjectDetail"
                ? "clientProjectDetail"
                : view === "clientProjects"
                  ? "clientProjects"
                  : "dashboard"
          }
          googleStatus={googleStatus}
          syncing={syncing}
          onGoDashboard={() => {
            setView("dashboard");
            setActiveClientProjectId(null);
            window.location.hash = "";
          }}
          onOpenAnalytics={() => {
            setView("analytics");
            setActiveClientProjectId(null);
            window.location.hash = "";
          }}
          onOpenClientProjects={() => {
            setView("clientProjects");
            setActiveClientProjectId(null);
            window.location.hash = "";
            refreshClientProjects();
          }}
          onOpenUsers={() => {
            setView("users");
            setActiveClientProjectId(null);
            window.location.hash = "";
          }}
          onSync={() => runSheetSync().catch(() => {})}
          onConnectGoogle={() => {
            window.location.href = getGoogleAuthUrl();
          }}
          onExport={exportJson}
          onImport={importJson}
          onLogout={handleLogout}
          onCloseMobile={() => setMobileOpen(false)}
        />

        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <DashboardHeader
            title={
              view === "users" && isAdmin
                ? "User management"
                : view === "analytics"
                  ? "Analytics"
                : view === "clientProjectDetail" && activeClientProject
                  ? activeClientProject.projectName
                  : view === "clientProjects"
                    ? "Projects"
                    : activeProject
                      ? activeProject.projectName
                      : "Projects Ops Console"
            }
            saveState={saveState}
            canWriteDb={canWriteDb}
            currentUser={currentUser}
            isAdmin={isAdmin}
            showNewProject={view === "dashboard" && !activeProject}
            collapsed={sidebarCollapsed}
            isMobile={isMobile}
            mobileOpen={mobileOpen}
            onToggleSidebar={() => {
              if (isMobile) setMobileOpen((open) => !open);
              else setSidebarCollapsed((c) => !c);
            }}
            onAdd={openAdd}
          />

          {view === "users" && isAdmin ? (
            <UsersAdmin projects={projects} clientProjects={clientProjects} />
          ) : view === "analytics" ? (
            <AnalyticsDashboard projects={projects} />
          ) : view === "clientProjectDetail" && activeClientProject ? (
            <ClientProjectDetail
              clientProject={activeClientProject}
              phases={projects}
              isAdmin={isAdmin}
              onBack={() => {
                setView("clientProjects");
                setActiveClientProjectId(null);
              }}
              onUpdate={async (updated) => {
                try {
                  const saved = await patchClientProject(updated.id, {
                    teamMembers: updated.teamMembers,
                    supervisor: updated.supervisor,
                    membersRaw: updated.membersRaw,
                    notes: updated.notes,
                  });
                  setClientProjects((prev) => prev.map((cp) => (cp.id === saved.id ? saved : cp)));
                  setSaveState("Client project saved");
                } catch (err) {
                  setSaveState(err.message || "Failed to save client project");
                }
              }}
              onOpenPhase={(phaseId) => {
                setView("dashboard");
                window.location.hash = `#/project/${phaseId}`;
              }}
            />
          ) : view === "clientProjects" ? (
            <ClientProjects
              clientProjects={clientProjects}
              phases={projects}
              onOpen={(cp) => {
                setActiveClientProjectId(cp.id);
                setView("clientProjectDetail");
              }}
            />
          ) : activeProject ? (
            <ProjectDetails
              project={activeProject}
              isAdmin={isAdmin}
              onBack={() => {
                window.location.hash = "";
              }}
              onUpdate={(updated) => persistProjects(projects.map((p) => (p.id === updated.id ? updated : p)))}
              onDelete={(id) => {
                if (!isAdmin) return;
                persistProjects(projects.filter((p) => p.id !== id));
                window.location.hash = "";
              }}
            />
          ) : (
            <div style={{ padding: "20px 16px 48px", maxWidth: 1400, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
              <CalendarFilter
                availableYears={availableYears}
                selectedYear={selectedYear}
                selectedMonth={selectedMonth}
                onYearChange={setSelectedYear}
                onMonthChange={setSelectedMonth}
                mode={hasSheetTabs ? "sheetTab" : "date"}
              />

              <DueSoonBanner projects={monthFilteredProjects} />

              <KpiStrip kpis={kpis} />
              <StackWorkload byStack={byStack} projects={monthFilteredProjects} />
              <ProfileWorkload byProfile={byProfile} />
              <ChartsSection byStack={byStack} statusPie={statusPie} timeline={timeline} />

              <ProjectFilters
                stackFilter={stackFilter}
                statusFilter={statusFilter}
                profileFilter={profileFilter}
                onStackChange={setStackFilter}
                onStatusChange={setStatusFilter}
                onProfileChange={setProfileFilter}
              />

              <ProjectSearch
                value={searchQuery}
                onChange={setSearchQuery}
                resultCount={filtered.length}
              />

              <ProjectsTable
                projects={filtered}
                totalCount={projects.length}
                currentPage={currentPage}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
                onEdit={openEdit}
                onDelete={setConfirmDelete}
                canManage={isAdmin}
              />
            </div>
          )}
        </div>
      </div>

      {modalOpen && isAdmin && (
        <ProjectFormModal
          editingId={editingId}
          form={form}
          onChange={setForm}
          onClose={() => setModalOpen(false)}
          onSave={saveForm}
        />
      )}

      {confirmDelete && isAdmin && (
        <DeleteConfirmModal
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => doDelete(confirmDelete)}
        />
      )}
    </div>
  );
}
