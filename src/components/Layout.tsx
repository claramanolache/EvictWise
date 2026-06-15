import {
  Text,
  View,
  StyleSheet,
  useColorScheme,
  Pressable,
  Animated,
  Easing,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { getTheme, Fonts, Spacing } from "@/constants/theme";
import { ReactNode, useEffect, useRef } from "react";
import { useMenu } from "@/context/MenuContext";
import { FontAwesomeFreeSolid } from "@react-native-vector-icons/fontawesome-free-solid";

interface LayoutProps {
  children: ReactNode;
}

const menuItems = [
  { label: "Chat", route: "/" },
  { label: "Documents", route: "/documents" },
  { label: "Profile", route: "/profile" },
  { label: "Calendar", route: "/calendar" },
];

export default function Layout({ children }: LayoutProps) {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);
  const { menuOpen, setMenuOpen } = useMenu();
  const menuTranslate = useRef(new Animated.Value(menuOpen ? 0 : -220)).current;

  useEffect(() => {
    Animated.timing(menuTranslate, {
      toValue: menuOpen ? 0 : -220,
      duration: 250,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [menuOpen, menuTranslate]);

  const handleNavigation = (route: string) => {
    router.push(route as any);
    setMenuOpen(false);
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <Animated.View
        pointerEvents={menuOpen ? "auto" : "none"}
        style={[
          styles.sidebar,
          { backgroundColor: theme.backgroundSecondary },
          { transform: [{ translateX: menuTranslate }] },
        ]}
      >
        {menuItems.map((item) => (
          <Pressable
            key={item.label}
            style={styles.menuItem}
            onPress={() => handleNavigation(item.route)}
          >
            <Text style={[styles.menuItemText, { color: theme.text }]}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </Animated.View>

      <Pressable
        style={styles.hamburger}
        onPress={() => setMenuOpen(!menuOpen)}
      >
        <FontAwesomeFreeSolid name="navicon" size={18} color={theme.text} />
      </Pressable>

      <View style={styles.page}>
        <View style={styles.pageContent}>{children}</View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
  },
  hamburger: {
    position: "absolute",
    top: 32,
    left: 0,
    padding: Spacing.three,
    zIndex: 2,
  },
  sidebar: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 220,
    height: 1000,
    padding: 0,
    paddingTop: 48 + 32,
    zIndex: 1,
  },
  menuItem: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  menuItemText: {
    fontSize: 16,
    fontFamily: Fonts?.sans,
  },
  page: {
    marginTop: 48 + 32,
    flex: 1,
    minWidth: 0,
    maxHeight: "100%",
    overflow: "hidden",
  },
  pageContent: {
    flex: 1,
    minWidth: 0,
  },
});
