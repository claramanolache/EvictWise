import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { Account, accountRequest } from "@/auth/api";

interface AuthValue {
  user: Account | null;
  status: "loading" | "ready" | "error";
  refresh: () => Promise<void>;
  authenticate: (mode: "register" | "login", username: string, password: string, language: string) => Promise<void>;
  logout: () => Promise<void>;
}
const AuthContext = createContext<AuthValue | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const revision = useRef(0);
  const changingSession = useRef(false);
  const [user, setUser] = useState<Account | null>(null);
  const [status, setStatus] = useState<AuthValue["status"]>("loading");
  const refresh = useCallback(async () => {
    if (changingSession.current) return;
    const request = ++revision.current;
    try {
      const result = await accountRequest("session");
      if (request !== revision.current) return;
      setUser(result.user!); setStatus("ready");
    } catch (error) {
      if (request !== revision.current) return;
      if (error instanceof Error && error.message === "authSignInRequired") { setUser(null); setStatus("ready"); }
      else setStatus("error");
    }
  }, []);
  useEffect(() => {
    void refresh();
    const subscription = AppState.addEventListener("change", state => { if (state === "active") void refresh(); });
    const timer = setInterval(() => void refresh(), 5 * 60 * 1000);
    return () => { subscription.remove(); clearInterval(timer); revision.current++; };
  }, [refresh]);
  async function authenticate(mode: "register" | "login", username: string, password: string, language: string) {
    changingSession.current = true;
    revision.current++;
    try {
      const result = await accountRequest(mode, { username: username.trim(), password, language });
      setUser(result.user!); setStatus("ready");
    } finally { changingSession.current = false; }
  }
  async function logout() {
    changingSession.current = true;
    revision.current++;
    try {
      await accountRequest("logout", {});
      setUser(null); setStatus("ready");
    } finally { changingSession.current = false; }
  }
  return <AuthContext.Provider value={{ user, status, refresh, authenticate, logout }}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("AuthProvider is required");
  return value;
}
