import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { CalendarEvent, FileData, Message } from "./types";
import { initialMessage } from "./assistantAI/prompt";

export interface LocationData {
  country: string;
  city: string;
  state: string;
  zipCode?: string;
}

export interface State {
  firstTime: boolean;
  messages: Message[];

  evictionNotice: FileData | null;
  leaseAgreement: FileData | null;
  events: CalendarEvent[];

  location: LocationData | null;
}

const initialState: State = {
  firstTime: true,
  messages: [initialMessage],

  evictionNotice: null,
  leaseAgreement: null,
  events: [],

  location: null,
};

export const slice = createSlice({
  name: "app",
  initialState,
  reducers: {
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
    },
    clearEventsByType: (
      state,
      action: PayloadAction<CalendarEvent["type"]>,
    ) => {
      state.events = state.events.filter(
        (event) => event.type !== action.payload,
      );
    },
    clearEventsByDocument: (
      state,
      action: PayloadAction<CalendarEvent["document"]>,
    ) => {
      state.events = state.events.filter(
        (event) => event.document !== action.payload,
      );
    },
    clearEvents: (state) => {
      state.events.splice(0, state.events.length);
    },
    setLocation: (state, action: PayloadAction<LocationData>) => {
      state.location = action.payload;
    },
  },
});

export const {
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
