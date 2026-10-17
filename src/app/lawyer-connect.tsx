import { useState } from "react";
import { Linking, Pressable, ScrollView, Text, View, useColorScheme } from "react-native";
import { useRouter } from "expo-router";
import { useSelector } from "react-redux";
import Layout from "@/components/Layout";
import { getTheme } from "@/constants/theme";
import { RootState } from "@/store";
import { useTranslation } from "@/Translation/TranslationContext";

const resources = [
  { name: "Legal Services Corporation", description: "lawyerLegalAidDescription", url: "https://www.lsc.gov/about-lsc/what-legal-aid/i-need-legal-help" },
  { name: "American Bar Association", description: "lawyerReferralDescription", url: "https://www.americanbar.org/groups/legal_services/flh-home/" },
];

export default function LawyerConnect() {
  const { t } = useTranslation();
  const theme = getTheme(useColorScheme());
  const router = useRouter();
  const location = useSelector((state: RootState) => state.app.location);
  const [failed, setFailed] = useState(false);

  async function openDirectory(url: string) {
    setFailed(false);
    try {
      await Linking.openURL(url);
    } catch {
      setFailed(true);
    }
  }

  return (
    <Layout>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 20 }}>
        <Text accessibilityRole="header" style={{ color: theme.text, fontSize: 28, fontWeight: "700" }}>{t("menuLawyerConnect")}</Text>
        <Text style={{ color: theme.textSecondary, fontSize: 16, lineHeight: 24 }}>{t("lawyerConnectDescription")}</Text>
        <View style={{ padding: 20, gap: 12, borderRadius: 12, backgroundColor: theme.backgroundSecondary }}>
          <Text style={{ color: theme.text, fontWeight: "600" }}>{t("locationLabel")}</Text>
          <Text style={{ color: theme.text }}>{location ? [location.city, location.state, location.country].filter(Boolean).join(", ") : t("notSet")}</Text>
          <Pressable accessibilityRole="button" onPress={() => router.push("/profile")} style={{ paddingVertical: 10 }}>
            <Text style={{ color: theme.text, textDecorationLine: "underline" }}>{t("lawyerReviewProfile")}</Text>
          </Pressable>
        </View>
        {resources.map((resource) => (
          <View key={resource.url} style={{ padding: 20, gap: 12, borderRadius: 12, backgroundColor: theme.backgroundSecondary }}>
            <Text accessibilityRole="header" style={{ color: theme.text, fontSize: 20, fontWeight: "600" }}>{resource.name}</Text>
            <Text style={{ color: theme.textSecondary, lineHeight: 22 }}>{t(resource.description)}</Text>
            <Pressable accessibilityRole="link" accessibilityLabel={`${t("lawyerOpenDirectory")}: ${resource.name}`} onPress={() => void openDirectory(resource.url)} style={{ padding: 12, borderRadius: 8, backgroundColor: theme.backgroundAccent }}>
              <Text style={{ color: theme.text, fontWeight: "600" }}>{t("lawyerOpenDirectory")}</Text>
            </Pressable>
          </View>
        ))}
        {failed && <Text accessibilityRole="alert" style={{ color: theme.text }}>{t("lawyerLinkFailed")}</Text>}
      </ScrollView>
    </Layout>
  );
}
