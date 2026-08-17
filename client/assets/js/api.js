const API = "/api";
export async function request(path, { method = "GET", body, headers = {} } = {}) {
  const response = await fetch(API + path, {
    method,
    credentials: "include",
    headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(result?.message || `Request failed with status ${response.status}.`);
    error.status = response.status;
    error.errors = result?.errors || [];
    error.duplicateFields = result?.duplicateFields || [];
    if (response.status === 401 && !location.pathname.includes("login")) location.href = "/login";
    throw error;
  }
  return result?.data;
}
export const get = (path) => request(path);
export const post = (path, body) => request(path, { method: "POST", body });
export const put = (path, body) => request(path, { method: "PUT", body });
export const patch = (path, body) => request(path, { method: "PATCH", body });
export const del = (path) => request(path, { method: "DELETE" });
export async function upload(path, formData) {
  const response = await fetch(API + path, { method: "POST", credentials: "include", body: formData }),
    result = await response.json().catch(() => null);
  if (!response.ok) throw new Error(result?.message || `Upload failed with status ${response.status}.`);
  return result?.data;
}
