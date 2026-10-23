import { configureStore } from "@reduxjs/toolkit";
import storage from "redux-persist/lib/storage";
import reducer from "./slice";
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from "redux-persist";

// Each signed-in account gets a separate local profile. Legacy unowned data is
// left untouched and is never silently assigned to a new account.
export function createAppStore(accountId: string | null) {
  const persistedReducer = persistReducer({ key: accountId ? `app:user:${accountId}` : "app:onboarding", storage }, reducer);
  const store = configureStore({
    reducer: { app: persistedReducer },
    middleware: getDefaultMiddleware => getDefaultMiddleware({
      serializableCheck: { ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER] },
    }),
  });
  return { store, persistor: persistStore(store) };
}
export type RootState = ReturnType<ReturnType<typeof createAppStore>["store"]["getState"]>;
export type AppDispatch = ReturnType<typeof createAppStore>["store"]["dispatch"];
