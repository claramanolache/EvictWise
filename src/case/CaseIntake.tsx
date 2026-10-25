import { useState } from 'react';
import { Text, View, Pressable } from 'react-native';
import ThemedPressable from '@/components/ThemedPressable';
import { useAppColorScheme } from '@/context/ThemeContext';
import { getTheme } from '@/constants/theme';
import { useTranslation } from '@/Translation/TranslationContext';
import { blankIntake, likelyStage } from './model';
import { CASE_STAGES } from './config';
import type { IntakeAnswers, Answer } from './types';

export function nextIntakeQuestion(answers: Partial<IntakeAnswers>): keyof IntakeAnswers | null {
  if (!answers.decision) return 'decision';
  if (answers.decision === 'yes') return null;
  if (!answers.hearing) return 'hearing';
  if (answers.hearing === 'yes') return null;
  if (!answers.courtPapers) return 'courtPapers';
  if (answers.courtPapers === 'yes') return answers.response ? null : 'response';
  return answers.notice ? null : 'notice';
}
const questions: Record<keyof IntakeAnswers, string> = { decision: 'caseQuestionDecision', hearing: 'caseQuestionHearing', courtPapers: 'caseQuestionCourt', response: 'caseQuestionResponse', notice: 'caseQuestionNotice' };
export default function CaseIntake({ onApply, onCancel }: { onApply: (answers: IntakeAnswers) => void; onCancel: () => void }) {
  const [answers, setAnswers] = useState<Partial<IntakeAnswers>>({});
  const theme = getTheme(useAppColorScheme());
  const { t } = useTranslation();
  const question = nextIntakeQuestion(answers);
  const stage = likelyStage({ ...blankIntake, ...answers });
  return <View style={{ gap: 16 }}>
    <Text accessibilityRole="header" style={{ fontSize: 20, fontWeight: '600', color: theme.textHeading }}>{t('caseIntake')}</Text>
    <Text style={{ color: theme.textSecondary, lineHeight: 22 }}>{t('caseIntakeHelp')}</Text>
    {question ? <>
      <Text accessibilityLiveRegion="polite" style={{ fontSize: 16, color: theme.text }}>{t(questions[question])}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {(['yes', 'no', 'unknown'] as Answer[]).map(answer => <ThemedPressable key={`${question}-${answer}`} accessibilityRole="button" onPress={() => setAnswers({ ...answers, [question]: answer })} style={{ padding: 12, borderRadius: 8 }}>
          <Text style={{ color: theme.textOnAccent }}>{t(answer === 'yes' ? 'caseYes' : answer === 'no' ? 'caseNo' : 'caseUnsure')}</Text>
        </ThemedPressable>)}
      </View>
    </> : <>
      <Text style={{ color: theme.textHeading, fontSize: 18 }}>{t('caseLikelyStage')}: {t(CASE_STAGES.find(item => item.id === stage)?.title || 'caseUnknown')}</Text>
      <Text style={{ color: theme.textSecondary }}>{t('caseIntakeConfirm')}</Text>
      <ThemedPressable accessibilityRole="button" onPress={() => onApply({ ...blankIntake, ...answers })} style={{ padding: 12, borderRadius: 8 }}><Text style={{ color: theme.textOnAccent }}>{t('caseIntakeApply')}</Text></ThemedPressable>
    </>}
    <View style={{ flexDirection: 'row', gap: 16 }}>
      {Object.keys(answers).length > 0 && <Pressable accessibilityRole="button" onPress={() => setAnswers({})} style={{ padding: 10 }}><Text style={{ color: theme.text }}>{t('caseIntakeRestart')}</Text></Pressable>}
      <Pressable accessibilityRole="button" onPress={onCancel} style={{ padding: 10 }}><Text style={{ color: theme.text }}>{t('cancel')}</Text></Pressable>
    </View>
  </View>;
}
