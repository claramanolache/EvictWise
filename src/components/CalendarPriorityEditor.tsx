import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useDispatch } from 'react-redux';
import type { CalendarEvent } from '@/types';
import { taskPrioritySettings, type PrioritySettings } from '@/utils/calendarChecklist';
import { setCalendarTaskPriority, validCalendarPriority } from '@/slice';
import { useTranslation } from '@/Translation/TranslationContext';
import { useAppColorScheme } from '@/context/ThemeContext';
import { getTheme } from '@/constants/theme';
export default function CalendarPriorityEditor({ task, events, settings, onClose }: {
  task: CalendarEvent; events: CalendarEvent[]; settings: PrioritySettings; onClose: () => void;
}) {
  const [draft, setDraft] = useState(() => taskPrioritySettings(task, settings));
  const { t } = useTranslation();
  const theme = getTheme(useAppColorScheme());
  const dispatch = useDispatch();
  const valid = validCalendarPriority(events, settings, task.id, draft);
  const choices = [...events.filter(e => e.id !== task.id).map(e => ({ id: e.id, name: e.name })),
    ...draft.dependsOn.filter(id => !events.some(e => e.id === id)).map(id => ({ id, name: t('priorityMissingTask') }))];
  return <Modal visible transparent animationType="fade" onRequestClose={onClose}>
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <View accessibilityViewIsModal style={{ width: '100%', maxWidth: 480, maxHeight: '90%', backgroundColor: theme.backgroundSecondary, padding: 20, borderRadius: 16, gap: 14 }}>
        <Text accessibilityRole="header" style={{ color: theme.textHeading, fontSize: 20, fontWeight: '600' }}>{t('priorityEdit')}</Text>
        <ScrollView contentContainerStyle={{ gap: 16 }}>
          <Text style={{ color: theme.text }}>{task.name}</Text>
          <Text style={{ color: theme.textSecondary, lineHeight: 20 }}>{t('prioritySettingsHelp')}</Text>
          {(['importance', 'effort'] as const).map(field => <View key={field} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Text style={{ flex: 1, color: theme.text }}>{t(field === 'importance' ? 'priorityImportance' : 'priorityEffort')}: {draft[field].toFixed(1)}</Text>
            {([-1, 1] as const).map(direction => <Pressable key={direction} accessibilityRole="button"
              accessibilityLabel={`${t(direction < 0 ? 'priorityDecrease' : 'priorityIncrease')} ${t(field === 'importance' ? 'priorityImportance' : 'priorityEffort')}`}
              disabled={direction < 0 ? draft[field] <= 0 : draft[field] >= 1}
              onPress={() => setDraft(current => ({ ...current, [field]: Math.max(0, Math.min(1, Math.round((current[field] + direction * 0.1) * 10) / 10)) }))}
              style={{ padding: 12, backgroundColor: theme.backgroundSelected, borderRadius: 8 }}>
              <Text style={{ color: theme.text }}>{direction < 0 ? '−' : '+'}</Text>
            </Pressable>)}
          </View>)}
          <Text style={{ color: theme.textHeading, fontWeight: '600' }}>{t('priorityPrerequisites')}</Text>
          {!choices.length && <Text style={{ color: theme.textSecondary }}>{t('priorityNoPrerequisites')}</Text>}
          {choices.map(other => <Pressable key={other.id} accessibilityRole="checkbox" accessibilityState={{ checked: draft.dependsOn.includes(other.id) }}
            onPress={() => setDraft(current => ({ ...current, dependsOn: current.dependsOn.includes(other.id) ? current.dependsOn.filter(id => id !== other.id) : [...current.dependsOn, other.id] }))}
            style={{ padding: 12, borderRadius: 8, backgroundColor: theme.backgroundSelected }}>
            <Text style={{ color: theme.text }}>{draft.dependsOn.includes(other.id) ? '☑' : '☐'} {other.name}</Text>
          </Pressable>)}
          {!valid && <Text accessibilityRole="alert" style={{ color: theme.textWarning }}>{t('priorityInvalidDependencies')}</Text>}
        </ScrollView>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
          <Pressable accessibilityRole="button" onPress={onClose} style={{ padding: 12 }}><Text style={{ color: theme.text }}>{t('priorityCancel')}</Text></Pressable>
          <Pressable accessibilityRole="button" disabled={!valid} onPress={() => { dispatch(setCalendarTaskPriority({ id: task.id, priority: draft })); onClose(); }}
            style={{ padding: 12, borderRadius: 8, backgroundColor: theme.backgroundAccent, opacity: valid ? 1 : 0.5 }}>
            <Text style={{ color: theme.textOnAccent }}>{t('prioritySave')}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  </Modal>;
}
