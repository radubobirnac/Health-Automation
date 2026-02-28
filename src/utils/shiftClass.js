const KNOWN_SHIFT_CLASSES = {
  LD: "shift-type-LD",
  E: "shift-type-E",
  N: "shift-type-N",
  AE: "shift-type-AE"
};
const POOL_SIZE = 6;

const nameHash = (str) => {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) & 0xffff;
  }
  return h;
};

export const getShiftClass = (shiftType) => {
  if (!shiftType) return "";
  const normalized = shiftType.trim().toUpperCase();
  const base = normalized.split(/[\s-]/)[0];
  if (base.startsWith("B")) return "shift-type-BANK";
  if (KNOWN_SHIFT_CLASSES[base]) return KNOWN_SHIFT_CLASSES[base];
  return `shift-pool-${nameHash(base) % POOL_SIZE}`;
};
