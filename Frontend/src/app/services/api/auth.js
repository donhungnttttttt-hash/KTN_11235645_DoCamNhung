import { apiRequest } from "./client";

async function write(path, body) {
  // Login rotates the session and CSRF token; obtain the current token for each write.
  const csrf = await apiRequest("/auth/csrf");
  return apiRequest(path, {
    method: "POST",
    headers: { [csrf.headerName]: csrf.token },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

export const authApi = {
  me: () => apiRequest("/me"),
  login: credentials => write("/auth/login", credentials),
  logout: () => write("/auth/logout"),
};
