import { sendDemoNotification, type DemoNotificationResult } from "@/events/demoNotification";
import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { usePathname } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/store";
import { viewFirstTime } from "@/slice";
import { useMenu } from "@/context/MenuContext";
import { useAppColorScheme } from "@/context/ThemeContext";
import { getTheme } from "@/constants/theme";
import { useTranslation } from "@/Translation/TranslationContext";

export const TOUR_STEPS = [
  { target: "upload", title: "tourUploadTitle", description: "tourUploadBody", menu: false },
  { target: "menu", title: "tourMenuTitle", description: "tourMenuBody", menu: false },
  { target: "menuChat", title: "menuChat", description: "tourChatBody", menu: true },
  { target: "menuProfile", title: "menuProfile", description: "tourProfileBody", menu: true },
  { target: "menuCaseStatus", title: "menuCaseStatus", description: "tourCaseStatusBody", menu: true },
  { target: "menuCalendar", title: "menuCalendar", description: "tourCalendarBody", menu: true },
  { target: "menuCalendar", title: "tourNotificationsTitle", description: "tourNotificationsBody", menu: true },
  { target: "menuLawyerConnect", title: "menuLawyerConnect", description: "tourLawyersBody", menu: true },
  { target: "upload", title: "tourReadyTitle", description: "tourReadyBody", menu: false },
] as const;
type Target = { node: View; reveal?: () => void };
type Rect = { x: number; y: number; width: number; height: number };
const TourContext = createContext<{ register: (name: string, target: Target) => () => void } | null>(null);

export function TourTarget({ name, children, reveal }: { name: string; children: ReactNode; reveal?: (y: number) => void }) {
  const tour = useContext(TourContext);
  const ref = useRef<View>(null);
  const y = useRef(0);
  const revealRef = useRef(reveal);
  revealRef.current = reveal;
  useEffect(() => {
    if (ref.current) return tour?.register(name, { node: ref.current, reveal: () => revealRef.current?.(y.current) });
  }, [tour, name]);
  return <View ref={ref} collapsable={false} onLayout={event => { y.current = event.nativeEvent.layout.y; }}>{children}</View>;
}

