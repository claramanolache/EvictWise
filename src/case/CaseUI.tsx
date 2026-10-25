import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import ThemedPressable from '@/components/ThemedPressable';
import { useAppColorScheme } from '@/context/ThemeContext';
import { getTheme } from '@/constants/theme';
import { useTranslation } from '@/Translation/TranslationContext';

export function CaseButton({ label, onPress, secondary = false }: { label: string; onPress: () => void; secondary?: boolean }) {
  const theme = getTheme(useAppColorScheme());
  const { t } = useTranslation();
  return <ThemedPressable accessibilityRole="button" onPress={onPress} variant={secondary ? 'secondary' : 'primary'} style={{ padding: 12, borderRadius: 10 }}>
    <Text style={{ color: secondary ? theme.text : theme.textOnAccent, fontWeight: '500' }}>{t(label)}</Text>
  </ThemedPressable>;
}
export function CaseCard({ title, children }: { title?: string; children: ReactNode }) {
  const theme = getTheme(useAppColorScheme());
  const { t } = useTranslation();
  return <View style={{ padding: 20, gap: 14, borderRadius: 16, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.backgroundSecondary }}>
    {title && <Text accessibilityRole="header" style={{ color: theme.textHeading, fontSize: 20, fontWeight: '600' }}>{t(title)}</Text>}
    {children}
  </View>;
}
