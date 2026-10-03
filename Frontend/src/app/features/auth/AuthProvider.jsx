import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { authApi } from "../../services/api/auth";
import { onUnauthorized } from "../../services/api/client";

const AuthContext = createContext(null);
export const roleLabels = { ADMIN: "Quản trị viên", PM: "Quản lý dự án", TESTER: "Kiểm thử viên" };
export function initials(name = "") {
  return name.trim().split(/\s+/).slice(-2).map(part => part[0]).join("").toUpperCase();
}
export function useAuth() { return useContext(AuthContext); }

export function AuthProvider({ children, api = authApi }) {
  const [state, setState] = useState({ status: "loading", user: null, error: "" });
  const current = useRef(state);
  const generation = useRef(0);
  const pending = useRef(false);
  const lastCheck = useRef(0);
  const update = useCallback(next => { current.current = next; setState(next); }, []);

  const expire = useCallback(() => {
    if (current.current.user && !pending.current) {
      generation.current += 1;
      update({ ...current.current, status: "expired", error: "" });
    }
  }, [update]);

  const refresh = useCallback(async () => {
    if (pending.current) return;
    const request = ++generation.current;
    lastCheck.current = Date.now();
    try {
      const user = await api.me();
      if (request === generation.current) update({ status: "authenticated", user, error: "" });
    } catch (error) {
      if (request !== generation.current) return;
      const user = current.current.user;
      update({ user, status: error.status === 401 ? (user ? "expired" : "anonymous") : "unavailable", error: error.message });
    }
  }, [api, update]);

  useEffect(() => {
    refresh();
    const unsubscribe = onUnauthorized(expire);
    const activity = () => {
      if (current.current.status === "authenticated" && Date.now() - lastCheck.current >= 60000) refresh();
    };
    const focus = () => {
      if (current.current.status === "authenticated") refresh();
    };
    window.addEventListener("focus", focus);
    window.addEventListener("pointerdown", activity);
    window.addEventListener("keydown", activity);
    return () => {
      generation.current += 1;
      unsubscribe();
      window.removeEventListener("focus", focus);
      window.removeEventListener("pointerdown", activity);
      window.removeEventListener("keydown", activity);
    };
  }, [refresh, expire]);

  useEffect(() => {
    if (state.status !== "authenticated") return;
    const remaining = Date.parse(state.user.sessionExpiresAt) - Date.now();
    const timer = setTimeout(expire, Math.max(0, remaining));
    return () => clearTimeout(timer);
  }, [state.status, state.user, expire]);

  async function login(credentials) {
    generation.current += 1;
    pending.current = true;
    try {
      const user = await api.login(credentials);
      lastCheck.current = Date.now();
      update({ status: "authenticated", user, error: "" });
    } finally { pending.current = false; }
  }

  async function logout() {
    generation.current += 1;
    pending.current = true;
    try {
      await api.logout();
      update({ status: "anonymous", user: null, error: "" });
    } finally { pending.current = false; }
  }

  const can = permission => state.status === "authenticated" && state.user.permissions.includes(permission);
  const hasRole = role => state.status === "authenticated" && state.user.roles.includes(role);

  return <AuthContext.Provider value={{ ...state, login, logout, retry: refresh, can, hasRole }}>
    {children}
  </AuthContext.Provider>;
}
