import { useEffect, useState } from 'react';
import { AppState, Text, View, ScrollView, Pressable } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import FontAwesomeFreeSolid from '@react-native-vector-icons/fontawesome-free-solid';
import { useAppColorScheme } from '@/context/ThemeContext';
import { useTranslation } from '@/Translation/TranslationContext';
import { getTheme } from '@/constants/theme';
import { RootState } from '@/store';
import { toggleCalendarTask } from '@/slice';
import { deadlineDay, scheduleChecklist } from '@/utils/calendarChecklist';
import CalendarPriorityEditor from './CalendarPriorityEditor';

export default function PriorityChecklist() {
  const theme = getTheme(useAppColorScheme());
  const { language, t } = useTranslation();
  const dispatch = useDispatch();
  const events = useSelector((state: RootState) => state.app.events);
  const completedIds = useSelector((state: RootState) => state.app.completedCalendarTasks);
  const settings = useSelector((state: RootState) => state.app.calendarTaskPriorities) ?? {};
  const [now, setNow] = useState(() => new Date());
  const [editingId, setEditingId] = useState<string | null>(null);
  useEffect(() => {
    const refresh = () => setNow(new Date());
    const timer = setInterval(refresh, 60000);
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') refresh(); });
    if (typeof window !== 'undefined') window.addEventListener('focus', refresh);
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', refresh);
    return () => {
      clearInterval(timer); subscription.remove();
      if (typeof window !== 'undefined') window.removeEventListener('focus', refresh);
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', refresh);
    };
  }, []);
  const completed = new Set(completedIds ?? []);
  const tasks = scheduleChecklist(events, completed, settings, now);
  const editing = events.find(event => event.id === editingId);
  return <View style={{ flex: 1, minHeight: 0, backgroundColor: theme.backgroundSecondary, borderWidth: 1, borderColor: theme.border, borderRadius: 16, overflow: 'hidden' }}>
    <View style={{ padding: 16, gap: 6 }}>
      <Text accessibilityRole="header" style={{ color: theme.textHeading, fontSize: 20, fontWeight: '600' }}>{t('priorityChecklist')}</Text>
      <Text style={{ color: theme.textSecondary, fontSize: 12, lineHeight: 18 }}>{t('priorityChecklistHelp')}</Text>
    </View>
    <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16, gap: 8 }}>
      {tasks.length === 0 && <Text style={{ color: theme.textSecondary, fontSize: 14, lineHeight: 21 }}>{t('priorityChecklistEmpty')}</Text>}
      {tasks.map(({ task, completed: checked, score, pendingDependencies, blocked }) => {
        const deadline = deadlineDay(task.date) === null ? t('priorityUnknownDeadline') : new Date(...task.date).toLocaleDateString(language, { month: 'short', day: 'numeric', year: 'numeric' });
        const waiting = pendingDependencies.map(id => events.find(event => event.id === id)?.name ?? t('priorityMissingTask')).join(', ');
        return <View key={task.id} style={{ paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: theme.border }}>
          <Pressable accessibilityRole="checkbox" accessibilityState={{ checked }}
            accessibilityLabel={`${task.name}, ${t('checklistDeadline')}: ${deadline}`}
            onPress={() => dispatch(toggleCalendarTask(task.id))}
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 10, paddingHorizontal: 8, borderRadius: 10, backgroundColor: pressed ? theme.backgroundSelected : 'transparent' })}>
            <View style={{ width: 20, height: 20, marginTop: 2, borderRadius: 5, borderWidth: 1, borderColor: checked ? theme.backgroundAccent : theme.textSecondary, backgroundColor: checked ? theme.backgroundAccent : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
              {checked && <FontAwesomeFreeSolid name="check" size={12} color={theme.textOnAccent} />}
            </View>
            <Text style={{ flex: 1, minWidth: 0, fontSize: 14, lineHeight: 22, color: checked ? theme.textSecondary : theme.text, textDecorationLine: checked ? 'line-through' : 'none' }}>{task.name}</Text>
            <Text style={{ color: theme.textSecondary, fontSize: 12, lineHeight: 22, fontWeight: '400', maxWidth: '35%', textAlign: 'right' }}>{deadline}</Text>
          </Pressable>
          {!checked && <View style={{ paddingLeft: 38, gap: 4 }}>
            <Text style={{ color: theme.textSecondary, fontSize: 12 }}>{t('priorityScore')}: {score.toLocaleString(language, { maximumFractionDigits: 1 })}</Text>
            {blocked && <Text style={{ color: theme.textSecondary, fontSize: 12 }}>{t('priorityWaiting')}: {waiting}</Text>}
          </View>}
          <Pressable accessibilityRole="button" accessibilityLabel={`${t('priorityEdit')}: ${task.name}`} onPress={() => setEditingId(task.id)} style={{ alignSelf: 'flex-end', padding: 10 }}>
            <Text style={{ color: theme.textSecondary, fontSize: 12 }}>{t('priorityEdit')}</Text>
          </Pressable>
        </View>;
      })}
    </ScrollView>
    {editing && <CalendarPriorityEditor key={editing.id} task={editing} events={events} settings={settings} onClose={() => setEditingId(null)} />}
  </View>;
}
