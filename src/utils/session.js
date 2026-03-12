import { getStoredAuth } from "./rbac.js";

const SESSION_STARTED_KEY = "hr_session_started";
const SESSION_LAST_ACTIVE_KEY = "hr_last_active";

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_SESSION_AGE_MS = 5 * DAY_MS;
const MAX_IDLE_MS = 7 * DAY_MS;

const now = () => Date.now();

export const initClientSession = () => {
  const current = now();
  localStorage.setItem(SESSION_STARTED_KEY, String(current));
  localStorage.setItem(SESSION_LAST_ACTIVE_KEY, String(current));
};

export const ensureClientSession = () => {
  const auth = getStoredAuth();
  if (auth?.role !== "client") return;
  const startedRaw = localStorage.getItem(SESSION_STARTED_KEY);
  const lastActiveRaw = localStorage.getItem(SESSION_LAST_ACTIVE_KEY);
  if (!Number.isFinite(Number(startedRaw)) || !Number.isFinite(Number(lastActiveRaw))) {
    initClientSession();
  }
};

export const clearClientSession = () => {
  localStorage.removeItem(SESSION_STARTED_KEY);
  localStorage.removeItem(SESSION_LAST_ACTIVE_KEY);
};

export const recordClientActivity = () => {
  const auth = getStoredAuth();
  if (auth?.role !== "client") return;
  localStorage.setItem(SESSION_LAST_ACTIVE_KEY, String(now()));
};

export const isClientSessionExpired = () => {
  const auth = getStoredAuth();
  if (auth?.role !== "client") return false;
  const startedRaw = localStorage.getItem(SESSION_STARTED_KEY);
  const lastActiveRaw = localStorage.getItem(SESSION_LAST_ACTIVE_KEY);
  const startedAt = Number(startedRaw);
  const lastActiveAt = Number(lastActiveRaw);
  const current = now();

  if (!Number.isFinite(startedAt) || !Number.isFinite(lastActiveAt)) {
    return false;
  }

  if (current - startedAt > MAX_SESSION_AGE_MS) {
    return true;
  }

  if (current - lastActiveAt > MAX_IDLE_MS) {
    return true;
  }

  return false;
};
