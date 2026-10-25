import type { CaseRecord, CaseDetails } from "@/case/types";
import type { ReportEdits } from "@/utils/condensedInfoEdits";
import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { CalendarTaskPriority, CalendarEvent, FileData, Message } from "./types";
import { initialMessage } from "@/constants/assistantAI/prompt";

export interface LocationData {
  country: string;
  city: string;
  state: string;
  zipCode?: string;
  latitude?: number;
  longitude?: number;
  county?: string;
}

import type { LawyerProfile } from "@/utils/lawyerRecommendations";

export interface State {
  caseStatus?: CaseRecord;
  lawyerPreferences?: LawyerProfile;
  firstTime: boolean;
  preferredLanguage?: string;
  userInfoEdits?: ReportEdits;
  userInfoReport?: { source: string; text: string } | null;
  messages: Message[];
  additionalFiles?: FileData[];

  evictionNotice: FileData | null;
  leaseAgreement: FileData | null;
  events: CalendarEvent[];
  completedCalendarTasks?: string[];
  calendarTaskPriorities?: Record<string, CalendarTaskPriority>;

  location: LocationData | null;
}

// Reject impossible prerequisites and cycles before persisting user planning choices.
export function validCalendarPriority(events: CalendarEvent[], settings: Record<string, CalendarTaskPriority>, id: string, value: CalendarTaskPriority): boolean {
  if (!events.some(e => e.id === id) || !value || !Number.isFinite(value.importance) || value.importance < 0 || value.importance > 1
    || !Number.isFinite(value.effort) || value.effort < 0 || value.effort > 1 || !Array.isArray(value.dependsOn)
    || value.dependsOn.some(dep => typeof dep !== "string" || dep === id || !events.some(e => e.id === dep))) return false;
  const visited = new Set<string>();
  function reachesTarget(node: string): boolean {
    if (node === id) return true;
    if (visited.has(node)) return false;
    visited.add(node);
    return (settings[node]?.dependsOn ?? []).some(reachesTarget);
  }
  return !value.dependsOn.some(reachesTarget);
}

function pruneCalendarPriorities(state: State) {
  for (const id of Object.keys(state.calendarTaskPriorities ?? {})) {
    if (!state.events.some(event => event.id === id)) delete state.calendarTaskPriorities![id];
  }
  // Keep dangling prerequisites visible as unavailable instead of silently marking them done.
}

const initialState: State = {
  firstTime: true,
  userInfoEdits: {},
  userInfoReport: null,
  messages: [initialMessage],
  additionalFiles: [],

  evictionNotice: null,
  leaseAgreement: null,
  events: [],
  completedCalendarTasks: [],

  location: null,
};

