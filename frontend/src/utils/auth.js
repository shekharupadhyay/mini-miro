const API = import.meta.env.VITE_API_BASE;

export const getToken = () => localStorage.getItem("auth_token");
export const clearToken = () => localStorage.removeItem("auth_token");
export const authHeaders = () => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export async function getMe() {
  const token = getToken();
  if (!token) return null;
  try {
    const res = await fetch(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) { clearToken(); return null; }
    return await res.json();
  } catch {
    return null;
  }
}
