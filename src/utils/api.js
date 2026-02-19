export const authedFetch = async (url, options = {}) => {
  const headers = { ...(options.headers || {}) };
  const token = localStorage.getItem("hr_token");
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return fetch(url, { ...options, headers });
};
