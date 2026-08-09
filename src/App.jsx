import { useState, useEffect, useMemo } from "react";
import ProjectDetails from "./components/ProjectDetails";
import DashboardHeader from "./components/DashboardHeader";
import CalendarFilter from "./components/CalendarFilter";
import KpiStrip from "./components/KpiStrip";
import StackWorkload from "./components/StackWorkload";
import ProfileWorkload from "./components/ProfileWorkload";
import ChartsSection from "./components/ChartsSection";
import ProjectFilters from "./components/ProjectFilters";
import ProjectsTable from "./components/ProjectsTable";
import ProjectFormModal from "./components/ProjectFormModal";
import DeleteConfirmModal from "./components/DeleteConfirmModal";
import {
  FONTS,
  COLORS,
  PROFILES,
  PROFILE_SHORT,
  STACKS,
  emptyForm,
} from "./lib/constants";
import {
  deriveStack,
  getDeveloperRole,
  getFilterMonthYear,
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
} from "./lib/db";

const SHEETS_POLL_MS = 2 * 60 * 1000;

export default function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [canWriteDb, setCanWriteDb] = useState(false);
  const [saveState, setSaveState] = useState("");
  const [googleStatus, setGoogleStatus] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [stackFilter, setStackFilter] = useState("All");
  const [profileFilter, setProfileFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [currentHash, setCurrentHash] = useState(window.location.hash);
  const [selectedMonth, setSelectedMonth] = useState("All");
  const [selectedYear, setSelectedYear] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [stackFilter, profileFilter, statusFilter, selectedMonth, selectedYear, pageSize]);

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

  const availableYears = useMemo(() => {
    const years = projects.map((p) => getFilterMonthYear(p).year).filter(Boolean);
    return [...new Set(years)].sort((a, b) => a - b);
  }, [projects]);

  const hasSheetTabs = useMemo(
    () => projects.some((p) => Boolean(p.sheetTab)),
    [projects]
  );

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

        const [{ projects: rows, canWrite }, status] = await Promise.all([
          loadProjectsFromDb(),
          getGoogleStatus().catch(() => null),
        ]);
        if (cancelled) return;
        setProjects(rows);
        setCanWriteDb(canWrite);
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
      } catch (err) {
        console.error(err);
        if (!cancelled) setSaveState("Failed to load JSON database");
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!googleStatus?.connected) return undefined;
    const id = setInterval(() => {
      runSheetSync({ silent: true }).catch(() => {});
    }, SHEETS_POLL_MS);
    return () => clearInterval(id);
  }, [googleStatus?.connected]);

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
    return monthFilteredProjects.filter((p) => {
      if (stackFilter !== "All" && (p.stack || deriveStack(p.phase)) !== stackFilter) return false;
      if (profileFilter !== "All" && p.profile !== profileFilter) return false;
      if (statusFilter !== "All" && statusOf(p) !== statusFilter) return false;
      return true;
    });
  }, [monthFilteredProjects, stackFilter, profileFilter, statusFilter]);

  const kpis = useMemo(() => {
    const total = monthFilteredProjects.length;
    const totalValue = monthFilteredProjects.reduce((s, p) => s + Number(p.price || 0), 0);
    const delivered = monthFilteredProjects.filter((p) => statusOf(p) === "delivered");
    const wip = monthFilteredProjects.filter((p) => statusOf(p) === "wip");
    const late = monthFilteredProjects.filter((p) => statusOf(p) === "late");
    return {
      total,
      totalValue,
      deliveredCount: delivered.length,
      deliveredValue: delivered.reduce((s, p) => s + Number(p.price || 0), 0),
      wipCount: wip.length,
      wipValue: wip.reduce((s, p) => s + Number(p.price || 0), 0),
      lateCount: late.length,
      lateValue: late.reduce((s, p) => s + Number(p.price || 0), 0),
    };
  }, [monthFilteredProjects]);

  const byStack = useMemo(() => {
    return STACKS.map((s) => {
      const rows = monthFilteredProjects.filter((p) => (p.stack || deriveStack(p.phase)) === s);
      const delivered = rows.filter((p) => statusOf(p) === "delivered").length;
      const wip = rows.filter((p) => statusOf(p) === "wip").length;
      const late = rows.filter((p) => statusOf(p) === "late").length;
      const value = rows.reduce((s2, p) => s2 + Number(p.price || 0), 0);
      return {
        stack: s,
        name: s,
        delivered,
        wip,
        late,
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
      { name: "Delivered", value: kpis.deliveredCount, color: COLORS.delivered },
      { name: "WIP", value: kpis.wipCount, color: COLORS.wip },
    ],
    [kpis]
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
      stack: p.stack || deriveStack(p.phase),
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

    const teamMembers = [];
    const seenNames = new Set();
    const supervisorVal = (form.supervisor || "").trim();
    if (supervisorVal) {
      teamMembers.push({
        id: `sup-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        name: supervisorVal,
        role: "Supervisor",
      });
      seenNames.add(supervisorVal.toLowerCase());
    }

    const membersRawVal = (form.membersRaw || "").trim();
    if (membersRawVal) {
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

  if (!loaded) {
    return (
      <div
        style={{
          background: COLORS.bg,
          color: COLORS.muted,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          fontFamily: "Inter, sans-serif",
        }}
      >
        Loading JSON database…
      </div>
    );
  }

  return (
    <div style={{ background: COLORS.bg, color: COLORS.text, minHeight: "100%", fontFamily: "Inter, sans-serif" }}>
      <style>{FONTS}{`
        ::-webkit-scrollbar { height: 8px; width: 8px; }
        ::-webkit-scrollbar-thumb { background: ${COLORS.border}; border-radius: 8px; }
        .mono { font-family: 'IBM Plex Mono', monospace; }
        .disp { font-family: 'Space Grotesk', sans-serif; }
        button { cursor: pointer; font-family: inherit; }
        input, select { font-family: 'Inter', sans-serif; }
        .chip { transition: all .15s ease; }
        .project-link { color: ${COLORS.accent}; text-decoration: none; font-weight: 600; transition: color .15s ease; }
        .project-link:hover { color: #a89eff; text-decoration: underline; }
        .month-scroll::-webkit-scrollbar { display: none; }
        .month-scroll { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 0.9s linear infinite; }
      `}</style>

      {activeProject ? (
        <ProjectDetails
          project={activeProject}
          onBack={() => {
            window.location.hash = "";
          }}
          onUpdate={(updated) => persistProjects(projects.map((p) => (p.id === updated.id ? updated : p)))}
          onDelete={(id) => {
            persistProjects(projects.filter((p) => p.id !== id));
            window.location.hash = "";
          }}
        />
      ) : (
        <div style={{ padding: "28px 24px 60px" }}>
          <DashboardHeader
            saveState={saveState}
            canWriteDb={canWriteDb}
            googleStatus={googleStatus}
            syncing={syncing}
            onSync={() => runSheetSync().catch(() => {})}
            onConnectGoogle={() => {
              window.location.href = getGoogleAuthUrl();
            }}
            onExport={exportJson}
            onImport={importJson}
            onAdd={openAdd}
          />

          <CalendarFilter
            availableYears={availableYears}
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
            onYearChange={setSelectedYear}
            onMonthChange={setSelectedMonth}
            mode={hasSheetTabs ? "sheetTab" : "date"}
          />

          <KpiStrip kpis={kpis} />
          <StackWorkload byStack={byStack} />
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

          <ProjectsTable
            projects={filtered}
            totalCount={projects.length}
            currentPage={currentPage}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            onEdit={openEdit}
            onDelete={setConfirmDelete}
          />

          {modalOpen && (
            <ProjectFormModal
              editingId={editingId}
              form={form}
              onChange={setForm}
              onClose={() => setModalOpen(false)}
              onSave={saveForm}
            />
          )}

          {confirmDelete && (
            <DeleteConfirmModal
              onCancel={() => setConfirmDelete(null)}
              onConfirm={() => doDelete(confirmDelete)}
            />
          )}
        </div>
      )}
    </div>
  );
}
