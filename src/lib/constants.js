export const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
`;

export const LIGHT = {
  bg: "#FAF7F0",
  bgAccent: "#F4EFE3",
  panel: "#FFFFFF",
  panel2: "#F7F4EB",
  border: "#EFECE4",
  text: "#16171B",
  muted: "#7C808E",
  delivered: "#1DBF73",
  wip: "#F5C842",
  late: "#F05454",
  accent: "#1A1B20",
  accentSoft: "#F7CE46",
  onAccent: "#FFFFFF",
  shadow: "0 12px 36px -6px rgba(45, 38, 20, 0.06)",
  shadowSoft: "0 4px 18px rgba(45, 38, 20, 0.04)",
  rowHover: "rgba(247, 206, 70, 0.08)",
  overlay: "rgba(22, 23, 27, 0.45)",
};

export const DARK = {
  bg: "#121316",
  bgAccent: "#181920",
  panel: "#1C1D23",
  panel2: "#24262E",
  border: "#2B2D38",
  text: "#F5F6FA",
  muted: "#8E92A0",
  delivered: "#2ED38A",
  wip: "#F7CE46",
  late: "#F75C5C",
  accent: "#F7CE46",
  accentSoft: "#F7CE46",
  onAccent: "#141518",
  shadow: "0 14px 40px rgba(0, 0, 0, 0.45)",
  shadowSoft: "0 4px 18px rgba(0, 0, 0, 0.25)",
  rowHover: "rgba(247, 206, 70, 0.12)",
  overlay: "rgba(0, 0, 0, 0.7)",
};

/** @deprecated Prefer useTheme().colors — kept as light default for non-React modules */
export const COLORS = LIGHT;

export function makeCard(colors) {
  return {
    background: colors.panel,
    border: `1px solid ${colors.border}`,
    borderRadius: 26,
    boxShadow: colors.shadowSoft,
  };
}

export const CARD = makeCard(LIGHT);

export const DEFAULT_PROFILES = [
  "code_muse_Fiverr",
  "Web_Chrome_Fiverr",
  "binary_bards_fiverr",
  "Ui_verse_Fiverr",
  "SparkFlow_Fiverr",
  "Web_wafels_Fiverr",
  "App_cake_Fiverr",
  "ai_nachos_fiverr",
  "theme_pilot_fiverr",
];

export const PROFILES = DEFAULT_PROFILES;

export const PROFILE_SHORT = {
  code_muse_Fiverr: "CodeMuse",
  Web_Chrome_Fiverr: "WebChrome",
  binary_bards_fiverr: "BinaryBards",
  Ui_verse_Fiverr: "UiVerse",
  SparkFlow_Fiverr: "SparkFlow",
  Web_wafels_Fiverr: "WebWafels",
  App_cake_Fiverr: "AppCake",
  ai_nachos_fiverr: "AiNachos",
  theme_pilot_fiverr: "ThemePilot",
};

/**
 * Dynamically formats any raw profile string from Google Sheets into a clean title.
 * Handles known mappings and dynamically converts snake_case / trailing _fiverr names.
 */
export function formatProfileName(raw) {
  const str = String(raw || "").trim();
  if (!str) return "—";

  // Exact match lookup
  if (PROFILE_SHORT[str]) return PROFILE_SHORT[str];

  // Case-insensitive lookup
  const lower = str.toLowerCase();
  for (const [k, v] of Object.entries(PROFILE_SHORT)) {
    if (k.toLowerCase() === lower) return v;
  }

  // Dynamic parser for any new/unmapped profile from sheets
  // 1. Remove trailing _fiverr / -fiverr / _fiver
  let cleaned = str.replace(/[_-]?fiverr$/i, "").trim();
  if (!cleaned) cleaned = str;

  // 2. Split by underscore, hyphen, or space
  const parts = cleaned.split(/[_\-\s]+/).filter(Boolean);
  if (!parts.length) return str;

  // 3. PascalCase / TitleCase each part
  return parts
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("");
}

/**
 * Dynamically extracts all unique profile names from sheet projects.
 */
export function extractProfiles(projects = [], fallbackDefaults = DEFAULT_PROFILES) {
  const set = new Set();
  (projects || []).forEach((p) => {
    const pf = String(p?.profile || "").trim();
    if (pf) set.add(pf);
  });
  if (fallbackDefaults) {
    fallbackDefaults.forEach((pf) => set.add(pf));
  }
  return Array.from(set);
}

export const STACKS = ["Backend", "Frontend", "App Development", "UI/UX", "Automation", "Deploy", "Other"];

export const STACK_COLOR = {
  Backend: "#4F7CFF",
  Frontend: "#F08A56",
  "App Development": "#2BB67A",
  "UI/UX": "#9B6FE0",
  Automation: "#2BB8BE",
  Deploy: "#C9B03A",
  Other: "#8A93A3",
};

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export const emptyForm = {
  date: "",
  salesPerson: "",
  profile: PROFILES[0],
  teamName: "Pritom",
  projectName: "",
  price: "",
  phase: "",
  stack: "Backend",
  orderId: "",
  orderUrl: "",
  dateline: "",
  salesStatus: "WIP",
  teamLeadStatus: "WIP",
  supervisor: "",
  shift: "Day",
  possibility: "No",
  extensions: [],
  deliveryDate: "",
  githubUrl: "",
  gitlabUrl: "",
};
