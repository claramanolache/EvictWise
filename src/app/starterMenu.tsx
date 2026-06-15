import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { getTheme, Spacing, Fonts } from '@/constants/theme';
import { useColorScheme } from 'react-native';

interface Props {
  onNext: () => void;
}

const StarterMenu: React.FC<Props> = ({ onNext }) => {
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.text }]}>Welcome to Justice AI</Text>
      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
        Your personal guide to understanding your rights and navigating the eviction process.
      </Text>
      <Text style={[styles.description, { color: theme.textSecondary }]}>
        We'll start by asking for your location to provide localized legal information, and then ask you to upload your eviction notice and lease agreement.
      </Text>
      <Pressable style={[styles.button, { backgroundColor: theme.primary }]} onPress={onNext}>
        <Text style={[styles.buttonText, { color: theme.background }]}>Get Started</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.five,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    fontFamily: Fonts?.sans,
    textAlign: 'center',
    marginBottom: Spacing.four,
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    fontFamily: Fonts?.sans,
    marginBottom: Spacing.three,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    fontFamily: Fonts?.sans,
    lineHeight: 24,
    marginBottom: Spacing.six,
  },
  button: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.six,
    borderRadius: 8,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: Fonts?.sans,
  },
});

export default StarterMenu;
