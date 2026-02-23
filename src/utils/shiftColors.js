const SHIFT_COLOR_MAP = {
  LD: {
    bg: "#F8E7D2",
    text: "#5C3A1A",
    border: "#E9D2B6",
    hover: "#F1DABF",
    bgDark: "#2D231A",
    textDark: "#F6EBDD",
    borderDark: "#3A2D22",
    hoverDark: "#34281E"
  },
  E: {
    bg: "#DDEFF4",
    text: "#1E4F5A",
    border: "#C6E0E7",
    hover: "#D1E7EE",
    bgDark: "#1B2D34",
    textDark: "#D9F2F6",
    borderDark: "#253C45",
    hoverDark: "#20343C"
  },
  N: {
    bg: "#2A344D",
    text: "#F8FAFC",
    border: "#3A4766",
    hover: "#303D59",
    bgDark: "#141A2B",
    textDark: "#E9EEFF",
    borderDark: "#1F2740",
    hoverDark: "#192138"
  },
  AE: {
    bg: "#EEE4F6",
    text: "#4B3668",
    border: "#DCCEEB",
    hover: "#E4D6F0",
    bgDark: "#241B2F",
    textDark: "#F3ECFF",
    borderDark: "#30233E",
    hoverDark: "#2A1F37"
  }
};

const BANK_COLOR = {
  bg: "#DFF2E2",
  text: "#1F4D2F",
  border: "#C7E4D1",
  hover: "#D3EAD8",
  bgDark: "#1B2E24",
  textDark: "#E3F6EA",
  borderDark: "#243C2F",
  hoverDark: "#1F352B"
};

const DEFAULT_SHIFT_COLOR = {
  bg: "#EEF2F7",
  text: "#3F4B5F",
  border: "#D6DEE8",
  hover: "#E4EAF2",
  bgDark: "#1B2330",
  textDark: "#E6EDF4",
  borderDark: "#273142",
  hoverDark: "#202A3A"
};

const getTheme = (theme) => {
  if (theme) return theme;
  if (typeof document === "undefined") return "light";
  return document.documentElement.dataset.theme || "light";
};

const toBaseShift = (value) => value.split(/[\s-]/)[0];

export const getShiftColor = (shiftType, theme) => {
  const normalized = (shiftType || "").trim().toUpperCase();
  if (!normalized) return {};
  const isBank = normalized.startsWith("B-");
  const base = isBank ? "B" : toBaseShift(normalized);
  const palette = isBank ? BANK_COLOR : SHIFT_COLOR_MAP[base] || DEFAULT_SHIFT_COLOR;
  const isDark = getTheme(theme) === "dark";
  const bg = isDark ? palette.bgDark : palette.bg;
  const text = isDark ? palette.textDark : palette.text;
  const border = isDark ? palette.borderDark : palette.border;
  const hover = isDark ? palette.hoverDark : palette.hover;

  return {
    "--shift-bg": bg,
    "--shift-text": text,
    "--shift-border": border,
    "--shift-hover": hover,
    "--shift-cell-bg": bg,
    "--shift-cell-hover": hover,
    "--shift-border-strong": border
  };
};

export { SHIFT_COLOR_MAP, DEFAULT_SHIFT_COLOR };
