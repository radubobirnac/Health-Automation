const PORTAL_ROLES = new Set(["admin", "client"]);
const ADMIN_ROLES = new Set(["admin"]);

export const hasPortalAccess = (role) => PORTAL_ROLES.has(role);
export const isAdminRole = (role) => ADMIN_ROLES.has(role);

export const getStoredAuth = () => {
  try {
    const raw = localStorage.getItem("hr_auth");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch (error) {
    return null;
  }
};

export const hasStoredPortalAccess = () => {
  const token = localStorage.getItem("hr_token");
  if (!token) return false;
  const role = getStoredAuth()?.role;
  return hasPortalAccess(role);
};

export const hasStoredAdminAccess = () => {
  const token = localStorage.getItem("hr_token");
  if (!token) return false;
  const role = getStoredAuth()?.role;
  return isAdminRole(role);
};
