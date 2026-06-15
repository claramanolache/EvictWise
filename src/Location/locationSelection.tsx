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
                alert('Permission to access location was denied');
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
                };
                setSelectedLocation(locationData);
                setSelectionMode('confirm');
            } else {
                alert('Could not determine location details from coordinates.');
            }
        } catch (error) {
            console.error("Error getting location:", error);
            alert(`Failed to get location: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
            alert('Location saved successfully!');
            onSaveSuccess?.(); // Call the callback if it exists
        }
    };

    const isSmall = size === 'small';
    const styles = isSmall ? smallStyles : normalStyles;

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Select Your Location</Text>

            {selectionMode === 'initial' && (
                <View style={styles.buttonContainer}>
                    <Pressable style={styles.button} onPress={handleCurrentLocation}>
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Use Current Location</Text>}
                    </Pressable>
                    <Pressable style={[styles.button, styles.secondaryButton]} onPress={() => setSelectionMode('manual')}>
                        <Text style={styles.secondaryButtonText}>Enter Manually</Text>
                    </Pressable>
                </View>
            )}

            {selectionMode === 'manual' && (
                <View style={styles.searchContainer}>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter your city..."
                        value={searchQuery}
                        onChangeText={handleSearchChange}
                    />
                    {suggestions.map((loc, index) => (
                        <Pressable key={index} style={styles.suggestionItem} onPress={() => handleSuggestionSelect(loc)}>
                            <Text>{`${loc.city}, ${loc.state}, ${loc.country}`}</Text>
                        </Pressable>
                    ))}
                    <Pressable style={styles.cancelButton} onPress={() => setSelectionMode('initial')}>
                         <Text style={styles.cancelButtonText}>Cancel</Text>
                    </Pressable>
                </View>
            )}

            {selectionMode === 'confirm' && selectedLocation && (
                <View style={styles.confirmContainer}>
                    <Text style={styles.confirmTitle}>Confirm Location:</Text>
                    <Text style={styles.confirmDetail}>City: {selectedLocation.city}</Text>
                    <Text style={styles.confirmDetail}>State: {selectedLocation.state}</Text>
                    <Text style={styles.confirmDetail}>Country: {selectedLocation.country}</Text>
                    {selectedLocation.zipCode && <Text style={styles.confirmDetail}>Zip Code: {selectedLocation.zipCode}</Text>}

                    <View style={styles.confirmActions}>
                         <Pressable style={[styles.button, styles.secondaryButton, isSmall && styles.confirmActionButton, {marginRight: 10}]} onPress={() => setSelectionMode('initial')}>
                            <Text style={styles.secondaryButtonText}>Back</Text>
                        </Pressable>
                        <Pressable style={[styles.button, isSmall && styles.confirmActionButton]} onPress={handleConfirm}>
                            <Text style={styles.buttonText}>Confirm</Text>
                        </Pressable>
                    </View>
                </View>
            )}
        </View>
    );
};

const normalStyles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: '#fff', justifyContent: 'center' },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 30, textAlign: 'center' },
    buttonContainer: { alignItems: 'center' },
    button: { backgroundColor: '#007BFF', paddingVertical: 15, paddingHorizontal: 30, borderRadius: 8, width: '80%', alignItems: 'center', marginBottom: 15 },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    secondaryButton: { backgroundColor: '#f0f0f0', borderWidth: 1, borderColor: '#ccc' },
    secondaryButtonText: { color: '#333' },
    searchContainer: { width: '100%' },
    input: { height: 50, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, paddingHorizontal: 15, fontSize: 16, marginBottom: 10 },
    suggestionItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
    cancelButton: { marginTop: 20, alignItems: 'center' },
    cancelButtonText: { color: '#007BFF', fontSize: 16 },
    confirmContainer: { backgroundColor: '#f9f9f9', padding: 20, borderRadius: 8, borderWidth: 1, borderColor: '#eee' },
    confirmTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
    confirmDetail: { fontSize: 16, marginBottom: 8 },
    confirmActions: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 }
});

const smallStyles = StyleSheet.create({
    container: { padding: 10, backgroundColor: '#fff', justifyContent: 'center' },
    title: { fontSize: 18, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    buttonContainer: { alignItems: 'center' },
    button: { backgroundColor: '#007BFF', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 6, width: '85%', alignItems: 'center', marginBottom: 10 },
    buttonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
    secondaryButton: { backgroundColor: '#f0f0f0', borderWidth: 1, borderColor: '#ccc' },
    secondaryButtonText: { color: '#333' },
    searchContainer: { width: '100%' },
    input: { height: 40, borderWidth: 1, borderColor: '#ccc', borderRadius: 6, paddingHorizontal: 10, fontSize: 14, marginBottom: 8 },
    suggestionItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
    cancelButton: { marginTop: 15, alignItems: 'center' },
    cancelButtonText: { color: '#007BFF', fontSize: 14 },
    confirmContainer: { backgroundColor: '#f9f9f9', padding: 15, borderRadius: 6, borderWidth: 1, borderColor: '#eee' },
    confirmTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
    confirmDetail: { fontSize: 14, marginBottom: 6 },
    confirmActions: { flexDirection: 'row', justifyContent: 'center', marginTop: 15 },
    confirmActionButton: {
        width: 'auto',
        paddingVertical: 8,
        paddingHorizontal: 15,
    }
});

export default LocationSelection;
