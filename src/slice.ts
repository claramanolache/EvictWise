import type { ReportEdits } from "@/utils/condensedInfoEdits";
import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { CalendarEvent, FileData, Message } from "./types";
import { initialMessage } from "@/constants/assistantAI/prompt";

export interface LocationData {
  country: string;
  city: string;
  state: string;
  zipCode?: string;
  county?: string;
}

export interface State {
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

  location: LocationData | null;
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
    setPreferredLanguage: (state, action: PayloadAction<string>) => {
      state.preferredLanguage = action.payload;
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
    },
    clearEventsByType: (
      state,
      action: PayloadAction<CalendarEvent["type"]>,
    ) => {
      state.events = state.events.filter(
        (event) => event.type !== action.payload,
      );
      state.completedCalendarTasks = (state.completedCalendarTasks ?? []).filter(id => state.events.some(event => event.id === id));
    },
    clearEventsByDocument: (
      state,
      action: PayloadAction<CalendarEvent["document"]>,
    ) => {
      state.events = state.events.filter(
        (event) => event.document !== action.payload,
      );
      state.completedCalendarTasks = (state.completedCalendarTasks ?? []).filter(id => state.events.some(event => event.id === id));
    },
    clearEvents: (state) => {
      state.events.splice(0, state.events.length);
      state.completedCalendarTasks = [];
    },
    setLocation: (state, action: PayloadAction<LocationData>) => {
      state.location = action.payload;
    },
  },
});

export const {
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
} = slice.actions;

export default slice.reducer;
