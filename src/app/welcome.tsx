import { useRef, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import FontAwesomeFreeSolid from "@react-native-vector-icons/fontawesome-free-solid";
import { useAuth } from "@/context/AuthContext";
import { useAppColorScheme } from "@/context/ThemeContext";
import { getTheme } from "@/constants/theme";
import { LANGUAGES } from "@/Translation/languages";
import { useTranslation } from "@/Translation/TranslationContext";
import ThemedPressable from "@/components/ThemedPressable";

export default function Welcome() {
  const theme = getTheme(useAppColorScheme());
  const { t, language, setLanguage, interfaceLoading } = useTranslation();
  const { authenticate } = useAuth();
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<"register" | "login">("register");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [error, setError] = useState("");
  const inputStyle = { color: theme.text, backgroundColor: theme.backgroundInput, borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 14, fontSize: 16 };
  function switchMode() { setMode(value => value === "login" ? "register" : "login"); setPassword(""); setConfirmation(""); setError(""); }
  async function submit() {
    if (pending.current) return;
    if (!/^[a-zA-Z0-9_]{3,32}$/.test(username.trim()) || !password) { setError("authInvalidInput"); return; }
    if (mode === "register" && ([...password].length < 9 || [...password].length > 128)) { setError("authPasswordPolicy"); return; }
    if (mode === "register" && password !== confirmation) { setError("authPasswordMismatch"); return; }
    pending.current = true; setBusy(true); setError("");
    try {
      await authenticate(mode, username, password, language);
      setPassword(""); setConfirmation("");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "authUnavailable"); }
    finally { pending.current = false; setBusy(false); }
  }
  return <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, padding: 24, justifyContent: "center" }}>
        <View style={{ width: "100%", maxWidth: 760, alignSelf: "center", gap: 24, paddingVertical: 20 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ backgroundColor: theme.backgroundSelected, padding: 14, borderRadius: 16 }}><FontAwesomeFreeSolid name="scale-balanced" size={24} color={theme.backgroundAccent} /></View>
            <Text style={{ color: theme.textHeading, fontSize: 24, fontWeight: "600" }}>Evict Wise</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {["welcomeLanguageStep", "welcomeOverviewStep", "welcomeAccountStep"].map((label, index) => <View key={label} style={{ flex: 1, gap: 8 }}>
              <View style={{ height: 4, borderRadius: 4, backgroundColor: index <= step ? theme.backgroundAccent : theme.border }} />
              <Text style={{ color: index === step ? theme.text : theme.textSecondary, fontSize: 12 }}>{index + 1}. {t(label)}</Text>
            </View>)}
          </View>
          {step === 0 && <>
            <Text accessibilityRole="header" style={{ color: theme.textHeading, fontSize: 32, lineHeight: 40, fontWeight: "600" }}>{t("welcomeChooseLanguage")}</Text>
            <Text style={{ color: theme.textSecondary, fontSize: 16, lineHeight: 24 }}>{t("welcomeLanguageHelp")}</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
              {LANGUAGES.map(item => <Pressable key={item.code} accessibilityRole="radio" accessibilityState={{ checked: language === item.code }} onPress={() => setLanguage(item.code)}
                style={{ flexBasis: 180, flexGrow: 1, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: language === item.code ? theme.backgroundAccent : theme.border, backgroundColor: language === item.code ? theme.backgroundSelected : theme.backgroundSecondary }}>
                <Text style={{ color: theme.text, fontSize: 16 }}>{item.name}{language === item.code ? "  ✓" : ""}</Text>
              </Pressable>)}
            </View>
            {interfaceLoading && <Text accessibilityLiveRegion="polite" style={{ color: theme.textSecondary }}>{t("translating")}</Text>}
          </>}
          {step === 1 && <>
            <Text accessibilityRole="header" style={{ color: theme.textHeading, fontSize: 34, lineHeight: 42, fontWeight: "600" }}>{t("welcomeTitle")}</Text>
            <Text style={{ color: theme.textSecondary, fontSize: 17, lineHeight: 27 }}>{t("welcomeIntro")}</Text>
            <View style={{ gap: 12 }}>
              {([
                ["file-lines", "welcomeDocuments", "welcomeDocumentsHelp"],
                ["calendar-check", "welcomeDeadlines", "welcomeDeadlinesHelp"],
                ["comments", "welcomeSupport", "welcomeSupportHelp"],
              ] as const).map(([icon, title, detail]) => <View key={title} style={{ flexDirection: "row", gap: 16, padding: 20, borderRadius: 16, backgroundColor: theme.backgroundSecondary }}>
                <FontAwesomeFreeSolid name={icon} size={24} color={theme.backgroundAccent} />
                <View style={{ flex: 1, gap: 6 }}><Text style={{ color: theme.textHeading, fontSize: 18, fontWeight: "600" }}>{t(title)}</Text><Text style={{ color: theme.textSecondary, fontSize: 15, lineHeight: 23 }}>{t(detail)}</Text></View>
              </View>)}
            </View>
            <Text style={{ color: theme.textSecondary, fontSize: 12, lineHeight: 19 }}>{t("composerDisclaimer")}</Text>
          </>}
          {step === 2 && <View style={{ padding: 24, gap: 14, borderRadius: 20, backgroundColor: theme.backgroundSecondary }}>
            <Text accessibilityRole="header" style={{ color: theme.textHeading, fontSize: 28, fontWeight: "600" }}>{t(mode === "register" ? "authCreateAccount" : "authSignIn")}</Text>
            <Text style={{ color: theme.textSecondary, lineHeight: 22 }}>{t("welcomeAccountHelp")}</Text>
            <Text style={{ color: theme.text }}>{t("authUsername")}</Text>
            <TextInput accessibilityLabel={t("authUsername")} autoCapitalize="none" autoCorrect={false} autoComplete="username" value={username} onChangeText={setUsername} editable={!busy} maxLength={32} style={inputStyle} />
            <Text style={{ color: theme.textSecondary, fontSize: 12 }}>{t("authUsernameHelp")}</Text>
            <Text style={{ color: theme.text }}>{t("authPassword")}</Text>
            <TextInput accessibilityLabel={t("authPassword")} secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete={mode === "register" ? "new-password" : "current-password"} value={password} onChangeText={setPassword} editable={!busy} style={inputStyle} />
            {mode === "register" && <>
              <Text style={{ color: theme.textSecondary, fontSize: 12, lineHeight: 18 }}>{t("authPasswordHelp")}</Text>
              <Text style={{ color: theme.text }}>{t("authConfirmPassword")}</Text>
              <TextInput accessibilityLabel={t("authConfirmPassword")} secureTextEntry autoComplete="new-password" value={confirmation} onChangeText={setConfirmation} editable={!busy} style={inputStyle} />
            </>}
            {error !== "" && <Text accessibilityRole="alert" style={{ color: theme.textWarning }}>{t(error)}</Text>}
            <ThemedPressable accessibilityRole="button" disabled={busy || !username.trim() || !password} onPress={() => void submit()} style={{ padding: 16, borderRadius: 12, alignItems: "center", opacity: busy || !username.trim() || !password ? 0.6 : 1 }}>
              {busy ? <ActivityIndicator color={theme.textOnAccent} /> : <Text style={{ color: theme.textOnAccent, fontSize: 16, fontWeight: "600" }}>{t(mode === "register" ? "authCreateAccount" : "authSignIn")}</Text>}
            </ThemedPressable>
            <Pressable disabled={busy} accessibilityRole="button" onPress={switchMode} style={{ paddingVertical: 10 }}><Text style={{ color: theme.text, textAlign: "center" }}>{t(mode === "register" ? "authAlreadyAccount" : "authNeedAccount")}</Text></Pressable>
          </View>}
          {step < 2 && <ThemedPressable accessibilityRole="button" onPress={() => setStep(step + 1)} style={{ padding: 18, borderRadius: 14, alignItems: "center" }}><Text style={{ color: theme.textOnAccent, fontSize: 16, fontWeight: "600" }}>{t(step === 1 ? "authCreateAccount" : "welcomeContinue")}</Text></ThemedPressable>}
          <View style={{ flexDirection: "row", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            {step > 0 && <Pressable accessibilityRole="button" disabled={busy} onPress={() => { setStep(step - 1); setError(""); setPassword(""); setConfirmation(""); }} style={{ padding: 12 }}><Text style={{ color: theme.textSecondary }}>{t("back")}</Text></Pressable>}
            {step < 2 && <Pressable accessibilityRole="button" onPress={() => { setMode("login"); setStep(2); }} style={{ padding: 12 }}><Text style={{ color: theme.text }}>{t("authAlreadyAccount")}</Text></Pressable>}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
