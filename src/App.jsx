import { useState, useEffect, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, Legend
} from "recharts";
import { Plus, Pencil, Trash2, X, ChevronDown, AlertTriangle, CheckCircle2, Clock3, Download, Upload } from "lucide-react";

const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
`;

const COLORS = {
  bg: "#0D1117",
  panel: "#141A22",
  panel2: "#1A212B",
  border: "#232B37",
  text: "#E7EBF1",
  muted: "#7C8798",
  delivered: "#3ECF8E",
  wip: "#F2B84B",
  late: "#F0635A",
  accent: "#8C7CFF",
};

const PROFILES = ["code_muse_Fiverr", "Web_Chrome_Fiverr", "binary_bards_fiverr", "Ui_verse_Fiverr", "SparkFlow_Fiverr"];
const PROFILE_SHORT = {
  code_muse_Fiverr: "CodeMuse",
  Web_Chrome_Fiverr: "WebChrome",
  binary_bards_fiverr: "BinaryBards",
  Ui_verse_Fiverr: "UiVerse",
  SparkFlow_Fiverr: "SparkFlow",
};

// Department = tech stack / discipline, derived from the Phase Name column
const STACKS = ["Backend", "Frontend", "UI/UX", "Automation", "Deploy", "Other"];
const STACK_COLOR = {
  Backend: "#7C9CFF",
  Frontend: "#FF9F6B",
  "UI/UX": "#C792F0",
  Automation: "#5FD0D6",
  Deploy: "#E8D45F",
  Other: "#7C8798",
};
function deriveStack(phase) {
  const p = (phase || "").toLowerCase();
  if (p.includes("backend")) return "Backend";
  if (p.includes("frontend")) return "Frontend";
  if (p.includes("ui/ux")) return "UI/UX";
  if (p.includes("automation")) return "Automation";
  if (p.includes("deploy")) return "Deploy";
  return "Other";
}

const RAW = [
["5/31/2026","C_Forward_STA Sales","code_muse_Fiverr","jinvalex",1600,"Mobile App Backend","Order Late","WIP","WIP"],
["5/31/2026","C_Forward_STA Sales","Web_Chrome_Fiverr","tyronerosales",240,"Publish Deploy","Order Late","WIP","WIP"],
["5/31/2026","C_Forward_STA Sales","binary_bards_fiverr","lalaneeds",1600,"Mobile App Backend","Order Late","WIP","WIP"],
["5/31/2026","C_Forward_STA Sales","code_muse_Fiverr","ferrifim",959.20,"AI Automation","Order Late","WIP","WIP"],
["5/31/2026","C_Forward_STA Sales","code_muse_Fiverr","aschlenvoigt",1000,"AI Automation","Order Late","WIP","WIP"],
["5/31/2026","C_Forward_STA Sales","Ui_verse_Fiverr","derickotoo",2400,"Mobile App Frontend","Order Late","WIP","Delivered"],
["5/31/2026","C_Forward_STA Sales","code_muse_Fiverr","stefansmall89",240,"Publish Deploy","Order Late","WIP","WIP"],
["5/31/2026","C_Forward_STA Sales","Ui_verse_Fiverr","mothirahman",200,"Mobile App Backend","Order Late","WIP","WIP"],
["5/31/2026","C_Forward_STA Sales","Web_Chrome_Fiverr","richardgraney",1200,"AI Automation","Order Done","Delivered","Delivered"],
["5/31/2026","C_Forward_STA Sales","Ui_verse_Fiverr","tongugeofrey",400,"Publish Deploy","5 Days","WIP","WIP"],
["5/31/2026","C_Forward_STA Sales","Ui_verse_Fiverr","mustafafly",1040,"AI App Backend","Order Late","WIP","WIP"],
["5/31/2026","C_Forward_STA Sales","Ui_verse_Fiverr","steveb_81",800,"Mobile App UI/UX","Order Late","WIP","Delivered"],
["5/31/2026","C_Forward_STA Sales","Ui_verse_Fiverr","lexi_comb",1280,"Mobile App Backend","10 Days","WIP","WIP"],
["5/31/2026","C_Forward_STA Sales","SparkFlow_Fiverr","joedor999",200,"AI Automation","Order Done","Delivered","Delivered"],
["5/31/2026","C_Forward_STA Sales","Web_Chrome_Fiverr","charismaexpert",1200,"AI Website Backend","Order Done","Delivered","Delivered"],
["5/31/2026","C_Forward_STA Sales","binary_bards_fiverr","blu_yonder",160,"Publish Deploy","Order Late","WIP","WIP"],
["5/31/2026","C_Forward_STA Sales","binary_bards_fiverr","simonsabir606",160,"AI Automation","Order Done","Delivered","Delivered"],
["5/31/2026","C_Forward_STA Sales","code_muse_Fiverr","lasharra",1200,"AI App UI/UX","Order Done","Delivered","Delivered"],
["5/31/2026","C_Forward_STA Sales","Ui_verse_Fiverr","steveb_81",480,"AI Website Frontend","Order Late","WIP","WIP"],
["5/31/2026","C_Forward_STA Sales","Ui_verse_Fiverr","ahomesllc",2800,"Mobile App Backend","33 Days","WIP","WIP"],
["5/31/2026","C_Forward_STA Sales","Ui_verse_Fiverr","affultim",960,"Mobile App UI/UX","14 Days","WIP","WIP"],
["5/31/2026","C_Forward_STA Sales","code_muse_Fiverr","robertomassa887",640,"Mobile App Frontend","13H 28M 1S","WIP","WIP"],
["5/31/2026","C_Forward_STA Sales","Ui_verse_Fiverr","sleepee",800,"Publish Deploy","28 Days","WIP","WIP"],
["7/1/2026","Ariful","Ui_verse_Fiverr","kierantait159",800,"Mobile App UI/UX","4 Days","WIP","WIP"],
["7/2/2026","Shad","Web_Chrome_Fiverr","charismaexpert",400,"Publish Deploy","14 Days","WIP","WIP"],
["7/2/2026","Munna","code_muse_Fiverr","amurgai3",1440,"AI Website Frontend","15 Days","WIP","WIP"],
["7/4/2026","Ibrahim","binary_bards_fiverr","simonsabir606",32,"","Order Done","Delivered","Delivered"],
["7/8/2026","Toki","code_muse_Fiverr","jinvalex",520,"Custom Website UI/UX","16 Days","WIP","WIP"],
["7/10/2026","Elio","SparkFlow_Fiverr","joedor999",1000,"AI Website Backend","23 Days","WIP","WIP"],
];

const seedData = RAW.map((r, i) => ({
  id: `seed-${i}`,
  date: r[0],
  salesPerson: r[1],
  profile: r[2],
  projectName: r[3],
  price: r[4],
  phase: r[5],
  stack: deriveStack(r[5]),
  dateline: r[6],
  salesStatus: r[7],
  teamLeadStatus: r[8],
}));

function statusOf(p) {
  if (p.salesStatus === "Delivered") return "delivered";
  if ((p.dateline || "").toLowerCase().includes("late")) return "late";
  return "wip";
}

function fmtMoney(n) {
  return "$" + Number(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function RadialGauge({ percent, color, size = 84 }) {
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (percent / 100) * c;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} stroke={COLORS.border} strokeWidth={stroke} fill="none" />
      <circle
        cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none"
        strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
    </svg>
  );
}

const emptyForm = {
  date: "", salesPerson: "", profile: PROFILES[0], projectName: "", price: "",
  phase: "", stack: "Backend", dateline: "", salesStatus: "WIP", teamLeadStatus: "WIP",
};

export default function Dashboard() {
  const [projects, setProjects] = useState(seedData);
  const [loaded, setLoaded] = useState(false);
  const [stackFilter, setStackFilter] = useState("All");
  const [profileFilter, setProfileFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("delivery-ops-projects");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) setProjects(parsed);
      }
    } catch (e) { /* no stored data yet, keep seed */ }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem("delivery-ops-projects", JSON.stringify(projects)); }
    catch (e) { console.error("save failed", e); }
  }, [projects, loaded]);

  const filtered = useMemo(() => {
    return projects.filter(p => {
      if (stackFilter !== "All" && (p.stack || deriveStack(p.phase)) !== stackFilter) return false;
      if (profileFilter !== "All" && p.profile !== profileFilter) return false;
      if (statusFilter !== "All" && statusOf(p) !== statusFilter) return false;
      return true;
    });
  }, [projects, stackFilter, profileFilter, statusFilter]);

  const kpis = useMemo(() => {
    const total = projects.length;
    const totalValue = projects.reduce((s, p) => s + Number(p.price || 0), 0);
    const delivered = projects.filter(p => statusOf(p) === "delivered");
    const wip = projects.filter(p => statusOf(p) === "wip");
    const late = projects.filter(p => statusOf(p) === "late");
    return {
      total, totalValue,
      deliveredCount: delivered.length,
      deliveredValue: delivered.reduce((s, p) => s + Number(p.price || 0), 0),
      wipCount: wip.length,
      wipValue: wip.reduce((s, p) => s + Number(p.price || 0), 0),
      lateCount: late.length,
      lateValue: late.reduce((s, p) => s + Number(p.price || 0), 0),
    };
  }, [projects]);

  const byStack = useMemo(() => {
    return STACKS.map(s => {
      const rows = projects.filter(p => (p.stack || deriveStack(p.phase)) === s);
      const delivered = rows.filter(p => statusOf(p) === "delivered").length;
      const wip = rows.filter(p => statusOf(p) === "wip").length;
      const late = rows.filter(p => statusOf(p) === "late").length;
      const value = rows.reduce((s2, p) => s2 + Number(p.price || 0), 0);
      return { stack: s, name: s, delivered, wip, late, total: rows.length, value, pct: rows.length ? Math.round((delivered / rows.length) * 100) : 0 };
    }).filter(d => d.total > 0);
  }, [projects]);

  const byProfile = useMemo(() => {
    return PROFILES.map(pf => {
      const rows = projects.filter(p => p.profile === pf);
      const value = rows.reduce((s, p) => s + Number(p.price || 0), 0);
      const delivered = rows.filter(p => statusOf(p) === "delivered").length;
      return { profile: pf, name: PROFILE_SHORT[pf], total: rows.length, value, delivered };
    });
  }, [projects]);

  const statusPie = useMemo(() => ([
    { name: "Delivered", value: kpis.deliveredCount, color: COLORS.delivered },
    { name: "In progress", value: kpis.wipCount, color: COLORS.wip },
    { name: "Late", value: kpis.lateCount, color: COLORS.late },
  ]), [kpis]);

  const timeline = useMemo(() => {
    const map = {};
    projects.forEach(p => {
      const key = p.date || "unknown";
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map)
      .sort((a, b) => new Date(a[0]) - new Date(b[0]))
      .map(([date, count]) => ({ date, count }));
  }, [projects]);

  function openAdd() {
    setForm(emptyForm);
    setEditingId(null);
    setModalOpen(true);
  }
  function openEdit(p) {
    setForm({ ...p, price: String(p.price), stack: p.stack || deriveStack(p.phase) });
    setEditingId(p.id);
    setModalOpen(true);
  }
  function saveForm() {
    if (!form.projectName.trim()) return;
    if (editingId) {
      setProjects(prev => prev.map(p => p.id === editingId ? { ...form, id: editingId, price: Number(form.price) || 0 } : p));
    } else {
      setProjects(prev => [...prev, { ...form, id: `p-${Date.now()}`, price: Number(form.price) || 0 }]);
    }
    setModalOpen(false);
  }
  function doDelete(id) {
    setProjects(prev => prev.filter(p => p.id !== id));
    setConfirmDelete(null);
  }
  function exportJson() {
    const blob = new Blob([JSON.stringify(projects, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `delivery-ops-export-${new Date().toISOString().slice(0,10)}.json`;
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
        if (Array.isArray(parsed)) setProjects(parsed);
      } catch (err) { alert("That file isn't valid JSON from this dashboard."); }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  const badge = (status) => {
    const map = {
      delivered: { c: COLORS.delivered, l: "Delivered", Icon: CheckCircle2 },
      wip: { c: COLORS.wip, l: "In progress", Icon: Clock3 },
      late: { c: COLORS.late, l: "Late", Icon: AlertTriangle },
    };
    const { c, l, Icon } = map[status];
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: c, background: c + "1A", border: `1px solid ${c}44`, borderRadius: 999, padding: "3px 9px", fontSize: 11.5, fontWeight: 600, fontFamily: "Inter, sans-serif" }}>
        <Icon size={12} strokeWidth={2.5} /> {l}
      </span>
    );
  };

  return (
    <div style={{ background: COLORS.bg, color: COLORS.text, minHeight: "100%", fontFamily: "Inter, sans-serif", padding: "28px 24px 60px" }}>
      <style>{FONTS}{`
        ::-webkit-scrollbar { height: 8px; width: 8px; }
        ::-webkit-scrollbar-thumb { background: ${COLORS.border}; border-radius: 8px; }
        .mono { font-family: 'IBM Plex Mono', monospace; }
        .disp { font-family: 'Space Grotesk', sans-serif; }
        button { cursor: pointer; font-family: inherit; }
        input, select { font-family: 'Inter', sans-serif; }
        .chip { transition: all .15s ease; }
      `}</style>

      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16, marginBottom: 28 }}>
        <div>
          <div className="mono" style={{ color: COLORS.accent, fontSize: 12, letterSpacing: 2, marginBottom: 6 }}>PRITOM TEAM · FIVERR DELIVERY PIPELINE</div>
          <h1 className="disp" style={{ fontSize: 30, fontWeight: 700, margin: 0 }}>Delivery Ops Console</h1>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={exportJson} style={{ display: "flex", alignItems: "center", gap: 6, background: COLORS.panel2, color: COLORS.text, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "11px 14px", fontWeight: 600, fontSize: 13 }}>
            <Download size={15} /> Export
          </button>
          <label style={{ display: "flex", alignItems: "center", gap: 6, background: COLORS.panel2, color: COLORS.text, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "11px 14px", fontWeight: 600, fontSize: 13 }}>
            <Upload size={15} /> Import
            <input type="file" accept="application/json" onChange={importJson} style={{ display: "none" }} />
          </label>
          <button onClick={openAdd} style={{ display: "flex", alignItems: "center", gap: 8, background: COLORS.accent, color: "#0D1117", border: "none", borderRadius: 10, padding: "11px 18px", fontWeight: 600, fontSize: 14 }}>
            <Plus size={16} strokeWidth={2.5} /> New project
          </button>
        </div>
      </div>

      {/* KPI STRIP */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total projects", value: kpis.total, sub: fmtMoney(kpis.totalValue), color: COLORS.text },
          { label: "Delivered", value: kpis.deliveredCount, sub: fmtMoney(kpis.deliveredValue), color: COLORS.delivered },
          { label: "In progress", value: kpis.wipCount, sub: fmtMoney(kpis.wipValue), color: COLORS.wip },
          { label: "Late", value: kpis.lateCount, sub: fmtMoney(kpis.lateValue), color: COLORS.late },
          { label: "Delivery rate", value: kpis.total ? Math.round((kpis.deliveredCount / kpis.total) * 100) + "%" : "0%", sub: "of all orders", color: COLORS.accent },
        ].map((k, i) => (
          <div key={i} style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "14px 16px" }}>
            <div style={{ color: COLORS.muted, fontSize: 11.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{k.label}</div>
            <div className="disp" style={{ fontSize: 26, fontWeight: 700, color: k.color, marginTop: 4 }}>{k.value}</div>
            <div className="mono" style={{ fontSize: 11.5, color: COLORS.muted, marginTop: 2 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* STACK / DEPARTMENT GAUGES */}
      <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: "18px 20px", marginBottom: 20 }}>
        <div className="disp" style={{ fontWeight: 600, fontSize: 15, marginBottom: 14 }}>Workload by department (stack)</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 22 }}>
          {byStack.map(d => (
            <div key={d.stack} style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 210 }}>
              <div style={{ position: "relative", width: 84, height: 84 }}>
                <RadialGauge percent={d.pct} color={STACK_COLOR[d.stack]} />
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                  <div className="disp" style={{ fontSize: 17, fontWeight: 700 }}>{d.pct}%</div>
                </div>
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13.5, display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 99, background: STACK_COLOR[d.stack], display: "inline-block" }} />
                  {d.name}
                </div>
                <div className="mono" style={{ fontSize: 11.5, color: COLORS.muted, marginTop: 3 }}>{d.total} orders · {fmtMoney(d.value)}</div>
                <div style={{ display: "flex", gap: 6, marginTop: 5 }}>
                  <span className="mono" style={{ fontSize: 10.5, color: COLORS.delivered }}>{d.delivered} done</span>
                  <span className="mono" style={{ fontSize: 10.5, color: COLORS.wip }}>{d.wip} wip</span>
                  <span className="mono" style={{ fontSize: 10.5, color: COLORS.late }}>{d.late} late</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* PROFILE STRIP */}
      <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: "16px 20px", marginBottom: 20 }}>
        <div className="disp" style={{ fontWeight: 600, fontSize: 15, marginBottom: 12 }}>Workload by Fiverr profile</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 18 }}>
          {byProfile.map(pf => (
            <div key={pf.profile} style={{ background: COLORS.panel2, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "10px 14px", minWidth: 150 }}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{pf.name}</div>
              <div className="mono" style={{ fontSize: 11, color: COLORS.muted, marginTop: 3 }}>{pf.total} orders · {fmtMoney(pf.value)}</div>
              <div className="mono" style={{ fontSize: 10.5, color: COLORS.delivered, marginTop: 2 }}>{pf.delivered} delivered</div>
            </div>
          ))}
        </div>
      </div>

      {/* CHARTS ROW */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16, marginBottom: 20 }}>
        <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: "18px 20px" }}>
          <div className="disp" style={{ fontWeight: 600, fontSize: 15, marginBottom: 10 }}>Delivery progress by department</div>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={byStack} barSize={26}>
              <CartesianGrid stroke={COLORS.border} vertical={false} />
              <XAxis dataKey="name" tick={{ fill: COLORS.muted, fontSize: 11.5 }} axisLine={{ stroke: COLORS.border }} tickLine={false} />
              <YAxis tick={{ fill: COLORS.muted, fontSize: 11.5 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: COLORS.panel2, border: `1px solid ${COLORS.border}`, borderRadius: 8, fontSize: 12.5 }} labelStyle={{ color: COLORS.text }} />
              <Bar dataKey="delivered" stackId="s" fill={COLORS.delivered} name="Delivered" radius={[0,0,0,0]} />
              <Bar dataKey="wip" stackId="s" fill={COLORS.wip} name="In progress" />
              <Bar dataKey="late" stackId="s" fill={COLORS.late} name="Late" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: "18px 20px" }}>
          <div className="disp" style={{ fontWeight: 600, fontSize: 15, marginBottom: 10 }}>Status split</div>
          <ResponsiveContainer width="100%" height={230}>
            <PieChart>
              <Pie data={statusPie} dataKey="value" nameKey="name" innerRadius={52} outerRadius={78} paddingAngle={3}>
                {statusPie.map((s, i) => <Cell key={i} fill={s.color} stroke={COLORS.panel} />)}
              </Pie>
              <Tooltip contentStyle={{ background: COLORS.panel2, border: `1px solid ${COLORS.border}`, borderRadius: 8, fontSize: 12.5 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} formatter={(v) => <span style={{ color: COLORS.muted }}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* TIMELINE */}
      <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: "18px 20px", marginBottom: 20 }}>
        <div className="disp" style={{ fontWeight: 600, fontSize: 15, marginBottom: 10 }}>Project intake over time</div>
        <ResponsiveContainer width="100%" height={190}>
          <AreaChart data={timeline}>
            <defs>
              <linearGradient id="intake" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COLORS.accent} stopOpacity={0.5} />
                <stop offset="100%" stopColor={COLORS.accent} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={COLORS.border} vertical={false} />
            <XAxis dataKey="date" tick={{ fill: COLORS.muted, fontSize: 11 }} axisLine={{ stroke: COLORS.border }} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fill: COLORS.muted, fontSize: 11.5 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: COLORS.panel2, border: `1px solid ${COLORS.border}`, borderRadius: 8, fontSize: 12.5 }} />
            <Area type="monotone" dataKey="count" name="New projects" stroke={COLORS.accent} fill="url(#intake)" strokeWidth={2.5} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* FILTERS */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8, alignItems: "center" }}>
        <span className="mono" style={{ fontSize: 11, color: COLORS.muted, marginRight: 4 }}>DEPARTMENT</span>
        {["All", ...STACKS].map(s => (
          <button key={s} className="chip" onClick={() => setStackFilter(s)}
            style={{
              background: stackFilter === s ? COLORS.accent : COLORS.panel2,
              color: stackFilter === s ? "#0D1117" : COLORS.muted,
              border: `1px solid ${stackFilter === s ? COLORS.accent : COLORS.border}`,
              borderRadius: 999, padding: "6px 13px", fontSize: 12.5, fontWeight: 600,
            }}>
            {s}
          </button>
        ))}
        <span className="mono" style={{ fontSize: 11, color: COLORS.muted, margin: "0 4px 0 12px" }}>STATUS</span>
        {[["All","All"],["delivered","Delivered"],["wip","In progress"],["late","Late"]].map(([key,label]) => (
          <button key={key} className="chip" onClick={() => setStatusFilter(key)}
            style={{
              background: statusFilter === key ? COLORS.accent : COLORS.panel2,
              color: statusFilter === key ? "#0D1117" : COLORS.muted,
              border: `1px solid ${statusFilter === key ? COLORS.accent : COLORS.border}`,
              borderRadius: 999, padding: "6px 13px", fontSize: 12.5, fontWeight: 600,
            }}>
            {label}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14, alignItems: "center" }}>
        <span className="mono" style={{ fontSize: 11, color: COLORS.muted, marginRight: 4 }}>PROFILE</span>
        {["All", ...PROFILES].map(pf => (
          <button key={pf} className="chip" onClick={() => setProfileFilter(pf)}
            style={{
              background: profileFilter === pf ? COLORS.accent : COLORS.panel2,
              color: profileFilter === pf ? "#0D1117" : COLORS.muted,
              border: `1px solid ${profileFilter === pf ? COLORS.accent : COLORS.border}`,
              borderRadius: 999, padding: "6px 13px", fontSize: 12.5, fontWeight: 600,
            }}>
            {pf === "All" ? "All" : PROFILE_SHORT[pf]}
          </button>
        ))}
      </div>

      {/* TABLE */}
      <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 14, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: COLORS.panel2, textAlign: "left" }}>
                {["Date","Sales person","Department","Profile","Project","Phase","Price","Dateline","Status","Actions"].map(h => (
                  <th key={h} style={{ padding: "10px 14px", color: COLORS.muted, fontWeight: 600, fontSize: 11.5, textTransform: "uppercase", letterSpacing: 0.4, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={10} style={{ padding: 24, textAlign: "center", color: COLORS.muted }}>No projects match this filter.</td></tr>
              )}
              {filtered.map((p, i) => {
                const stack = p.stack || deriveStack(p.phase);
                return (
                <tr key={p.id} style={{ borderTop: `1px solid ${COLORS.border}`, background: i % 2 ? "transparent" : COLORS.panel2 + "55" }}>
                  <td className="mono" style={{ padding: "10px 14px", color: COLORS.muted, whiteSpace: "nowrap" }}>{p.date}</td>
                  <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>{p.salesPerson}</td>
                  <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 7, height: 7, borderRadius: 99, background: STACK_COLOR[stack], display: "inline-block" }} />
                      {stack}
                    </span>
                  </td>
                  <td style={{ padding: "10px 14px", color: COLORS.muted, whiteSpace: "nowrap" }}>{PROFILE_SHORT[p.profile] || p.profile}</td>
                  <td style={{ padding: "10px 14px", fontWeight: 500, whiteSpace: "nowrap" }}>{p.projectName}</td>
                  <td style={{ padding: "10px 14px", color: COLORS.muted, whiteSpace: "nowrap" }}>{p.phase || "—"}</td>
                  <td className="mono" style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>{fmtMoney(p.price)}</td>
                  <td className="mono" style={{ padding: "10px 14px", color: COLORS.muted, whiteSpace: "nowrap" }}>{p.dateline || "—"}</td>
                  <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>{badge(statusOf(p))}</td>
                  <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                    <button onClick={() => openEdit(p)} style={{ background: "none", border: "none", color: COLORS.muted, padding: 5 }}><Pencil size={15} /></button>
                    <button onClick={() => setConfirmDelete(p.id)} style={{ background: "none", border: "none", color: COLORS.late, padding: 5 }}><Trash2 size={15} /></button>
                  </td>
                </tr>
              );})}
            </tbody>
          </table>
        </div>
      </div>
      <div className="mono" style={{ marginTop: 10, fontSize: 11.5, color: COLORS.muted }}>{filtered.length} of {projects.length} projects shown</div>

      {/* ADD/EDIT MODAL */}
      {modalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "#000000AA", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }} onClick={() => setModalOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 22, width: 440, maxWidth: "100%", maxHeight: "88vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div className="disp" style={{ fontWeight: 700, fontSize: 17 }}>{editingId ? "Edit project" : "New project"}</div>
              <button onClick={() => setModalOpen(false)} style={{ background: "none", border: "none", color: COLORS.muted }}><X size={18} /></button>
            </div>
            {[
              ["date", "Date", "text", "e.g. 7/12/2026"],
              ["salesPerson", "Sales person", "text", ""],
              ["projectName", "Project name", "text", ""],
              ["phase", "Phase", "text", "e.g. Mobile App Backend"],
              ["price", "Price (USD)", "number", ""],
              ["dateline", "Dateline", "text", "e.g. 5 Days / Order Late"],
            ].map(([key, label, type, ph]) => (
              <div key={key} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11.5, color: COLORS.muted, marginBottom: 4, fontWeight: 600 }}>{label}</div>
                <input
                  type={type} placeholder={ph} value={form[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  style={{ width: "100%", background: COLORS.panel2, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "9px 11px", color: COLORS.text, fontSize: 13.5, boxSizing: "border-box" }}
                />
              </div>
            ))}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 11.5, color: COLORS.muted, marginBottom: 4, fontWeight: 600 }}>Department (stack)</div>
                <select value={form.stack} onChange={e => setForm(f => ({ ...f, stack: e.target.value }))}
                  style={{ width: "100%", background: COLORS.panel2, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "9px 11px", color: COLORS.text, fontSize: 13.5 }}>
                  {STACKS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: 11.5, color: COLORS.muted, marginBottom: 4, fontWeight: 600 }}>Fiverr profile</div>
                <select value={form.profile} onChange={e => setForm(f => ({ ...f, profile: e.target.value }))}
                  style={{ width: "100%", background: COLORS.panel2, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "9px 11px", color: COLORS.text, fontSize: 13.5 }}>
                  {PROFILES.map(pf => <option key={pf} value={pf}>{PROFILE_SHORT[pf]}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
              <div>
                <div style={{ fontSize: 11.5, color: COLORS.muted, marginBottom: 4, fontWeight: 600 }}>Sales status</div>
                <select value={form.salesStatus} onChange={e => setForm(f => ({ ...f, salesStatus: e.target.value }))}
                  style={{ width: "100%", background: COLORS.panel2, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "9px 11px", color: COLORS.text, fontSize: 13.5 }}>
                  <option value="WIP">WIP</option>
                  <option value="Delivered">Delivered</option>
                </select>
              </div>
              <div>
                <div style={{ fontSize: 11.5, color: COLORS.muted, marginBottom: 4, fontWeight: 600 }}>Team lead status</div>
                <select value={form.teamLeadStatus} onChange={e => setForm(f => ({ ...f, teamLeadStatus: e.target.value }))}
                  style={{ width: "100%", background: COLORS.panel2, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "9px 11px", color: COLORS.text, fontSize: 13.5 }}>
                  <option value="WIP">WIP</option>
                  <option value="Delivered">Delivered</option>
                </select>
              </div>
            </div>
            <button onClick={saveForm} style={{ width: "100%", background: COLORS.accent, color: "#0D1117", border: "none", borderRadius: 9, padding: "11px 0", fontWeight: 700, fontSize: 14 }}>
              {editingId ? "Save changes" : "Add project"}
            </button>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM */}
      {confirmDelete && (
        <div style={{ position: "fixed", inset: 0, background: "#000000AA", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }} onClick={() => setConfirmDelete(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 22, width: 340 }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>Delete this project?</div>
            <div style={{ color: COLORS.muted, fontSize: 13, marginBottom: 18 }}>This can't be undone.</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setConfirmDelete(null)} style={{ flex: 1, background: COLORS.panel2, color: COLORS.text, border: `1px solid ${COLORS.border}`, borderRadius: 9, padding: "10px 0", fontWeight: 600 }}>Cancel</button>
              <button onClick={() => doDelete(confirmDelete)} style={{ flex: 1, background: COLORS.late, color: "#1a0d0d", border: "none", borderRadius: 9, padding: "10px 0", fontWeight: 700 }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
