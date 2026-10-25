import { configureStore } from "@reduxjs/toolkit";
import storage from "./storage";
import reducer from "./slice";
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from "redux-persist";

const flushers = new WeakMap<object, () => Promise<void>>();
export async function flushAppStorage(store: object): Promise<void> {
  const flush = flushers.get(store);
  if (!flush) throw new Error("Account storage is unavailable");
  await flush();
}

// Each signed-in account gets a separate local profile. Legacy unowned data is
// left untouched and is never silently assigned to a new account.
export function createAppStore(accountId: string | null) {
  let writeError: unknown = null;
  const accountStorage = { ...storage, async setItem(key: string, value: string) {
    try { const result = await storage.setItem(key, value); writeError = null; return result; }
    catch (error) { writeError = error; throw error; }
  } };
  const persistedReducer = persistReducer({ key: accountId ? `app:user:${accountId}` : "app:onboarding", storage: accountStorage }, reducer);
  const store = configureStore({
    reducer: { app: persistedReducer },
    middleware: getDefaultMiddleware => getDefaultMiddleware({
      serializableCheck: { ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER] },
    }),
  });
  const persistor = persistStore(store);
  flushers.set(store, async () => { await persistor.flush(); if (writeError) throw writeError; });
  return { store, persistor };
}
export type RootState = ReturnType<ReturnType<typeof createAppStore>["store"]["getState"]>;
export type AppDispatch = ReturnType<typeof createAppStore>["store"]["dispatch"];
