import ThemedPressable from "@/components/ThemedPressable";
import { useAppColorScheme } from "@/context/ThemeContext";
import { getTheme, Themes } from "@/constants/theme";
import { useTranslation } from "@/Translation/TranslationContext";
import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { useDispatch } from 'react-redux';
import { setLocation, LocationData } from '../slice';
import * as Location from 'expo-location';

interface LocationSelectionProps {
    size?: 'small' | 'normal';
    onSaveSuccess?: () => void; // Add this callback prop
}

const LocationSelection: React.FC<LocationSelectionProps> = ({ size = 'normal', onSaveSuccess }) => {
    const { t } = useTranslation();
    const theme = getTheme(useAppColorScheme());
    const [selectionMode, setSelectionMode] = useState<'initial' | 'manual' | 'confirm'>('initial');
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState<LocationData[]>([]);
    const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
    const dispatch = useDispatch();

    const handleCurrentLocation = async () => {
        setLoading(true);
        try {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                alert(t("locationPermissionDenied"));
                setLoading(false);
                return;
            }

            let location = await Location.getCurrentPositionAsync({});
            
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.coords.latitude}&lon=${location.coords.longitude}&addressdetails=1`,
                {
                    headers: {
                        'User-Agent': 'MilpitasHacks3App/1.0 (contact@example.com)'
                    }
                }
            );
            
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const data = await response.json();

            if (data && data.address) {
                const address = data.address;
                const locationData: LocationData = {
                    country: address.country || '',
                    city: address.city || address.town || address.village || address.county || 'Unknown City', 
                    state: address.state || address.region || 'Unknown State',
                    zipCode: address.postcode || '',
                    county: address.county || '',
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                };
                setSelectedLocation(locationData);
                setSelectionMode('confirm');
            } else {
                alert(t("locationDetailsUnavailable"));
            }
        } catch (error) {
            console.error("Error getting location:", error);
            alert(t("locationFailed"));
        } finally {
            setLoading(false);
        }
    };

    const fetchSuggestions = async (query: string) => {
        if (query.length < 2) {
            setSuggestions([]);
            return;
        }

        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5`,
                {
                    headers: {
                        'User-Agent': 'MilpitasHacks3App/1.0 (contact@example.com)'
                    }
                }
            );

            if (!response.ok) {
                 console.error('Network response was not ok');
                 return;
            }

            const data = await response.json();
            
            const newSuggestions: LocationData[] = data.map((item: any) => ({
                city: item.address?.city || item.address?.town || item.address?.village || item.name || 'Unknown',
                state: item.address?.state || item.address?.region || '',
                country: item.address?.country || '',
                county: item.address?.county || '',
                ...(item.lat != null && item.lon != null && Number.isFinite(Number(item.lat)) && Number.isFinite(Number(item.lon)) ? { latitude: Number(item.lat), longitude: Number(item.lon) } : {}),
            }));

            const uniqueSuggestions = Array.from(new Set(newSuggestions.map(s => JSON.stringify(s))))
                                        .map(s => JSON.parse(s));

            setSuggestions(uniqueSuggestions);
        } catch (error) {
             console.error("Error fetching suggestions:", error);
             const mockData: LocationData[] = [
                { city: 'San Francisco', state: 'CA', country: 'USA' },
                { city: 'Palo Alto', state: 'CA', country: 'USA' },
                { city: 'Fremont', state: 'CA', country: 'USA' },
                { city: 'Milpitas', state: 'CA', country: 'USA' },
                { city: 'San Jose', state: 'CA', country: 'USA' },
            ];
            const filtered = mockData.filter(loc => loc.city.toLowerCase().includes(query.toLowerCase()));
            setSuggestions(filtered);
        }
    };

    const handleSearchChange = (text: string) => {
        setSearchQuery(text);
        fetchSuggestions(text);
    };

    const handleSuggestionSelect = (location: LocationData) => {
        setSelectedLocation(location);
        setSelectionMode('confirm');
    };

    const handleConfirm = () => {
        if (selectedLocation) {
            dispatch(setLocation(selectedLocation));
            alert(t("locationSaved"));
            onSaveSuccess?.(); // Call the callback if it exists
        }
    };

    const isSmall = size === 'small';
    const styles = isSmall ? smallStyles(theme) : normalStyles(theme);

    return (
        <View style={styles.container}>
            <Text style={styles.title}>{t("selectLocation")}</Text>

            {selectionMode === 'initial' && (
                <View style={styles.buttonContainer}>
                    <ThemedPressable style={styles.button} onPress={handleCurrentLocation}>
                        {loading ? <ActivityIndicator color={theme.textOnAccent} /> : <Text style={styles.buttonText}>{t("useCurrentLocation")}</Text>}
                    </ThemedPressable>
                    <ThemedPressable variant="secondary" style={[styles.button, styles.secondaryButton]} onPress={() => setSelectionMode('manual')}>
                        <Text style={styles.secondaryButtonText}>{t("enterManually")}</Text>
                    </ThemedPressable>
                </View>
            )}

            {selectionMode === 'manual' && (
                <View style={styles.searchContainer}>
                    <TextInput
                        style={styles.input}
                        placeholder={t("cityPlaceholder")}
                        placeholderTextColor={theme.textSecondary}
                        value={searchQuery}
                        onChangeText={handleSearchChange}
                    />
                    {suggestions.map((loc, index) => (
                        <Pressable key={index} style={styles.suggestionItem} onPress={() => handleSuggestionSelect(loc)}>
                            <Text style={{ color: theme.text }}>{`${loc.city}, ${loc.state}, ${loc.country}`}</Text>
                        </Pressable>
                    ))}
                    <Pressable style={styles.cancelButton} onPress={() => setSelectionMode('initial')}>
                         <Text style={styles.cancelButtonText}>{t("cancel")}</Text>
                    </Pressable>
                </View>
            )}

            {selectionMode === 'confirm' && selectedLocation && (
                <View style={styles.confirmContainer}>
                    <Text style={styles.confirmTitle}>{t("confirmLocation")}</Text>
                    <Text style={styles.confirmDetail}>{t("cityLabel")} {selectedLocation.city}</Text>
                    <Text style={styles.confirmDetail}>{t("stateLabel")} {selectedLocation.state}</Text>
                    <Text style={styles.confirmDetail}>{t("countryLabel")} {selectedLocation.country}</Text>
                    {selectedLocation.zipCode && <Text style={styles.confirmDetail}>{t("zipCodeLabel")} {selectedLocation.zipCode}</Text>}

                    <View style={styles.confirmActions}>
                         <ThemedPressable variant="secondary" style={[styles.button, styles.secondaryButton, isSmall && styles.confirmActions, {marginRight: 10}]} onPress={() => setSelectionMode('initial')}>
                            <Text style={styles.secondaryButtonText}>{t("back")}</Text>
                        </ThemedPressable>
                        <ThemedPressable style={[styles.button, isSmall && styles.confirmActions]} onPress={handleConfirm}>
                            <Text style={styles.buttonText}>{t("confirm")}</Text>
                        </ThemedPressable>
                    </View>
                </View>
            )}
        </View>
    );
};