export function GuidedTourProvider({ children }: { children: ReactNode }) {
  const firstTime = useSelector((state: RootState) => state.app.firstTime);
  const pathname = usePathname();
  const active = firstTime && pathname === "/profile";
  const [step, setStep] = useState(0);
  const [demoResult, setDemoResult] = useState<DemoNotificationResult | null>(null);
  const demoAttempted = useRef(false);
  const demoActive = useRef(false);
  const [rect, setRect] = useState<Rect | null>(null);
  const [bubbleHeight, setBubbleHeight] = useState(240);
  const targets = useRef(new Map<string, Target>());
  const { menuOpen, setMenuOpen } = useMenu();
  const originalMenu = useRef(menuOpen);
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const theme = getTheme(useAppColorScheme());
  const { width, height } = useWindowDimensions();
  const current = TOUR_STEPS[step];
  const isNotificationStep = current.title === "tourNotificationsTitle";
  demoActive.current = active && isNotificationStep;
  useEffect(() => () => { demoActive.current = false; }, [active]);
  const register = useCallback((name: string, target: Target) => {
    targets.current.set(name, target);
    return () => { if (targets.current.get(name) === target) targets.current.delete(name); };
  }, []);
  const [context] = useState(() => ({ register }));

  useEffect(() => {
    if (!active) return;
    originalMenu.current = menuOpen;
    return () => setMenuOpen(originalMenu.current);
    // Capture menu state when the tour opens, rather than after each guided step.
  }, [active, setMenuOpen]);
  useEffect(() => {
    if (!active) return;
    setMenuOpen(current.menu);
    setRect(null);
    let cancelled = false;
    let revealed = false;
    const measure = () => {
      const target = targets.current.get(current.target);
      if (!target) return;
      if (!revealed) { target.reveal?.(); revealed = true; }
      target.node.measureInWindow((x, y, w, h) => {
        if (cancelled || w <= 0 || h <= 0) return;
        setRect(previous => previous?.x === x && previous.y === y && previous.width === w && previous.height === h ? previous : { x, y, width: w, height: h });
      });
    };
    // Track scroll and responsive layout changes while the bubble is visible.
    const timer = setInterval(measure, 150);
    measure();
    return () => { cancelled = true; clearInterval(timer); };
  }, [active, current, setMenuOpen, width, height]);

  function goToStep(next: number) {
    const enteringDemo = TOUR_STEPS[next]?.title === "tourNotificationsTitle";
    demoActive.current = active && enteringDemo;
    setStep(next);
    if (!enteringDemo && demoAttempted.current && demoResult === null) setDemoResult("cancelled");
    if (enteringDemo && !demoAttempted.current) {
      demoAttempted.current = true;
      void sendDemoNotification(t("tourDemoNotificationTitle"), t("tourDemoNotificationBody"), () => demoActive.current)
        .then(result => { if (demoActive.current) setDemoResult(result); });
    }
  }
  function finish() { demoActive.current = false; dispatch(viewFirstTime()); setStep(0); }
  const margin = 16;
  const bubbleWidth = Math.min(360, Math.max(0, width - margin * 2));
  const visibleRect = rect && rect.y < height && rect.y + rect.height > 0 ? rect : null;
  const below = !visibleRect || visibleRect.y + visibleRect.height + bubbleHeight + 28 < height;
  const left = Math.max(margin, Math.min(width - bubbleWidth - margin, visibleRect ? visibleRect.x : (width - bubbleWidth) / 2));
  const top = Math.max(margin, Math.min(height - bubbleHeight - margin, visibleRect
    ? below ? visibleRect.y + visibleRect.height + 16 : visibleRect.y - bubbleHeight - 16
    : (height - bubbleHeight) / 2));
  const pointerX = Math.max(20, Math.min(bubbleWidth - 20, visibleRect ? visibleRect.x + Math.min(visibleRect.width / 2, 100) - left : 20));

  return <TourContext.Provider value={context}>
    {children}
    <Modal visible={active} transparent animationType="fade" statusBarTranslucent onRequestClose={finish}>
      <View style={{ flex: 1 }}>
        <View style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0, backgroundColor: "rgba(0,0,0,0.45)" }} />
        {visibleRect && <View pointerEvents="none" style={{ position: "absolute", left: visibleRect.x - 4, top: visibleRect.y - 4, width: visibleRect.width + 8, height: visibleRect.height + 8, borderWidth: 3, borderColor: theme.backgroundAccent, borderRadius: 12 }} />}
        <View accessibilityViewIsModal style={{ position: "absolute", left, top, width: bubbleWidth }}>
          {visibleRect && <View pointerEvents="none" style={{ position: "absolute", left: pointerX - 8, ...(below ? { top: -8 } : { bottom: -8 }), width: 16, height: 16, backgroundColor: theme.backgroundSecondary, transform: [{ rotate: "45deg" }] }} />}
          <View onLayout={event => setBubbleHeight(event.nativeEvent.layout.height)} style={{ backgroundColor: theme.backgroundSecondary, borderRadius: 18, padding: 20, maxHeight: Math.max(120, height - 48), gap: 16 }}>
            <ScrollView contentContainerStyle={{ gap: 12 }}>
              <Text style={{ color: theme.textSecondary, fontSize: 12 }}>{t("tourStep")} {step + 1} / {TOUR_STEPS.length}</Text>
              <Text accessibilityRole="header" accessibilityLiveRegion="polite" style={{ color: theme.textHeading, fontSize: 22, fontWeight: "600", lineHeight: 28 }}>{t(current.title)}</Text>
              <Text style={{ color: theme.text, fontSize: 15, lineHeight: 24 }}>{t(current.description)}</Text>
              {isNotificationStep && <View accessibilityLiveRegion="polite" style={{ padding: 14, gap: 8, borderRadius: 12, borderWidth: 1, borderColor: theme.backgroundAccent, backgroundColor: theme.backgroundSelected }}>
                <Text style={{ color: theme.textHeading, fontSize: 16, fontWeight: "600" }}>{t("tourDemoNotificationTitle")}</Text>
                <Text style={{ color: theme.text, lineHeight: 22 }}>{t("tourDemoNotificationBody")}</Text>
                <Text style={{ color: theme.textSecondary, fontSize: 12 }}>{t(demoResult === "sent" ? "tourDemoSent" : demoResult === null ? "tourDemoPending" : "tourDemoPreview")}</Text>
              </View>}
            </ScrollView>
            <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <Pressable accessibilityRole="button" onPress={finish} style={{ paddingVertical: 12, paddingRight: 8 }}><Text style={{ color: theme.textSecondary }}>{t("tourSkip")}</Text></Pressable>
              <View style={{ flex: 1 }} />
              {step > 0 && <Pressable accessibilityRole="button" onPress={() => goToStep(step - 1)} style={{ padding: 12 }}><Text style={{ color: theme.text }}>{t("back")}</Text></Pressable>}
              <Pressable accessibilityRole="button" onPress={() => step === TOUR_STEPS.length - 1 ? finish() : goToStep(step + 1)} style={{ padding: 12, borderRadius: 10, backgroundColor: theme.backgroundAccent }}>
                <Text style={{ color: theme.textOnAccent, fontWeight: "600" }}>{t(step === TOUR_STEPS.length - 1 ? "tourStart" : "tourNext")}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  </TourContext.Provider>;
}
