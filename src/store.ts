import { configureStore } from "@reduxjs/toolkit";
import storage from "redux-persist/lib/storage";
import reducer from "./slice";
import { persistStore, persistReducer } from "redux-persist";

const persistedReducer = persistReducer(
  {
    key: "app",
    storage,
  },
  reducer,
);
export const store = configureStore({
  reducer: {
    app: persistedReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const persistor = persistStore(store);
