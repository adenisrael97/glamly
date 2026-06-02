"use client";

import { createContext, useContext, useCallback, useReducer, useEffect } from "react";

const STORAGE_KEY = "glamly_auth_user";

// ── Reducer ───────────────────────────────────────────────────────────────────

const initialState = {
  user: null,
  loading: true,
  error: null,
};

function authReducer(state, action) {
  switch (action.type) {
    case "HYDRATE":
      return { ...state, user: action.payload, loading: false };
    case "AUTH_START":
      return { ...state, loading: true, error: null };
    case "AUTH_SUCCESS":
      return { ...state, user: action.payload, loading: false, error: null };
    case "AUTH_ERROR":
      return { ...state, loading: false, error: action.payload };
    case "LOGOUT":
      return { ...state, user: null, loading: false, error: null };
    default:
      return state;
  }
}

// ── Persistence helpers ───────────────────────────────────────────────────────

function readUser() {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
  } catch {
    return null;
  }
}

function writeUser(user) {
  if (typeof window === "undefined") return;
  if (user) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

// ── Context ───────────────────────────────────────────────────────────────────

const AuthContext = createContext(null);

/**
 * Simulated auth operations — replace with real API calls when backend is ready.
 * Each operation resolves after a realistic delay to mirror real network latency.
 */
async function simulateLogin({ email, password, role }) {
  await new Promise((r) => setTimeout(r, 1200));

  // Simulate wrong-password check (any password starting with 'wrong' fails)
  if (password.toLowerCase().startsWith("wrong")) {
    throw new Error("Invalid email or password. Please try again.");
  }

  return {
    id: Math.floor(Math.random() * 10000),
    name: email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    email,
    role,
    avatar: null,
    createdAt: new Date().toISOString(),
  };
}

async function simulateRegister({ name, email, role }) {
  await new Promise((r) => setTimeout(r, 1500));

  return {
    id: Math.floor(Math.random() * 10000),
    name,
    email,
    role,
    avatar: null,
    createdAt: new Date().toISOString(),
  };
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Hydrate from localStorage on mount (client-only)
  useEffect(() => {
    dispatch({ type: "HYDRATE", payload: readUser() });
  }, []);

  const login = useCallback(async ({ email, password, role }) => {
    dispatch({ type: "AUTH_START" });
    try {
      const user = await simulateLogin({ email, password, role });
      writeUser(user);
      dispatch({ type: "AUTH_SUCCESS", payload: user });
      return user;
    } catch (err) {
      dispatch({ type: "AUTH_ERROR", payload: err.message });
      throw err;
    }
  }, []);

  const register = useCallback(async ({ name, email, password, role }) => {
    dispatch({ type: "AUTH_START" });
    try {
      const user = await simulateRegister({ name, email, role });
      // Don't auto-login stylists — they go through onboarding
      if (role !== "stylist") {
        writeUser(user);
        dispatch({ type: "AUTH_SUCCESS", payload: user });
      } else {
        dispatch({ type: "AUTH_SUCCESS", payload: null });
      }
      return user;
    } catch (err) {
      dispatch({ type: "AUTH_ERROR", payload: err.message });
      throw err;
    }
  }, []);

  const logout = useCallback(() => {
    writeUser(null);
    dispatch({ type: "LOGOUT" });
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: "AUTH_ERROR", payload: null });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, register, clearError }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * @returns {{
 *   user: { id: number, name: string, email: string, role: string, avatar: string|null } | null,
 *   loading: boolean,
 *   error: string | null,
 *   login: (creds: { email: string, password: string, role: string }) => Promise<void>,
 *   logout: () => void,
 *   register: (data: { name: string, email: string, password: string, role: string }) => Promise<void>,
 *   clearError: () => void,
 * }}
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
