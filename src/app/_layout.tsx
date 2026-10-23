import { GuidedTourProvider } from "@/context/GuidedTourContext";
import { ThemeProvider, useAppColorScheme } from "@/context/ThemeContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { CondensedInfoProvider } from "@/context/CondensedInfoContext";
import { PersistGate } from "redux-persist/integration/react";
import { Stack } from "expo-router";
import { Provider, useDispatch, useSelector } from "react-redux";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { createAppStore, RootState } from "@/store";
import { setPreferredLanguage } from "@/slice";
import { getTheme } from "@/constants/theme";
import { MenuProvider } from "@/context/MenuContext";
import React, { useEffect, useMemo } from "react";
import { TranslationProvider } from "@/Translation/TranslationContext";
import DOMMatrix from "@thednp/dommatrix";
// @ts-ignore
global.DOMMatrix = DOMMatrix;

function Routes() {
  const { user } = useAuth();
  const theme = getTheme(useAppColorScheme());
  const dispatch = useDispatch();
  const preferredLanguage = useSelector((state: RootState) => state.app.preferredLanguage);
  useEffect(() => {
    if (user && !preferredLanguage) dispatch(setPreferredLanguage(user.preferredLanguage));
  }, [user, preferredLanguage, dispatch]);
  const stack = <Stack initialRouteName={user ? "profile" : "welcome"} screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.background } }}>
    <Stack.Protected guard={!user}><Stack.Screen name="welcome" /></Stack.Protected>
    <Stack.Protected guard={Boolean(user)}>
      <Stack.Screen name="profile" /><Stack.Screen name="index" /><Stack.Screen name="chat" />
      <Stack.Screen name="calendar" /><Stack.Screen name="lawyer-connect" />
    </Stack.Protected>
  </Stack>;
  return <MenuProvider>{user ? <GuidedTourProvider><CondensedInfoProvider>{stack}</CondensedInfoProvider></GuidedTourProvider> : stack}</MenuProvider>;
}
function AccountApp() {
  const { user } = useAuth();
  const { store, persistor } = useMemo(() => createAppStore(user?.id ?? null), [user?.id]);
  useEffect(() => () => { persistor.pause(); void persistor.flush(); }, [persistor]);
  return <Provider store={store}><PersistGate loading={null} persistor={persistor}>
    <TranslationProvider initialLanguage={user?.preferredLanguage}><Routes /></TranslationProvider>
  </PersistGate></Provider>;
}
function SessionGate() {
  const { status, refresh, user } = useAuth();
  const theme = getTheme(useAppColorScheme());
  if (status !== "ready") return <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24, gap: 16, backgroundColor: theme.background }}>
    {status === "loading" ? <ActivityIndicator color={theme.backgroundAccent} accessibilityLabel="Checking session" /> : <>
      <Text style={{ color: theme.text, textAlign: "center" }}>Cannot connect to the account service. Start the API and try again.</Text>
      <Pressable onPress={() => void refresh()} accessibilityRole="button" style={{ padding: 16 }}><Text style={{ color: theme.backgroundAccent }}>Try again</Text></Pressable>
    </>}
  </View>;
  return <AccountApp key={user?.id ?? "guest"} />;
}
export default function RootLayout() {
  return <ThemeProvider><AuthProvider><SessionGate /></AuthProvider></ThemeProvider>;
}
