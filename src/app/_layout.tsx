import { ThemeProvider } from "@/context/ThemeContext";
import { useAppColorScheme as useColorScheme } from "@/context/ThemeContext";
import { CondensedInfoProvider } from "@/context/CondensedInfoContext";
import { PersistGate } from "redux-persist/integration/react";
import { Stack } from "expo-router";
import { Provider } from "react-redux";
import { } from "react-native";
import { persistor, store } from "@/store";
import { Colors } from "@/constants/theme";
import { MenuProvider } from "@/context/MenuContext";
import React from "react";
import { TranslationProvider } from "@/Translation/TranslationContext";

import DOMMatrix from "@thednp/dommatrix";

// @ts-ignore
global.DOMMatrix = DOMMatrix;

function AppLayout() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme === "dark" ? "dark" : "light"];

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <TranslationProvider>
          <CondensedInfoProvider>
          <MenuProvider>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: theme.background },
              }}
            />
          </MenuProvider>
          </CondensedInfoProvider>
        </TranslationProvider>
      </PersistGate>
    </Provider>
  );
}

export default function RootLayout() {
  return <ThemeProvider><AppLayout /></ThemeProvider>;
}
