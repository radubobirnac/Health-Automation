// Light mode: medium-saturation backgrounds, dark text (≥4.5:1 contrast)
// Dark mode: mid-level backgrounds (~30-40% lightness), light text (~90% lightness)
const SHIFT_COLOR_MAP = {
  LD: {
    // Warm amber — long day
    bg: "#FEF3C7",
    text: "#78350F",
    border: "#FCD34D",
    hover: "#FDE68A",
    bgDark: "#3D2800",
    textDark: "#FDE68A",
    borderDark: "#92400E",
    hoverDark: "#451A03"
  },
  E: {
    // Sky blue — early
    bg: "#E0F2FE",
    text: "#0C4A6E",
    border: "#7DD3FC",
    hover: "#BAE6FD",
    bgDark: "#0C2D3F",
    textDark: "#BAE6FD",
    borderDark: "#0369A1",
    hoverDark: "#0A1F2E"
  },
  N: {
    // Indigo — night
    bg: "#EEF2FF",
    text: "#1E1B4B",
    border: "#A5B4FC",
    hover: "#C7D2FE",
    bgDark: "#1E1B3A",
    textDark: "#C7D2FE",
    borderDark: "#4338CA",
    hoverDark: "#16143A"
  },
  AE: {
    // Violet — acute/emergency
    bg: "#F5F3FF",
    text: "#3B0764",
    border: "#C4B5FD",
    hover: "#DDD6FE",
    bgDark: "#2D1B4E",
    textDark: "#DDD6FE",
    borderDark: "#7C3AED",
    hoverDark: "#1E1035"
  }
};

const BANK_COLOR = {
  // Green — bank shift
  bg: "#DCFCE7",
  text: "#14532D",
  border: "#86EFAC",
  hover: "#BBF7D0",
  bgDark: "#0F2E1A",
  textDark: "#BBF7D0",
  borderDark: "#16A34A",
  hoverDark: "#052E16"
};

const DEFAULT_SHIFT_COLOR = {
  bg: "#F1F5F9",
  text: "#1E293B",
  border: "#CBD5E1",
  hover: "#E2E8F0",
  bgDark: "#1E293B",
  textDark: "#E2E8F0",
  borderDark: "#475569",
  hoverDark: "#0F172A"
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
