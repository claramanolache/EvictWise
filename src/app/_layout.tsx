import { PersistGate } from "redux-persist/integration/react";
import { Stack } from "expo-router";
import { Provider } from "react-redux";
import { useColorScheme } from "react-native";
import { persistor, store } from "@/store";
import { Colors } from "@/constants/theme";
import { MenuProvider } from "@/context/MenuContext";
import React from "react";
import { TranslationProvider } from "@/Translation/TranslationContext";

import DOMMatrix from "@thednp/dommatrix";

// @ts-ignore
global.DOMMatrix = DOMMatrix;

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme === "dark" ? "dark" : "light"];

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <TranslationProvider>
          <MenuProvider>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: theme.background },
              }}
            />
          </MenuProvider>
        </TranslationProvider>
      </PersistGate>
    </Provider>
  );
}
