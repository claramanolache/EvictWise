import { useProfileCoordinates } from "@/hooks/useProfileCoordinates";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "@/store";
import { setLawyerPreferences } from "@/slice";
import { normalizeLawyerProfile, rankLawyers, lawyerNeeds, hasCoordinates } from "@/utils/lawyerRecommendations";
import ThemedPressable from "@/components/ThemedPressable";
import LawyerPreferences from "@/components/LawyerPreferences";
import FontAwesomeFreeSolid from "@react-native-vector-icons/fontawesome-free-solid";
import { useLawyerTranslation } from "@/hooks/useLawyerTranslation";
import organizations from "@/data/lawyers.json";
import { useAppColorScheme as useColorScheme } from "@/context/ThemeContext";
import { useState } from "react";
import { Linking, Modal, Pressable, ScrollView, Text, View, } from "react-native";
import Layout from "@/components/Layout";
import { getTheme } from "@/constants/theme";
import { useTranslation } from "@/Translation/TranslationContext";

export default function LawyerConnect() {
  const { t, language } = useTranslation();
  const dispatch = useDispatch();
  const { lawyerPreferences, location, preferredLanguage } = useSelector((state: RootState) => state.app);
  const coordinates = useProfileCoordinates(location);
  const preferences = normalizeLawyerProfile(lawyerPreferences);
  const ranked = rankLawyers(organizations, preferences, location, preferredLanguage || language);
  const [appliedRankings, setAppliedRankings] = useState<typeof ranked | null>(null);
  const displayedRankings = appliedRankings ?? ranked;
  const best = ranked.find(item => item.serviceMatch);
  const { translateDetail, loading: translating, failed: translationFailed, retry } = useLawyerTranslation(language);
  const [submitted, setSubmitted] = useState<{ match: typeof best } | null>(null);
  const [expanded, setExpanded] = useState(false);
  const theme = getTheme(useColorScheme());
  const [failed, setFailed] = useState(false);

  function testPrice(organization: typeof organizations[number]) {
    if (!organization.priceFabricatedForTesting || organization.testPriceUsd === null) return null;
    return <View style={{ padding: 12, gap: 6, borderRadius: 8, backgroundColor: theme.backgroundError }}>
      <Text style={{ color: theme.textWarning, fontWeight: "600" }}>{t("lawyerTestPrice")}: ${organization.testPriceUsd.toFixed(2)} {t("lawyerTestPriceUnit")}</Text>
      <Text style={{ color: theme.textWarning, lineHeight: 20 }}>{t("lawyerTestPriceDisclosure")}</Text>
    </View>;
  }

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
        <Text accessibilityRole="alert" style={{ color: theme.textWarning }}>{t("lawyerTestPriceDisclosure")}</Text>
        <LawyerPreferences values={preferences.weights} onChange={(key, value) => dispatch(setLawyerPreferences({ ...preferences, weights: { ...preferences.weights, [key]: value } }))}>
        <Text accessibilityRole="header" style={{ color: theme.textHeading, fontSize: 20, fontWeight: "600" }}>{t("lawyerNeed")}</Text>
        <Text style={{ color: theme.textSecondary }}>{t("lawyerNeedsHelp")}</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {lawyerNeeds.map(need => <Pressable key={need} accessibilityRole="checkbox" accessibilityLabel={translateDetail(need)} accessibilityState={{ checked: preferences.needs.includes(need) }}
            onPress={() => dispatch(setLawyerPreferences({ ...preferences, needs: preferences.needs.includes(need) ? preferences.needs.filter(value => value !== need) : [...preferences.needs, need] }))}
            style={{ padding: 12, borderRadius: 8, borderWidth: 1, borderColor: theme.border, backgroundColor: preferences.needs.includes(need) ? theme.backgroundAccent : theme.backgroundSecondary }}>
            <Text style={{ color: preferences.needs.includes(need) ? theme.textOnAccent : theme.text }}>{preferences.needs.includes(need) ? "✓ " : ""}{translateDetail(need)}</Text>
          </Pressable>)}
        </View>
        </LawyerPreferences>
        <ThemedPressable accessibilityRole="button" accessibilityLabel={t("doneEditing")} disabled={coordinates.loading || preferences.needs.length === 0}
          onPress={() => { if (coordinates.loading || preferences.needs.length === 0) return; setFailed(false); setAppliedRankings(ranked); setSubmitted({ match: best }); }}
          style={{ alignSelf: "flex-start", paddingHorizontal: 28, paddingVertical: 12, borderRadius: 10 }}>
          <Text style={{ color: theme.textOnAccent, fontWeight: "600", fontSize: 16 }}>{t("doneEditing")}</Text>
        </ThemedPressable>
        {coordinates.loading && <Text accessibilityLiveRegion="polite" style={{ color: theme.textSecondary }}>{t("lawyerDistanceLoading")}</Text>}
        {coordinates.failed && <View style={{ gap: 8 }}>
          <Text accessibilityRole="alert" style={{ color: theme.textWarning }}>{t("lawyerDistanceLookupFailed")}</Text>
          <Pressable accessibilityRole="button" onPress={coordinates.retry}><Text style={{ color: theme.text }}>{t("lawyerDistanceRetry")}</Text></Pressable>
        </View>}
        <Text style={{ color: theme.textSecondary }}>{t("lawyerRankingMethod")}</Text>
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
          {displayedRankings.map(({ organization, serviceMatch, matchedServices, languageMatch, score, distanceMiles }) => (
            <View key={organization.id} style={{ flexGrow: 1, flexBasis: 340, minWidth: 0, maxWidth: "100%", padding: 20, gap: 12, borderWidth: 1, borderColor: theme.border, borderRadius: 12, backgroundColor: theme.backgroundSecondary }}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                <Text accessibilityRole="header" style={{ flexShrink: 1, color: theme.textHeading, fontSize: 20, lineHeight: 28, fontWeight: "600" }}>{organization.name}</Text>
                <Text accessibilityLabel={`${organization.name}: ${score}% ${t("lawyerMatchScore")}`}
                  style={{ color: theme.backgroundAccent, backgroundColor: theme.backgroundSelected, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, fontSize: 16, fontWeight: "600" }}>{score}%</Text>
              </View>
              {testPrice(organization)}
              <Text style={{ color: theme.textSecondary }}>{distanceMiles === null ? t(hasCoordinates(location) ? "lawyerOfficeDistanceUnknown" : "lawyerDistanceUnknown") : `${t("lawyerDistance")}: ${distanceMiles.toFixed(1)} ${t("lawyerMiles")}`}</Text>
              <Text style={{ color: theme.textSecondary }}>{serviceMatch ? `${t("lawyerServiceMatch")}: ${matchedServices.map(translateDetail).join(", ")}` : t("lawyerServiceUnknown")}</Text>
              <Text style={{ color: theme.textSecondary }}>{t(languageMatch ? "lawyerLanguageMatch" : "lawyerLanguageUnknown")}</Text>
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
      {submitted && <Modal visible transparent animationType="fade" onRequestClose={() => setSubmitted(null)}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: "rgba(0,0,0,0.6)" }}>
          <View accessibilityViewIsModal style={{ width: "100%", maxWidth: 560, maxHeight: "90%", backgroundColor: theme.backgroundSecondary, borderRadius: 16, padding: 24, gap: 16 }}>
            <Text accessibilityRole="header" style={{ color: theme.textHeading, fontSize: 22, fontWeight: "600" }}>{t("lawyerRecommendation")}</Text>
            <ScrollView contentContainerStyle={{ gap: 12 }}>
              {submitted.match ? <>
                <Text style={{ color: theme.textHeading, fontSize: 20, fontWeight: "600" }}>{submitted.match.organization.name}</Text>
                <Text style={{ color: theme.text }}>{translateDetail(submitted.match.organization.description)}</Text>
                {testPrice(submitted.match.organization)}
                <Text style={{ color: theme.text }}>{t("lawyerMatchScore")}: {submitted.match.score}/100</Text>
                <Text style={{ color: theme.textSecondary }}>{submitted.match.distanceMiles === null ? t(hasCoordinates(location) ? "lawyerOfficeDistanceUnknown" : "lawyerDistanceUnknown") : `${t("lawyerDistance")}: ${submitted.match.distanceMiles.toFixed(1)} ${t("lawyerMiles")}`}</Text>
                <Text style={{ color: theme.textSecondary }}>{t("lawyerServiceMatch")}: {submitted.match.matchedServices.map(translateDetail).join(", ")}</Text>
                <Text style={{ color: theme.textSecondary }}>{t(submitted.match.languageMatch ? "lawyerLanguageMatch" : "lawyerLanguageUnknown")}</Text>
                {[
                  { label: "lawyerWebsite", value: submitted.match.organization.website, url: submitted.match.organization.website },
                  { label: "lawyerPhone", value: submitted.match.organization.phone, url: `tel:${submitted.match.organization.phone.replace(/[^+0-9]/g, "")}` },
                  { label: "lawyerEmail", value: submitted.match.organization.email, url: submitted.match.organization.email ? `mailto:${submitted.match.organization.email}` : null },
                ].filter(contact => contact.url).map(contact => <Pressable key={contact.label} accessibilityRole="link"
                  accessibilityLabel={`${t(contact.label)}: ${contact.value}`} onPress={() => void openDirectory(contact.url!)} style={{ paddingVertical: 8 }}>
                  <Text style={{ color: theme.text, textDecorationLine: "underline" }}>{t(contact.label)}: {contact.value}</Text>
                </Pressable>)}
              </> : <Text style={{ color: theme.text }}>{t("lawyerNoConfirmedMatch")}</Text>}
              <Text style={{ color: theme.textSecondary, lineHeight: 21 }}>{t("lawyerRecommendationHelp")}</Text>
              {failed && <Text accessibilityRole="alert" style={{ color: theme.textWarning }}>{t("lawyerContactFailed")}</Text>}
            </ScrollView>
            <ThemedPressable accessibilityRole="button" accessibilityLabel={t("closeDocument")} onPress={() => setSubmitted(null)}
              style={{ padding: 12, alignItems: "center", borderRadius: 10 }}>
              <Text style={{ color: theme.textOnAccent, fontWeight: "600" }}>{t("closeDocument")}</Text>
            </ThemedPressable>
          </View>
        </View>
      </Modal>}
    </Layout>
  );
}
