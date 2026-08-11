export const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
`;

export const LIGHT = {
  bg: "#E9EEF5",
  bgAccent: "#F3F6FB",
  panel: "#FFFFFF",
  panel2: "#F5F7FB",
  border: "#E1E6EF",
  text: "#1A1F2C",
  muted: "#7B8494",
  delivered: "#1F9D63",
  wip: "#D9A117",
  late: "#E24B4A",
  accent: "#1C2230",
  accentSoft: "#E8B923",
  onAccent: "#FFFFFF",
  shadow: "0 10px 28px rgba(28, 34, 48, 0.07)",
  shadowSoft: "0 4px 14px rgba(28, 34, 48, 0.05)",
  rowHover: "rgba(232, 185, 35, 0.1)",
  overlay: "rgba(26, 31, 44, 0.45)",
};

export const DARK = {
  bg: "#0D1117",
  bgAccent: "#121822",
  panel: "#151B24",
  panel2: "#1A222D",
  border: "#2A3341",
  text: "#E8EDF5",
  muted: "#8B95A7",
  delivered: "#3ECF8E",
  wip: "#F2B84B",
  late: "#F0635A",
  accent: "#E8B923",
  accentSoft: "#E8B923",
  onAccent: "#12161E",
  shadow: "0 12px 32px rgba(0, 0, 0, 0.35)",
  shadowSoft: "0 4px 16px rgba(0, 0, 0, 0.25)",
  rowHover: "rgba(232, 185, 35, 0.12)",
  overlay: "rgba(0, 0, 0, 0.65)",
};

/** @deprecated Prefer useTheme().colors — kept as light default for non-React modules */
export const COLORS = LIGHT;

export function makeCard(colors) {
  return {
    background: colors.panel,
    border: `1px solid ${colors.border}`,
    borderRadius: 20,
    boxShadow: colors.shadowSoft,
  };
}

export const CARD = makeCard(LIGHT);

export const PROFILES = [
  "code_muse_Fiverr",
  "Web_Chrome_Fiverr",
  "binary_bards_fiverr",
  "Ui_verse_Fiverr",
  "SparkFlow_Fiverr",
];

export const PROFILE_SHORT = {
  code_muse_Fiverr: "CodeMuse",
  Web_Chrome_Fiverr: "WebChrome",
  binary_bards_fiverr: "BinaryBards",
  Ui_verse_Fiverr: "UiVerse",
  SparkFlow_Fiverr: "SparkFlow",
};

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
};
