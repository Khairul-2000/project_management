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
import DashboardAlerts from "./components/DashboardAlerts";
import AnalyticsDashboard from "./components/AnalyticsDashboard";
import UserProfile from "./components/UserProfile";
import HeroMetricStrip from "./components/HeroMetricStrip";
import {
  FONTS,
  PROFILES,
  PROFILE_SHORT,
  formatProfileName,
  extractProfiles,
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
  normalizePossibility,
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
import {
  isAdminRole,
  isSuperAdmin,
  canDeleteProjects,
  canViewFinancials,
  canChangeDeliveryStatus,
  canCreateProjects,
} from "./lib/roles";
import { exportProjectsToCsv, parseCsvToProjects } from "./lib/csvHelper";

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
  const [possibilityFilter, setPossibilityFilter] = useState("All");
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

  const isAdmin = isAdminRole(currentUser);
  const canAssignAdmins = isSuperAdmin(currentUser);
  const [memberOnlyView, setMemberOnlyView] = useState(false);

  // Only the Users Admin view is strictly restricted to admins
  useEffect(() => {
    if (!currentUser || isAdmin) return;
    if (view === "users") {
      setView("dashboard");
      setActiveClientProjectId(null);
    }
  }, [currentUser, isAdmin, view]);

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
  }, [stackFilter, profileFilter, statusFilter, possibilityFilter, selectedMonth, selectedYear, pageSize, searchQuery]);

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
      if (err.message?.includes("expired") || err.message?.includes("re-authenticate") || err.message?.includes("invalid_grant")) {
        setGoogleStatus((prev) => ({ ...(prev || {}), connected: false }));
      }
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
        if (!isAdminRole(currentUser)) {
          setView("clientProjects");
          setActiveClientProjectId(null);
        }
        try {
          const cps = await loadClientProjects();
          if (!cancelled) setClientProjects(cps);
        } catch (err) {
          console.error(err);
        }

        if (isAdminRole(currentUser)) {
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
              if (err.message?.includes("expired") || err.message?.includes("re-authenticate") || err.message?.includes("invalid_grant")) {
                setGoogleStatus((prev) => ({ ...(prev || {}), connected: false }));
              }
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
      // Phase team edits roll up into client projects on the server
      await refreshClientProjects().catch(() => {});
      setSaveState("Saved changes");
      setTimeout(() => setSaveState(""), 2500);
    } catch (err) {
      console.error(err);
      setSaveState(err.message || "Save failed");
    }
  }


  function handleInlineStatusChange(project, nextStatus) {
    const status = nextStatus.toLowerCase() === "delivered" ? "Delivered" : "WIP";
    const updated = {
      ...project,
      teamLeadStatus: status,
      salesStatus: status,
    };
    persistProjects(projects.map((p) => (p.id === project.id ? updated : p)));
  }

  function handleBulkUpdateStatus(ids, status) {
    const idSet = new Set(ids);
    const formattedStatus = status.toLowerCase() === "delivered" ? "Delivered" : "WIP";
    const next = projects.map((p) => {
      if (idSet.has(p.id)) {
        return {
          ...p,
          teamLeadStatus: formattedStatus,
          salesStatus: formattedStatus,
        };
      }
      return p;
    });
    persistProjects(next);
    setSaveState(`Updated ${ids.length} projects to ${status}`);
    setTimeout(() => setSaveState(""), 3000);
  }

  function handleBulkDelete(ids) {
    if (!canDeleteProjects(currentUser)) return;
    const idSet = new Set(ids);
    const next = projects.filter((p) => !idSet.has(p.id));
    persistProjects(next);
    setSaveState(`Deleted ${ids.length} projects`);
    setTimeout(() => setSaveState(""), 3000);
  }

  function handleResetFilters() {
    setStackFilter("All");
    setStatusFilter("All");
    setProfileFilter("All");
    setPossibilityFilter("All");
    setSearchQuery("");
  }

  function handleExportCsv() {
    exportProjectsToCsv(filtered, `delivery-ops-${selectedMonth}-${selectedYear}.csv`);
  }

  function handleImportCsv(csvString) {
    try {
      const imported = parseCsvToProjects(csvString);
      if (imported.length === 0) {
        alert("No valid project rows found in the CSV file.");
        return;
      }
      const next = [...imported, ...projects];
      persistProjects(next);
      setSaveState(`Imported ${imported.length} projects from CSV`);
      setTimeout(() => setSaveState(""), 3000);
    } catch (err) {
      alert("Failed to parse CSV: " + err.message);
    }
  }

  const monthFilteredProjects = useMemo(() => {
    return projects.filter((p) => {
      if (!isAdmin && memberOnlyView && currentUser) {
        const assignedIds = new Set((currentUser.assignedProjectIds || []).map(String));
        const uName = (currentUser.name || "").toLowerCase();
        const uUser = (currentUser.username || "").toLowerCase();
        const inTeam = (p.teamMembers || []).some((m) => {
          const mName = (m.name || "").toLowerCase();
          return mName.includes(uName) || mName.includes(uUser);
        });
        if (!assignedIds.has(String(p.id)) && !inTeam) return false;
      }
      const { month, year } = getFilterMonthYear(p);
      if (selectedMonth !== "All" && month !== selectedMonth) return false;
      if (selectedYear !== "All" && year !== selectedYear) return false;
      return true;
    });
  }, [projects, selectedMonth, selectedYear, isAdmin, memberOnlyView, currentUser]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return monthFilteredProjects.filter((p) => {
      if (stackFilter !== "All" && getProjectStack(p) !== stackFilter) return false;
      if (profileFilter !== "All" && p.profile !== profileFilter) return false;
      if (statusFilter !== "All" && statusOf(p) !== statusFilter) return false;
      if (possibilityFilter !== "All" && normalizePossibility(p.possibility) !== possibilityFilter) {
        return false;
      }
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
          p.possibility,
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
  }, [monthFilteredProjects, stackFilter, profileFilter, statusFilter, possibilityFilter, searchQuery]);

  const kpis = useMemo(() => {
    const total = monthFilteredProjects.length;
    const totalValue = monthFilteredProjects.reduce((s, p) => s + Number(p.price || 0), 0);
    const delivered = monthFilteredProjects.filter((p) => statusOf(p) === "delivered");
    const wip = monthFilteredProjects.filter((p) => statusOf(p) === "wip");
    const possible = monthFilteredProjects.filter((p) => normalizePossibility(p.possibility) === "Yes");
    return {
      total,
      totalValue,
      deliveredCount: delivered.length,
      deliveredValue: delivered.reduce((s, p) => s + Number(p.price || 0), 0),
      wipCount: wip.length,
      wipValue: wip.reduce((s, p) => s + Number(p.price || 0), 0),
      possibleCount: possible.length,
      possibleValue: possible.reduce((s, p) => s + Number(p.price || 0), 0),
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

  const allProfiles = useMemo(() => {
    return extractProfiles(projects);
  }, [projects]);

  const byProfile = useMemo(() => {
    const map = new Map();

    // 1. Gather all profiles from projects in the active timeframe
    for (const p of monthFilteredProjects) {
      const pf = String(p.profile || "").trim();
      if (!pf) continue;
      if (!map.has(pf)) {
        map.set(pf, {
          profile: pf,
          name: formatProfileName(pf),
          total: 0,
          value: 0,
          delivered: 0,
        });
      }
      const item = map.get(pf);
      item.total += 1;
      item.value += Number(p.price || 0);
      if (statusOf(p) === "delivered") item.delivered += 1;
    }

    // 2. Ensure all known profiles from all synced projects are represented
    for (const pf of allProfiles) {
      if (!map.has(pf)) {
        map.set(pf, {
          profile: pf,
          name: formatProfileName(pf),
          total: 0,
          value: 0,
          delivered: 0,
        });
      }
    }

    // Sort: active profiles first (descending total orders, then value), then alphabetical
    return Array.from(map.values()).sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      if (b.value !== a.value) return b.value - a.value;
      return a.name.localeCompare(b.name);
    });
  }, [monthFilteredProjects, allProfiles]);

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
      possibility: normalizePossibility(form.possibility),
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
          ? `radial-gradient(circle at 85% 15%, rgba(247, 206, 70, 0.08) 0%, transparent 50%), ${colors.bg}`
          : `radial-gradient(circle at 85% 15%, rgba(247, 206, 70, 0.22) 0%, transparent 45%), radial-gradient(circle at 10% 90%, rgba(247, 206, 70, 0.14) 0%, transparent 40%), ${colors.bg}`,
        color: colors.text,
        minHeight: "100%",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      <style>{FONTS}{`
        ::-webkit-scrollbar { height: 8px; width: 8px; }
        ::-webkit-scrollbar-thumb { background: ${colors.border}; border-radius: 8px; }
        .mono { font-family: 'IBM Plex Mono', monospace; }
        .disp { font-family: 'Plus Jakarta Sans', sans-serif; }
        button { cursor: pointer; font-family: 'Plus Jakarta Sans', sans-serif; }
        input, select { font-family: 'Plus Jakarta Sans', sans-serif; }
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
        .bento-top-grid { display: grid; grid-template-columns: 310px 1fr; gap: 16px; margin-bottom: 16px; align-items: start; }
        .schedule-task-grid { display: grid; grid-template-columns: 1.25fr 0.95fr; gap: 16px; margin-bottom: 16px; }
        @media (max-width: 1060px) {
          .bento-top-grid { grid-template-columns: 1fr !important; }
          .schedule-task-grid { grid-template-columns: 1fr !important; }
        }
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
              : view === "analytics" && isAdmin
                ? "analytics"
                : view === "profile"
                  ? "profile"
                  : view === "clientProjectDetail" || activeProject
                    ? "clientProjectDetail"
                    : view === "clientProjects" || (!isAdmin && view !== "profile")
                      ? "clientProjects"
                      : "dashboard"
          }
          googleStatus={googleStatus}
          syncing={syncing}
          onGoDashboard={() => {
            if (!isAdmin) {
              setView("clientProjects");
              setActiveClientProjectId(null);
              window.location.hash = "";
              return;
            }
            setView("dashboard");
            setActiveClientProjectId(null);
            window.location.hash = "";
          }}
          onOpenAnalytics={() => {
            if (!isAdmin) return;
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
            if (!isAdmin) return;
            setView("users");
            setActiveClientProjectId(null);
            window.location.hash = "";
          }}
          onOpenProfile={() => {
            setView("profile");
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
              activeProject
                ? activeProject.projectName
                : view === "users" && isAdmin
                  ? "User Management"
                  : view === "analytics" && isAdmin
                    ? "Analytics"
                    : view === "clientProjectDetail" && activeClientProject
                      ? activeClientProject.projectName
                      : view === "clientProjects"
                        ? "Projects"
                        : "Projects Ops Console"
            }
            saveState={saveState}
            canWriteDb={canWriteDb}
            currentUser={currentUser}
            isAdmin={isAdmin}
            showNewProject={isAdmin && (view === "dashboard" || view === "clientProjects") && !activeProject}
            collapsed={sidebarCollapsed}
            isMobile={isMobile}
            mobileOpen={mobileOpen}
            onToggleSidebar={() => {
              if (isMobile) setMobileOpen((open) => !open);
              else setSidebarCollapsed((c) => !c);
            }}
            onAdd={openAdd}
            memberOnlyView={memberOnlyView}
            onToggleMemberOnlyView={() => setMemberOnlyView((v) => !v)}
            activeView={
              view === "users" && isAdmin
                ? "users"
                : view === "analytics" && isAdmin
                  ? "analytics"
                  : view === "profile"
                    ? "profile"
                    : view === "clientProjectDetail" || activeProject
                      ? "clientProjectDetail"
                      : view === "clientProjects" || (!isAdmin && view !== "profile")
                        ? "clientProjects"
                        : "dashboard"
            }
            onNavigate={(dest) => {
              if (dest === "dashboard") {
                if (!isAdmin) {
                  setView("clientProjects");
                  setActiveClientProjectId(null);
                  window.location.hash = "";
                  return;
                }
                setView("dashboard");
                setActiveClientProjectId(null);
                window.location.hash = "";
              } else if (dest === "analytics") {
                if (!isAdmin) return;
                setView("analytics");
                setActiveClientProjectId(null);
                window.location.hash = "";
              } else if (dest === "clientProjects") {
                setView("clientProjects");
                setActiveClientProjectId(null);
                window.location.hash = "";
                refreshClientProjects();
              } else if (dest === "users") {
                if (!isAdmin) return;
                setView("users");
                setActiveClientProjectId(null);
                window.location.hash = "";
              } else if (dest === "profile") {
                setView("profile");
                setActiveClientProjectId(null);
                window.location.hash = "";
              }
            }}
          />

          {view === "profile" ? (
            <UserProfile
              currentUser={currentUser}
              onUpdateUser={(updated) => setCurrentUser({ ...currentUser, ...updated })}
            />
          ) : view === "users" && isAdmin ? (
            <UsersAdmin projects={projects} clientProjects={clientProjects} currentUser={currentUser} />
          ) : view === "analytics" && isAdmin ? (
            <AnalyticsDashboard projects={projects} />
          ) : activeProject ? (
            <ProjectDetails
              project={activeProject}
              isAdmin={isAdmin}
              currentUser={currentUser}
              includeStaff={canAssignAdmins}
              backLabel={
                activeClientProjectId || view === "clientProjects" || view === "clientProjectDetail"
                  ? "Back to Projects"
                  : "Back to Dashboard"
              }
              onBack={() => {
                window.location.hash = "";
                // Opened from Projects → client project → phase
                if (activeClientProjectId) {
                  setView("clientProjectDetail");
                  return;
                }
                // Stay on analytics/users if opened from there
                if (view === "analytics" || view === "users") {
                  return;
                }
                // Opened from Projects list (no client context)
                if (view === "clientProjects" || view === "clientProjectDetail") {
                  setView("clientProjects");
                  setActiveClientProjectId(null);
                  return;
                }
                // Opened from dashboard table / alerts / stack modal
                setView("dashboard");
                setActiveClientProjectId(null);
              }}
              onUpdate={(updated) => persistProjects(projects.map((p) => (p.id === updated.id ? updated : p)))}
              onDelete={(id) => {
                if (!canDeleteProjects(currentUser)) return;
                persistProjects(projects.filter((p) => p.id !== id));
                window.location.hash = "";
                if (activeClientProjectId) {
                  setView("clientProjectDetail");
                  return;
                }
                setView("dashboard");
              }}
            />
          ) : view === "clientProjectDetail" && activeClientProject ? (
            <ClientProjectDetail
              clientProject={activeClientProject}
              phases={projects}
              isAdmin={isAdmin}
              currentUser={currentUser}
              includeStaff={canAssignAdmins}
              onBack={() => {
                setView("clientProjects");
                setActiveClientProjectId(null);
              }}
              onUpdate={async (updated) => {
                try {
                  const { clientProject: saved } = await patchClientProject(updated.id, {
                    teamMembers: updated.teamMembers,
                    supervisor: updated.supervisor,
                    membersRaw: updated.membersRaw,
                    notes: updated.notes,
                  });
                  setClientProjects((prev) => prev.map((cp) => (cp.id === saved.id ? saved : cp)));
                  // Reload phases so role-matched team push is visible immediately
                  const { projects: rows } = await loadProjectsFromDb();
                  setProjects(rows);
                  setSaveState("Client project saved");
                } catch (err) {
                  setSaveState(err.message || "Failed to save client project");
                }
              }}
              onOpenPhase={(phaseId) => {
                // Stay in Projects flow so Back returns to this client project
                setView("clientProjectDetail");
                window.location.hash = `#/project/${phaseId}`;
              }}
            />
          ) : view === "clientProjects" ? (
            <ClientProjects
              clientProjects={clientProjects}
              phases={projects}
              isAdmin={isAdmin}
              onOpen={(cp) => {
                setActiveClientProjectId(cp.id);
                setView("clientProjectDetail");
              }}
            />
          ) : (
            <div style={{ padding: "20px 24px 64px", maxWidth: 1440, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
              {/* Crextio Hero Greeting & Metric Counters */}
              <HeroMetricStrip
                kpis={kpis}
                currentUser={currentUser}
                canViewFinancials={canViewFinancials(currentUser)}
              />

              <CalendarFilter
                availableYears={availableYears}
                selectedYear={selectedYear}
                selectedMonth={selectedMonth}
                onYearChange={setSelectedYear}
                onMonthChange={setSelectedMonth}
                mode={hasSheetTabs ? "sheetTab" : "date"}
              />

              <DashboardAlerts projects={projects} />

              <KpiStrip kpis={kpis} canViewFinancials={canViewFinancials(currentUser)} />

              {/* Workload Bento Grid: Department & Fiverr Profile side-by-side */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))",
                  gap: 16,
                  marginBottom: 16,
                }}
              >
                <StackWorkload byStack={byStack} projects={monthFilteredProjects} />
                <ProfileWorkload
                  byProfile={byProfile}
                  onSelectProfile={(pf) => setProfileFilter((curr) => curr === pf ? "All" : pf)}
                />
              </div>

              <ChartsSection byStack={byStack} statusPie={statusPie} timeline={timeline} />

              <ProjectFilters
                projects={monthFilteredProjects}
                allProfiles={allProfiles}
                stackFilter={stackFilter}
                statusFilter={statusFilter}
                profileFilter={profileFilter}
                possibilityFilter={possibilityFilter}
                onStackChange={setStackFilter}
                onStatusChange={setStatusFilter}
                onProfileChange={setProfileFilter}
                onPossibilityChange={setPossibilityFilter}
                onResetFilters={handleResetFilters}
              />

              <ProjectSearch
                value={searchQuery}
                onChange={setSearchQuery}
                resultCount={filtered.length}
                onExportCsv={handleExportCsv}
                onImportCsv={handleImportCsv}
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
                onStatusChange={handleInlineStatusChange}
                onBulkUpdateStatus={handleBulkUpdateStatus}
                onBulkDelete={handleBulkDelete}
                onPossibilityChange={(project, value) => {
                  const next = normalizePossibility(value);
                  if (normalizePossibility(project.possibility) === next) return;
                  persistProjects(
                    projects.map((p) => (p.id === project.id ? { ...p, possibility: next } : p))
                  );
                }}
                canManage={isAdmin}
                canDelete={canDeleteProjects(currentUser)}
                canViewFinancials={canViewFinancials(currentUser)}
                canChangeStatus={canChangeDeliveryStatus(currentUser)}
              />
            </div>
          )}
        </div>
      </div>

      {modalOpen && isAdmin && (
        <ProjectFormModal
          editingId={editingId}
          form={form}
          availableProfiles={allProfiles}
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
