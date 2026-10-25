import { TourTarget } from "@/context/GuidedTourContext";
import { useAppTheme, useAppColorScheme } from "@/context/ThemeContext";
import { Text, View, StyleSheet, Switch, Pressable, ScrollView, useWindowDimensions } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, usePathname } from "expo-router";
import { getTheme, Fonts } from "@/constants/theme";
import { ReactNode, useState } from "react";
import { useMenu } from "@/context/MenuContext";
import { FontAwesomeFreeSolid } from "@react-native-vector-icons/fontawesome-free-solid";
import { useTranslation } from "@/Translation/TranslationContext";

const menuItems = [
  { label: "menuChat", route: "/chat", icon: "chat" },
  { label: "menuProfile", route: "/profile", icon: "profile" },
  { label: "menuCaseStatus", route: "/case-status", icon: "case" },
  { label: "menuCalendar", route: "/calendar", icon: "calendar" },
  { label: "menuLawyerConnect", route: "/lawyer-connect", icon: "case" },
];

// Small outline icons built from native views work on both mobile and web.
function NavigationIcon({ kind, color }: { kind: string; color: string }) {
  return <View accessible={false} style={{ width: 22, height: 22, alignItems: "center", justifyContent: "center" }}>
    {kind === "profile" ? <>
      <View style={{ width: 8, height: 8, borderWidth: 1.5, borderColor: color, borderRadius: 5, marginBottom: 2 }} />
      <View style={{ width: 17, height: 9, borderWidth: 1.5, borderColor: color, borderTopLeftRadius: 9, borderTopRightRadius: 9 }} />
    </> : <>
      {kind === "case" && <View style={{ width: 9, height: 4, borderWidth: 1.5, borderColor: color, borderBottomWidth: 0, borderTopLeftRadius: 2, borderTopRightRadius: 2 }} />}
      <View style={{ width: 19, height: 16, borderWidth: 1.5, borderColor: color, borderRadius: kind === "chat" ? 5 : 3, justifyContent: "center" }}>
        <View style={{ borderTopWidth: 1.5, borderColor: color, marginHorizontal: kind === "chat" ? 4 : 0, marginTop: kind === "calendar" ? -5 : 0 }} />
      </View>
      {kind === "chat" && <View style={{ position: "absolute", bottom: 0, left: 4, height: 5, borderLeftWidth: 1.5, borderColor: color, transform: [{ rotate: "25deg" }] }} />}
    </>}
  </View>;
}

export default function Layout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const narrow = width < 768;
  const [hoveredMenu, setHoveredMenu] = useState<string | null>(null);
  const { toggle } = useAppTheme();
  const { t } = useTranslation();
  const colorScheme = useAppColorScheme();
  const theme = getTheme(colorScheme);
  const { menuOpen, setMenuOpen } = useMenu();

  const sidebar = <View style={[styles.sidebar, { backgroundColor: theme.backgroundSidebar }, narrow && styles.overlay]}>
    <View style={styles.brand}>
      <FontAwesomeFreeSolid name="scale-balanced" size={22} color={theme.textSidebar} />
      <Text style={[styles.brandText, { color: theme.textSidebar }]}>Evict Wise</Text>
      {narrow && <Pressable accessibilityRole="button" accessibilityLabel={t("closeMenu")} onPress={() => setMenuOpen(false)} style={styles.iconButton}>
        <FontAwesomeFreeSolid name="xmark" size={18} color={theme.textSidebar} />
      </Pressable>}
    </View>
    <ScrollView contentContainerStyle={{ padding: 12, gap: 6 }}>
      {menuItems.map(item => {
        const active = pathname === item.route;
        const color = active ? theme.textHeading : theme.textSidebar;
        return <TourTarget key={item.route} name={item.label}><Pressable accessibilityRole="button" accessibilityState={{ selected: active }}
          onHoverIn={() => setHoveredMenu(item.route)} onHoverOut={() => setHoveredMenu(null)}
          onPress={() => { router.push(item.route as "/"); if (narrow) setMenuOpen(false); }}
          style={[styles.menuItem, { backgroundColor: active ? theme.backgroundSelected : hoveredMenu === item.route ? "#253D30" : "transparent" }]}>
          <NavigationIcon kind={item.icon} color={color} />
          <Text style={{ color, fontSize: 15, fontWeight: "500", fontFamily: Fonts.sans }}>{t(item.label)}</Text>
        </Pressable></TourTarget>;
      })}
    </ScrollView>
  </View>;

  return <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
    <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
    {menuOpen && !narrow && sidebar}
    <View style={styles.main}>
      <View style={[styles.header, { borderBottomColor: theme.border, paddingHorizontal: narrow ? 12 : 24 }]}>
        <TourTarget name="menu">
        <Pressable accessibilityRole="button" accessibilityLabel={t(menuOpen ? "closeMenu" : "openMenu")} accessibilityState={{ expanded: menuOpen }} onPress={() => setMenuOpen(!menuOpen)} style={styles.iconButton}>
          <FontAwesomeFreeSolid name="bars" size={18} color={theme.textSecondary} />
        </Pressable>
        </TourTarget>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.brandText, { color: theme.textHeading }]}>Evict Wise</Text>
          <Text style={{ color: theme.textSecondary, fontSize: 12, lineHeight: 18 }}>{t("chatSubtitle")}</Text>
        </View>
        <Switch accessibilityLabel={t("darkMode")} value={colorScheme === "dark"} onValueChange={toggle} trackColor={{ false: theme.border, true: theme.backgroundAccent }} thumbColor="#ffffff" ios_backgroundColor={theme.border} />
      </View>
      <View style={styles.main}>{children}</View>
    </View>
    {menuOpen && narrow && <>
      <Pressable accessibilityRole="button" accessibilityLabel={t("closeMenu")} onPress={() => setMenuOpen(false)} style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.5)", zIndex: 10 }]} />
      {sidebar}
    </>}
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: "row", overflow: "hidden" },
  main: { flex: 1, minWidth: 0, minHeight: 0 },
  sidebar: { width: 240, flexShrink: 0 },
  overlay: { position: "absolute", top: 0, bottom: 0, left: 0, zIndex: 11 },
  brand: { minHeight: 82, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", gap: 10 },
  brandText: { fontFamily: Fonts.sans, fontSize: 19, fontWeight: "600" },
  menuItem: { padding: 13, borderRadius: 10, flexDirection: "row", alignItems: "center", gap: 12 },
  header: { minHeight: 82, paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1 },
  iconButton: { width: 40, height: 44, alignItems: "center", justifyContent: "center" },
});
