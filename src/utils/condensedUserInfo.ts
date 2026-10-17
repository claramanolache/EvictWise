import type { CalendarEvent } from "@/types";
import type { LocationData } from "@/slice";

export interface UserInfoDetails {
  userName: string;
  housingLocationType: string;
  evictionReason: string;
  chatHighlights?: { userDetail: string }[];
}

export function parseUserInfoDetails(content: string): UserInfoDetails {
  const value = JSON.parse(content);
  if (!value || ["userName", "housingLocationType", "evictionReason"].some(
    (key) => typeof value[key] !== "string",
  )) throw new Error("Invalid user information response");
  if (!Array.isArray(value.chatHighlights) || value.chatHighlights.some(
    (item: unknown) => !item || typeof item !== "object" ||
      !("userDetail" in item) || typeof item.userDetail !== "string" || !item.userDetail.trim(),
  )) throw new Error("Invalid chat highlights");
  return { ...value, chatHighlights: value.chatHighlights.map((item: { userDetail: string }) => ({ userDetail: item.userDetail })) };
}

export function formatUserInfo(
  details: UserInfoDetails,
  location: LocationData | null,
  events: CalendarEvent[],
): string {
  const text = (value: string) => value.trim() || "Not provided";
  const deadlines = [...events].sort((a, b) =>
    a.date[0] - b.date[0] || a.date[1] - b.date[1] || a.date[2] - b.date[2],
  ).map((event) => {
    const [year, month, day] = event.date;
    const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const source = event.document === "eviction" ? "Eviction notice" : "Lease agreement";
    return `- ${date}: ${event.name} (${source})`;
  });
  return [
    `User Name: ${text(details.userName)}`,
    `Location: ${location ? text([location.city, location.state, location.country, location.zipCode].filter(Boolean).join(", ")) : "Not provided"}`,
    `Housing Location/Type: ${text(details.housingLocationType)}`,
    `Deadlines:${deadlines.length ? "\n" + deadlines.join("\n") : " Not provided"}`,
    `Legal reason for eviction: ${text(details.evictionReason)}`,
    "",
    "Additional Info (from chatbox conversation)",
    details.chatHighlights?.length
      ? details.chatHighlights.map(({ userDetail }) =>
          `- User reports: ${userDetail.trim()}`,
        ).join("\n")
      : "No case-relevant chat information provided yet.",
  ].join("\n") + "\n";
}
