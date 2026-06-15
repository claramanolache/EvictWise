import { Text, StyleSheet, useColorScheme, View, Pressable } from "react-native";
import { getTheme, Fonts, Spacing } from "@/constants/theme";
import Layout from "@/components/Layout";
import React, { useState } from "react";
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { useRouter } from 'expo-router';
import LocationSelection from "../Location/locationSelection";

export default function ProfilePage() {
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);
  const router = useRouter();
  const { evictionNotice, leaseAgreement, location } = useSelector((state: RootState) => state.app);
  
  const [isEditing, setIsEditing] = useState(false);
  const [showLocationEditor, setShowLocationEditor] = useState(false);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const handleEditClick = () => {
    setIsEditing(!isEditing);
    setShowLocationEditor(false); // Reset location editor when toggling mode
  };

  const handleRowClick = (type: 'eviction' | 'lease' | 'location') => {
    if (!isEditing) return;

    if (type === 'eviction' || type === 'lease') {
      router.push('/EvictionUploader');
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
    
    return (
      <Pressable
        onPress={() => handleRowClick(type)}
        onHoverIn={() => setHoveredRow(type)}
        onHoverOut={() => setHoveredRow(null)}
        style={[
          styles.infoRow,
          isEditing && styles.editableRow,
          isHovered && styles.hoveredRow
        ]}
      >
        <Text style={[styles.infoLabel, isHovered && styles.hoveredText]}>{label}</Text>
        <Text style={[styles.infoValue, isHovered && styles.hoveredText]}>{value}</Text>
        {isEditing && (
            <Text style={styles.editHintText}>Click to edit</Text>
        )}
      </Pressable>
    );
  };

  return (
    <Layout>
      <Text style={[styles.title, { color: theme.text }]}>Profile Page</Text>

      <View style={styles.infoContainer}>
        <View style={styles.headerRow}>
             <Text style={styles.infoTitle}>Your Information</Text>
             {isEditing && <Text style={styles.editingModeText}>(Editing Mode)</Text>}
        </View>

        {renderRow('Eviction Notice:', evictionNotice ? evictionNotice.name : 'Not uploaded', 'eviction')}
        {renderRow('Lease Agreement:', leaseAgreement ? leaseAgreement.name : 'Not uploaded', 'lease')}
        {renderRow('Location:', location ? `${location.city}, ${location.state}, ${location.country}` : 'Not set', 'location')}
        
        {showLocationEditor && (
             <View style={styles.locationEditorContainer}>
                 <LocationSelection size="small" onSaveSuccess={handleLocationSave} />
             </View>
        )}
      </View>

      <Pressable style={styles.editButton} onPress={handleEditClick}>
        <Text style={styles.editButtonText}>{isEditing ? "Done Editing" : "Edit Information"}</Text>
      </Pressable>
    </Layout>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: Spacing.three,
    fontFamily: Fonts?.sans,
    textAlign: 'center',
  },
  infoContainer: {
    padding: Spacing.four,
    backgroundColor: '#f9f9f9',
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
    fontSize: 20,
    fontWeight: '600',
    fontFamily: Fonts?.sans,
  },
  editingModeText: {
      color: '#007BFF',
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
    backgroundColor: '#fff',
    elevation: 1, // small shadow
  },
  hoveredRow: {
    borderColor: '#007BFF',
    backgroundColor: '#e6f2ff',
    cursor: 'pointer',
  },
  infoLabel: {
    fontSize: 16,
    fontFamily: Fonts?.sans,
    color: '#666',
  },
  infoValue: {
    fontSize: 16,
    fontFamily: Fonts?.sans,
    fontWeight: '500',
    maxWidth: '50%',
  },
  hoveredText: {
      color: '#0056b3',
  },
  editHintText: {
      fontSize: 12,
      color: '#007BFF',
      fontStyle: 'italic',
      width: '100%',
      textAlign: 'right',
      marginTop: 4,
  },
  locationEditorContainer: {
      marginTop: Spacing.four,
      paddingTop: Spacing.four,
      borderTopWidth: 1,
      borderTopColor: '#eee',
  },
  editButton: {
      backgroundColor: '#007BFF',
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: 'auto', // Pushes to bottom if layout allows
  },
  editButtonText: {
      color: 'white',
      fontWeight: 'bold',
      fontSize: 16,
  }
});
