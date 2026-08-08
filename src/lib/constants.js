export const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
`;

export const COLORS = {
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

export const STACKS = ["Backend", "Frontend", "UI/UX", "Automation", "Deploy", "Other"];

export const STACK_COLOR = {
  Backend: "#7C9CFF",
  Frontend: "#FF9F6B",
  "UI/UX": "#C792F0",
  Automation: "#5FD0D6",
  Deploy: "#E8D45F",
  Other: "#7C8798",
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
};