const normalStyles = (theme: Themes) => StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: theme.background, justifyContent: 'center' },
    title: { color: theme.textHeading, fontSize: 24, fontWeight: 'bold', marginBottom: 30, textAlign: 'center' },
    buttonContainer: { alignItems: 'center' },
    button: { backgroundColor: theme.backgroundAccent, paddingVertical: 15, paddingHorizontal: 30, borderRadius: 8, width: '80%', alignItems: 'center', marginBottom: 15 },
    buttonText: { color: theme.textOnAccent, fontSize: 16, fontWeight: '600' },
    secondaryButton: { backgroundColor: theme.backgroundSelected, borderWidth: 1, borderColor: theme.border },
    secondaryButtonText: { color: theme.text },
    searchContainer: { width: '100%' },
    input: { backgroundColor: theme.backgroundInput, color: theme.text, height: 50, borderWidth: 1, borderColor: theme.border, borderRadius: 8, paddingHorizontal: 15, fontSize: 16, marginBottom: 10 },
    suggestionItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: theme.border },
    cancelButton: { marginTop: 20, alignItems: 'center' },
    cancelButtonText: { color: theme.backgroundAccent, fontSize: 16 },
    confirmContainer: { backgroundColor: theme.backgroundSecondary, padding: 20, borderRadius: 8, borderWidth: 1, borderColor: theme.border },
    confirmTitle: { color: theme.textHeading, fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
    confirmDetail: { color: theme.text, fontSize: 16, marginBottom: 8 },
    confirmActions: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 }
});

const smallStyles = (theme: Themes) => StyleSheet.create({
    container: { padding: 10, backgroundColor: theme.background, justifyContent: 'center' },
    title: { color: theme.textHeading, fontSize: 18, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    buttonContainer: { alignItems: 'center' },
    button: { backgroundColor: theme.backgroundAccent, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 6, width: '85%', alignItems: 'center', marginBottom: 10 },
    buttonText: { color: theme.textOnAccent, fontSize: 14, fontWeight: '600' },
    secondaryButton: { backgroundColor: theme.backgroundSelected, borderWidth: 1, borderColor: theme.border },
    secondaryButtonText: { color: theme.text },
    searchContainer: { width: '100%' },
    input: { backgroundColor: theme.backgroundInput, color: theme.text, height: 40, borderWidth: 1, borderColor: theme.border, borderRadius: 6, paddingHorizontal: 10, fontSize: 14, marginBottom: 8 },
    suggestionItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: theme.border },
    cancelButton: { marginTop: 15, alignItems: 'center' },
    cancelButtonText: { color: theme.backgroundAccent, fontSize: 14 },
    confirmContainer: { backgroundColor: theme.backgroundSecondary, padding: 15, borderRadius: 6, borderWidth: 1, borderColor: theme.border },
    confirmTitle: { color: theme.textHeading, fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
    confirmDetail: { color: theme.text, fontSize: 14, marginBottom: 6 },
    confirmActions: { flexDirection: 'row', justifyContent: 'center', marginTop: 15 },
    confirmActionButton: {
        width: 'auto',
        paddingVertical: 8,
        paddingHorizontal: 15,
    }
});

export default LocationSelection;