export const slice = createSlice({
  name: "app",
  initialState,
  reducers: {
    saveCaseDetails: (state, action: PayloadAction<{ details: CaseDetails; updatedAt: string }>) => {
      state.caseStatus = { version: 1, details: action.payload.details, updatedAt: action.payload.updatedAt,
        statusEvidence: { kind: action.payload.details.stage === "unknown" ? "unknown" : "user_reported" },
        completedTasks: state.caseStatus?.completedTasks ?? [] };
    },
    toggleCaseTask: (state, action: PayloadAction<string>) => {
      if (!state.caseStatus) return;
      const completed = state.caseStatus.completedTasks;
      state.caseStatus.completedTasks = completed.includes(action.payload) ? completed.filter(id => id !== action.payload) : [...completed, action.payload];
    },
    setLawyerPreferences: (state, action: PayloadAction<LawyerProfile>) => {
      state.lawyerPreferences = action.payload;
    },
    setPreferredLanguage: (state, action: PayloadAction<string>) => {
      state.preferredLanguage = action.payload;
    },
    setCalendarTaskPriority: (state, action: PayloadAction<{ id: string; priority: CalendarTaskPriority }>) => {
      const { id, priority } = action.payload;
      if (!validCalendarPriority(state.events, state.calendarTaskPriorities ?? {}, id, priority)) return;
      (state.calendarTaskPriorities ??= {})[id] = { ...priority, dependsOn: [...new Set(priority.dependsOn)] };
    },
    toggleCalendarTask: (state, action: PayloadAction<string>) => {
      if (!state.events.some(event => event.id === action.payload)) return;
      const completed = state.completedCalendarTasks ?? [];
      state.completedCalendarTasks = completed.includes(action.payload)
        ? completed.filter(id => id !== action.payload)
        : [...completed, action.payload];
    },
    updateUserInfoEdits: (state, action: PayloadAction<ReportEdits>) => {
      state.userInfoEdits = { ...state.userInfoEdits, ...action.payload };
    },
    removeAdditionalFile: (state, action: PayloadAction<number>) => {
      if (Number.isInteger(action.payload) && action.payload >= 0 && action.payload < (state.additionalFiles?.length ?? 0)) {
        state.additionalFiles!.splice(action.payload, 1);
      }
    },
    addAdditionalFile: (state, action: PayloadAction<FileData>) => {
      (state.additionalFiles ??= []).push(action.payload);
    },
    setUserInfoReport: (state, action: PayloadAction<{ source: string; text: string }>) => {
      state.userInfoReport = action.payload;
    },
    viewFirstTime: (state) => {
      state.firstTime = false;
    },
    addMessage: (state, action: PayloadAction<Message>) => {
      state.messages.push(action.payload);
    },
    clearMessages: (state) => {
      state.messages.splice(0, state.messages.length);
    },
    setEvictionNotice: (state, action: PayloadAction<FileData | null>) => {
      state.evictionNotice = action.payload;
    },
    setLeaseAgreement: (state, action: PayloadAction<FileData | null>) => {
      state.leaseAgreement = action.payload;
    },
    addEvent: (state, action: PayloadAction<CalendarEvent>) => {
      state.events.push(action.payload);
    },
    removeEventById: (state, action: PayloadAction<string>) => {
      state.events = state.events.filter(
        (event) => event.id !== action.payload,
      );
      state.completedCalendarTasks = (state.completedCalendarTasks ?? []).filter(id => id !== action.payload);
      pruneCalendarPriorities(state);
    },
    clearEventsByType: (
      state,
      action: PayloadAction<CalendarEvent["type"]>,
    ) => {
      state.events = state.events.filter(
        (event) => event.type !== action.payload,
      );
      state.completedCalendarTasks = (state.completedCalendarTasks ?? []).filter(id => state.events.some(event => event.id === id));
      pruneCalendarPriorities(state);
    },
    clearEventsByDocument: (
      state,
      action: PayloadAction<CalendarEvent["document"]>,
    ) => {
      state.events = state.events.filter(
        (event) => event.document !== action.payload,
      );
      state.completedCalendarTasks = (state.completedCalendarTasks ?? []).filter(id => state.events.some(event => event.id === id));
      pruneCalendarPriorities(state);
    },
    clearEvents: (state) => {
      state.events.splice(0, state.events.length);
      state.completedCalendarTasks = [];
      state.calendarTaskPriorities = {};
    },
    setResolvedLocationCoordinates: (state, action: PayloadAction<{ expected: LocationData; coordinates: { latitude: number; longitude: number } }>) => {
      const { expected, coordinates } = action.payload;
      // Do not let an old lookup overwrite a newer profile edit or GPS selection.
      if (JSON.stringify(state.location) !== JSON.stringify(expected)) return;
      if (!Number.isFinite(coordinates.latitude) || Math.abs(coordinates.latitude) > 90
        || !Number.isFinite(coordinates.longitude) || Math.abs(coordinates.longitude) > 180) return;
      state.location = { ...expected, ...coordinates };
    },
    setLocation: (state, action: PayloadAction<LocationData>) => {
      state.location = action.payload;
    },
    clearLocation: (state) => {
      state.location = null;
    },
  },
});

export const {
  setCalendarTaskPriority,
  saveCaseDetails,
  toggleCaseTask,
  setResolvedLocationCoordinates,
  setLawyerPreferences,
  setPreferredLanguage,
  toggleCalendarTask,
  updateUserInfoEdits,
  addAdditionalFile,
  removeAdditionalFile,
  setUserInfoReport,
  viewFirstTime,
  addMessage,
  clearMessages,
  setEvictionNotice,
  setLeaseAgreement,
  addEvent,
  removeEventById,
  clearEventsByType,
  clearEventsByDocument,
  clearEvents,
  setLocation,
  clearLocation,
} = slice.actions;

export default slice.reducer;
