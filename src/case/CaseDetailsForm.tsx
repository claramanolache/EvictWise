import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import ThemedPressable from '@/components/ThemedPressable';
import { useAppColorScheme } from '@/context/ThemeContext';
import { useTranslation } from '@/Translation/TranslationContext';
import { getTheme } from '@/constants/theme';
import { CASE_STAGES } from './config';
import { cleanCaseDetails, validateCaseDetails } from './model';
import type { CaseDetails } from './types';

export default function CaseDetailsForm({ initial, onSave, onCancel }: { initial: CaseDetails; onSave: (details: CaseDetails) => Promise<boolean>; onCancel: () => void }) {
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const theme = getTheme(useAppColorScheme());
  const { t } = useTranslation();
  const input = (label: string, value: string, change: (value: string) => void, placeholder = '') => <View key={label} style={{ gap: 6 }}>
    <Text style={{ color: theme.text }}>{t(label)}</Text>
    <TextInput accessibilityLabel={t(label)} value={value} onChangeText={change} editable={!saving} maxLength={250} placeholder={placeholder} placeholderTextColor={theme.textSecondary}
      style={{ padding: 12, color: theme.text, backgroundColor: theme.backgroundInput, borderColor: theme.border, borderWidth: 1, borderRadius: 8 }} />
  </View>;
  function choice<K extends 'stage' | 'serviceMethod' | 'responseFiled' | 'representation'>(field: K, label: string, options: { value: CaseDetails[K]; label: string }[]) {
    return <View style={{ gap: 8 }}>
      <Text style={{ color: theme.text }}>{t(label)}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {options.map(option => <Pressable key={option.value} accessibilityRole="radio" accessibilityLabel={`${t(label)}: ${t(option.label)}`} accessibilityState={{ checked: draft[field] === option.value }} disabled={saving}
          onPress={() => setDraft({ ...draft, [field]: option.value, ...(field === 'stage' ? { intake: undefined } : {}) })}
          style={{ padding: 10, borderRadius: 8, borderWidth: 1, borderColor: theme.border, backgroundColor: draft[field] === option.value ? theme.backgroundSelected : theme.backgroundSecondary }}>
          <Text style={{ color: theme.text }}>{draft[field] === option.value ? '● ' : '○ '}{t(option.label)}</Text>
        </Pressable>)}
      </View>
    </View>;
  }
  async function save() {
    if (saving) return;
    const cleaned = cleanCaseDetails(draft);
    const validation = validateCaseDetails(cleaned);
    if (validation) { setError(validation); return; }
    setSaving(true); setError(null);
    try { if (!await onSave(cleaned)) setError('caseSaveFailed'); }
    catch { setError('caseSaveFailed'); }
    finally { setSaving(false); }
  }
  return <View style={{ gap: 16 }}>
    <Text accessibilityRole="header" style={{ color: theme.textHeading, fontSize: 20, fontWeight: '600' }}>{t('caseEdit')}</Text>
    <Text style={{ color: theme.textSecondary }}>{t('caseEvidenceHelp')} {t('caseJurisdictionHelp')}</Text>
    {(['state', 'county', 'city'] as const).map(field => input(`case${field[0]!.toUpperCase()}${field.slice(1)}`, draft.jurisdiction[field], value => setDraft({ ...draft, jurisdiction: { ...draft.jurisdiction, [field]: value } })))}
    {choice('stage', 'caseReportedStage', [{ value: 'unknown', label: 'caseUnknown' }, ...CASE_STAGES.map(stage => ({ value: stage.id, label: stage.title }))])}
    {input('caseNoticeType', draft.noticeType, noticeType => setDraft({ ...draft, noticeType }))}
    {input('caseServiceDate', draft.serviceDate, serviceDate => setDraft({ ...draft, serviceDate }), 'YYYY-MM-DD')}
    {choice('serviceMethod', 'caseServiceMethod', [{ value: 'unknown', label: 'caseUnknown' }, { value: 'personal', label: 'casePersonal' }, { value: 'substituted', label: 'caseSubstituted' }, { value: 'posting_mail', label: 'casePostingMail' }, { value: 'other', label: 'caseOther' }])}
    {input('caseNumber', draft.courtCaseNumber, courtCaseNumber => setDraft({ ...draft, courtCaseNumber }))}
    {choice('responseFiled', 'caseResponseFiled', [{ value: 'unknown', label: 'caseUnknown' }, { value: 'yes', label: 'caseYes' }, { value: 'no', label: 'caseNo' }])}
    {choice('representation', 'caseRepresentation', [{ value: 'unknown', label: 'caseUnknown' }, { value: 'none', label: 'caseNoLawyer' }, { value: 'seeking', label: 'caseSeekingLawyer' }, { value: 'represented', label: 'caseHasLawyer' }])}
    {error && <Text accessibilityRole="alert" style={{ color: theme.textWarning }}>{t(error)}</Text>}
    <View style={{ flexDirection: 'row', gap: 12 }}>
      <ThemedPressable accessibilityRole="button" disabled={saving} onPress={() => void save()} style={{ padding: 12, borderRadius: 8 }}><Text style={{ color: theme.textOnAccent }}>{t(saving ? 'caseSaving' : 'caseSave')}</Text></ThemedPressable>
      <Pressable accessibilityRole="button" disabled={saving} onPress={onCancel} style={{ padding: 12 }}><Text style={{ color: theme.text }}>{t('cancel')}</Text></Pressable>
    </View>
  </View>;
}
