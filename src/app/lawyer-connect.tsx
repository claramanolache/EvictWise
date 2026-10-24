import LawyerPreferences from "@/components/LawyerPreferences";
import FontAwesomeFreeSolid from "@react-native-vector-icons/fontawesome-free-solid";
import { useLawyerTranslation } from "@/hooks/useLawyerTranslation";
import organizations from "@/data/lawyers.json";
import { useAppColorScheme as useColorScheme } from "@/context/ThemeContext";
import { useState } from "react";
import { Linking, Pressable, ScrollView, Text, View, } from "react-native";
import Layout from "@/components/Layout";
import { getTheme } from "@/constants/theme";
import { useTranslation } from "@/Translation/TranslationContext";

export default function LawyerConnect() {
  const { t, language } = useTranslation();
  const { translateDetail, loading: translating, failed: translationFailed, retry } = useLawyerTranslation(language);
  const [expanded, setExpanded] = useState(false);
  const theme = getTheme(useColorScheme());
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
        <Text accessibilityRole="header" style={{ color: theme.textHeading, fontSize: 28, fontWeight: "700" }}>{t("menuLawyerConnect")}</Text>
        <LawyerPreferences />
        <Text style={{ color: theme.textSecondary, fontSize: 16, lineHeight: 24 }}>{t("lawyerConnectDescription")}</Text>
        {failed && <Text accessibilityRole="alert" style={{ color: theme.textWarning, backgroundColor: theme.backgroundError, padding: 12, borderRadius: 8 }}>{t("lawyerContactFailed")}</Text>}
        <Pressable accessibilityRole="button" accessibilityLabel={t("lawyerOrganizations")} accessibilityState={{ expanded }}
          onPress={() => setExpanded(value => !value)}
          style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 48 }}>
          <Text style={{ flex: 1, color: theme.textHeading, fontSize: 22, fontWeight: "600" }}>{t("lawyerOrganizations")}</Text>
          <FontAwesomeFreeSolid name={expanded ? "chevron-up" : "chevron-down"} size={18} color={theme.textSecondary} />
        </Pressable>
        {expanded && <View style={{ gap: 16 }}>
        {translating && <Text accessibilityLiveRegion="polite" style={{ color: theme.textSecondary }}>{t("translating")}</Text>}
        {translationFailed && <View style={{ gap: 8 }}>
          <Text accessibilityRole="alert" style={{ color: theme.textWarning }}>{t("lawyerTranslationFailed")}</Text>
          <Pressable accessibilityRole="button" onPress={retry} style={{ paddingVertical: 8 }}><Text style={{ color: theme.text }}>{t("retryTranslation")}</Text></Pressable>
        </View>}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
          {organizations.map(organization => (
            <View key={organization.id} style={{ flexGrow: 1, flexBasis: 340, minWidth: 0, maxWidth: "100%", padding: 20, gap: 12, borderWidth: 1, borderColor: theme.border, borderRadius: 12, backgroundColor: theme.backgroundSecondary }}>
              <Text accessibilityRole="header" style={{ color: theme.textHeading, fontSize: 20, lineHeight: 28, fontWeight: "600" }}>{organization.name}</Text>
              <Text style={{ color: theme.text, fontSize: 14, lineHeight: 22 }}>{translateDetail(organization.description)}</Text>
              {[
                ["lawyerCounties", organization.counties.join(", ")],
                ["lawyerServices", organization.services.map(translateDetail).join(", ")],
                ["lawyerRepresentation", organization.representationLevels.map(translateDetail).join(", ")],
                ["lawyerCaseStages", organization.caseStages.map(translateDetail).join(", ")],
                ["lawyerAddress", organization.address],
                ["lawyerLanguages", organization.languages.map(translateDetail).join(", ")],
              ].map(([label, value]) => <View key={label} style={{ gap: 3 }}>
                <Text style={{ color: theme.textSecondary, fontSize: 12, fontWeight: "600" }}>{t(label!)}</Text>
                <Text selectable style={{ color: theme.text, fontSize: 14, lineHeight: 21 }}>{value || t("lawyerNotProvided")}</Text>
              </View>)}
              {organization.language_assistance_notes && <Text style={{ color: theme.textSecondary, fontSize: 13, lineHeight: 20 }}>{translateDetail(organization.language_assistance_notes)}</Text>}
              {[
                { label: "lawyerWebsite", value: organization.website, url: organization.website },
                { label: "lawyerPhone", value: organization.phone, url: `tel:${organization.phone.replace(/[^+0-9]/g, "")}` },
                { label: "lawyerEmail", value: organization.email, url: organization.email ? `mailto:${organization.email}` : null },
              ].map(contact => <View key={contact.label} style={{ gap: 3 }}>
                <Text style={{ color: theme.textSecondary, fontSize: 12, fontWeight: "600" }}>{t(contact.label)}</Text>
                {contact.url ? <Pressable accessibilityRole="link" accessibilityLabel={`${t(contact.label)}: ${contact.value}`} onPress={() => void openDirectory(contact.url!)} style={{ paddingVertical: 6 }}>
                  <Text style={{ color: theme.text, fontSize: 14, lineHeight: 21, textDecorationLine: "underline" }}>{contact.value}</Text>
                </Pressable> : <Text style={{ color: theme.textSecondary }}>{t("lawyerNotProvided")}</Text>}
              </View>)}
            </View>
          ))}
        </View>
        </View>}
      </ScrollView>
    </Layout>
  );
}
