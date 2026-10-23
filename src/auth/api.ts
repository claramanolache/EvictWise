import { Platform } from "react-native";
export interface Account { id: string; username: string; preferredLanguage: string }
const API_URL = (process.env.EXPO_PUBLIC_AUTH_API_URL || process.env.EXPO_PUBLIC_TRANSLATION_API_URL || "http://localhost:3001").replace(/\/$/, "");
let nativeToken: string | null = null;

export async function accountRequest(path: string, body?: Record<string, string>): Promise<{ user?: Account; token?: string }> {
  let response: Response;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    response = await fetch(`${API_URL}/api/auth/${path}`, {
      signal: controller.signal,
      method: body ? "POST" : "GET", credentials: "include",
      headers: { ...(body ? { "Content-Type": "application/json" } : {}),
        ...(Platform.OS !== "web" ? { "X-Client-Platform": "native", ...(nativeToken ? { Authorization: `Bearer ${nativeToken}` } : {}) } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch { throw new Error("authUnavailable"); }
  finally { clearTimeout(timer); }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "authUnavailable");
  if (path !== "logout" && (!data.user?.id || !data.user?.username)) throw new Error("authUnavailable");
  if (Platform.OS !== "web" && data.token) nativeToken = data.token;
  if (path === "logout") nativeToken = null;
  return data;
}
