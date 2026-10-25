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

export async function chatRequest(body: { messages: unknown[]; profileContext: string }): Promise<{ content: string; sources: import("@/types").ChatSource[] }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120000);
  try {
    const response = await fetch(`${API_URL}/api/auth/chat`, {
      method: "POST", credentials: "include", signal: controller.signal,
      headers: { "Content-Type": "application/json", ...(Platform.OS !== "web" && nativeToken ? { Authorization: `Bearer ${nativeToken}` } : {}) },
      body: JSON.stringify(body),
    });
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      throw new Error(response.status === 404
        ? "The chat API is outdated or its URL is incorrect. Restart the API with npm run server."
        : "The chat API returned an unexpected response. Check the API URL and restart the server.");
    }
    const result = await response.json().catch(() => { throw new Error("The chat API returned invalid JSON. Please try again."); });
    if (!response.ok) throw new Error(result.error || "The legal knowledge service is unavailable.");
    if (typeof result.content !== "string" || !Array.isArray(result.sources)) throw new Error("Invalid chat response.");
    return result;
  } catch (error) {
    if (error instanceof Error && error.name !== "TypeError" && error.name !== "AbortError") throw error;
    throw new Error("Cannot reach the legal knowledge service. Please try again.");
  } finally { clearTimeout(timer); }
}
