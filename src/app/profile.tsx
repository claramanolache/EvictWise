import { LANGUAGES } from "@/Translation/languages";
import ThemedPressable from "@/components/ThemedPressable";
import { useAppColorScheme as useColorScheme } from "@/context/ThemeContext";
import AdditionalInformation from "@/components/AdditionalInformation";
import CondensedUserInfo from "@/components/CondensedUserInfo";
import DocumentViewer from "@/components/DocumentViewer";
import { FileData } from "@/types";
import { useTranslation } from "@/Translation/TranslationContext";
import { Text, StyleSheet,  View, Pressable, ScrollView } from "react-native";
import { getTheme, Fonts, Spacing, Themes } from "@/constants/theme";
import Layout from "@/components/Layout";
import React, { useState } from "react";
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store';
import { useDocumentUpload } from "@/hooks/useDocumentUpload";
import { setEvictionNotice, setLeaseAgreement } from "@/slice";
import LocationSelection from "@/Location/locationSelection";

export default function ProfilePage() {
  const { t, language } = useTranslation();
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);
  const styles = createStyles(theme);
  const dispatch = useDispatch();
  const { upload, loading: uploadLoading, failed: uploadFailed, errorKey } = useDocumentUpload();
  const { evictionNotice, leaseAgreement, location } = useSelector((state: RootState) => state.app);
  
  const [viewedFile, setViewedFile] = useState<FileData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showLocationEditor, setShowLocationEditor] = useState(false);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const handleEditClick = () => {
    setIsEditing(!isEditing);
    setShowLocationEditor(false); // Reset location editor when toggling mode
  };

  const handleRowClick = (type: 'eviction' | 'lease' | 'location') => {
    if (!isEditing || uploadLoading) return;

    if (type === 'eviction' || type === 'lease') {
      void upload(type, (file) => {
        dispatch(type === 'eviction' ? setEvictionNotice(file) : setLeaseAgreement(file));
      });
    } else if (type === 'location') {
      setShowLocationEditor(!showLocationEditor);
    }
  };

  const handleLocationSave = () => {
      setShowLocationEditor(false);
      setIsEditing(false); // Exit editing mode
  };

  // Helper function to render rows with hover and click effects during edit mode
  const renderRow = (label: string, value: string, type: 'eviction' | 'lease' | 'location') => {
    const isHovered = hoveredRow === type && isEditing;
    const file = type === "eviction" ? evictionNotice : type === "lease" ? leaseAgreement : null;
    
    return (
      <Pressable
        disabled={uploadLoading}
        onPress={() => handleRowClick(type)}
        onHoverIn={() => setHoveredRow(type)}
        onHoverOut={() => setHoveredRow(null)}
        style={[
          styles.infoRow,
          isEditing && styles.editableRow,
          isHovered && styles.hoveredRow
        ]}
      >
        <View style={styles.infoColumns}>
        <Text style={[styles.infoLabel, isHovered && styles.hoveredText]}>{label}</Text>
        <View style={styles.viewColumn}>
        {file && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${t("viewDocument")} ${file.name}`}
            onPress={(event) => {
              event.stopPropagation();
              setViewedFile(file);
            }}
            style={{ padding: 10 }}
          >
            <Text style={{ color: theme.text, fontWeight: "600" }}>{t("viewDocument")}</Text>
          </Pressable>
        )}
        </View>
        <Text style={[styles.infoValue, isHovered && styles.hoveredText]}>{value}</Text>
        </View>
        {isEditing && (
            <Text style={styles.editHintText}>{t("clickToEdit")}</Text>
        )}
      </Pressable>
    );
  };

  return (
    <Layout>
      {viewedFile && <DocumentViewer key={viewedFile.originalFileId || viewedFile.name} file={viewedFile} onClose={() => setViewedFile(null)} />}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: Spacing.four }}>
      <Text style={[styles.title, { color: theme.textHeading }]}>{t("profileTitle")}</Text>

      {isEditing && <Text style={{ color: theme.textSecondary, marginBottom: Spacing.two }}>{t("documentFormats")}</Text>}
      <View style={styles.infoContainer}>
        <View style={styles.headerRow}>
             <Text style={styles.infoTitle}>{t("yourInformation")}</Text>
             {isEditing && <Text style={styles.editingModeText}>{t("editingMode")}</Text>}
        </View>

        {renderRow(t("evictionNoticeLabel"), evictionNotice ? evictionNotice.name : t("notUploaded"), 'eviction')}
        {renderRow(t("leaseAgreementLabel"), leaseAgreement ? leaseAgreement.name : t("notUploaded"), 'lease')}
        {renderRow(t("locationLabel"), location ? `${location.city}, ${location.state}, ${location.country}` : t("notSet"), 'location')}
        
        {showLocationEditor && (
             <View style={styles.locationEditorContainer}>
                 <LocationSelection size="small" onSaveSuccess={handleLocationSave} />
             </View>
        )}
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{t("preferredLanguage")}</Text>
          <Text style={styles.infoValue}>{LANGUAGES.find(item => item.code === language)?.name || language}</Text>
        </View>
        <AdditionalInformation onView={setViewedFile} />
      </View>

      <CondensedUserInfo />

      {uploadLoading && <Text accessibilityLiveRegion="polite">{t("documentUploading")}</Text>}
      {uploadFailed && <Text accessibilityRole="alert">{t(errorKey)}</Text>}
      <ThemedPressable disabled={uploadLoading} style={styles.editButton} onPress={handleEditClick}>
        <Text style={styles.editButtonText}>{t(isEditing ? "doneEditing" : "editInformation")}</Text>
      </ThemedPressable>
      </ScrollView>
    </Layout>
  );
}

const createStyles = (theme: Themes) => StyleSheet.create({
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: Spacing.three,
    fontFamily: Fonts?.sans,
    textAlign: 'center',
  },
  infoContainer: {
    padding: Spacing.four,
    backgroundColor: theme.backgroundSecondary,
    borderRadius: 8,
    marginBottom: Spacing.five,
  },
  headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Spacing.four,
  },
  infoTitle: {
    color: theme.textHeading,
    fontSize: 20,
    fontWeight: '600',
    fontFamily: Fonts?.sans,
  },
  editingModeText: {
      color: theme.backgroundAccent,
      fontWeight: 'bold',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderRadius: 4,
    marginBottom: Spacing.two,
    flexWrap: 'wrap', // Allow hint to wrap on small screens
  },
  editableRow: {
    borderWidth: 1,
    borderColor: 'transparent', // Invisible border normally to prevent jumping
    backgroundColor: theme.backgroundSecondary,
    elevation: 1, // small shadow
  },
  hoveredRow: {
    borderColor: theme.backgroundAccent,
    backgroundColor: theme.backgroundSelected,
    cursor: 'pointer',
  },
  infoColumns: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewColumn: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
  },
  infoLabel: {
    flex: 1,
    minWidth: 0,
    fontSize: 16,
    fontFamily: Fonts?.sans,
    color: theme.textSecondary,
  },
  infoValue: {
    color: theme.text,
    fontSize: 16,
    fontFamily: Fonts?.sans,
    fontWeight: '500',
    flex: 1,
    minWidth: 0,
    textAlign: 'right',
  },
  hoveredText: {
      color: theme.text,
  },
  editHintText: {
      fontSize: 12,
      color: theme.backgroundAccent,
      fontStyle: 'italic',
      width: '100%',
      textAlign: 'right',
      marginTop: 4,
  },
  locationEditorContainer: {
      marginTop: Spacing.four,
      paddingTop: Spacing.four,
      borderTopWidth: 1,
      borderTopColor: theme.border,
  },
  editButton: {
      backgroundColor: theme.backgroundAccent,
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: Spacing.four,
  },
  editButtonText: {
      color: theme.textOnAccent,
      fontWeight: 'bold',
      fontSize: 16,
  }
});
