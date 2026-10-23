export const REPORT_FIELDS = [
  { key: "userName", label: "User Name:", translation: "condensedName" },
  { key: "preferredLanguage", label: "Preferred Language:", translation: "preferredLanguage" },
  { key: "location", label: "Location:", translation: "locationLabel" },
  { key: "housing", label: "Housing Location/Type:", translation: "condensedHousing" },
  { key: "deadlines", label: "Deadlines:", translation: "condensedDeadlines" },
  { key: "evictionReason", label: "Legal reason for eviction:", translation: "condensedEvictionReason" },
  { key: "additionalInfo", label: "Additional Info (from chatbox conversation)", translation: "condensedAdditionalInfo" },
] as const;
export type ReportField = typeof REPORT_FIELDS[number]["key"];
export type ReportValues = Record<ReportField, string>;
export type ReportEdits = Partial<ReportValues>;

export function readReportFields(text: string): ReportValues {
  const values = Object.fromEntries(REPORT_FIELDS.map(({ key }) => [key, ""])) as ReportValues;
  let active: ReportField | null = null;
  for (const line of text.split("\n")) {
    const field = REPORT_FIELDS.find(({ label }) => line === label || line.startsWith(label + " "));
    if (field) {
      active = field.key;
      values[active] = line.slice(field.label.length).trimStart();
    } else if (active) {
      values[active] += "\n" + line;
    }
  }
  for (const { key } of REPORT_FIELDS) values[key] = values[key].trim();
  return values;
}

export function applyReportEdits(text: string, edits: ReportEdits = {}): string {
  if (!Object.keys(edits).length) return text;
  const values = { ...readReportFields(text), ...edits };
  return REPORT_FIELDS.map(({ key, label }) => {
    const value = values[key];
    if (key === "additionalInfo") return `\n${label}\n${value}`;
    return `${label}${value.includes("\n") || key === "deadlines" ? "\n" : " "}${value}`;
  }).join("\n") + "\n";
}
