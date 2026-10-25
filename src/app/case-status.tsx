import { useState, useRef } from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { useDispatch, useSelector, useStore } from 'react-redux';
import { useRouter } from 'expo-router';
import Layout from '@/components/Layout';
import { CaseButton as Button, CaseCard as Card } from '@/case/CaseUI';
import { useAppColorScheme } from '@/context/ThemeContext';
import { getTheme } from '@/constants/theme';
import { useTranslation } from '@/Translation/TranslationContext';
import { flushAppStorage, type RootState } from '@/store';
import type { FileData } from '@/types';
import { saveCaseDetails, toggleCaseTask } from '@/slice';
import { CASE_STAGES, CASE_TASKS, CA_EVICTION_GUIDE } from '@/case/config';
import { blankIntake, deadlineDate, emptyCaseDetails, evidenceLevel, hypotheticalCase, isCalifornia, isVerifiedDeadline, likelyStage } from '@/case/model';
import type { CaseDetails, CaseRecord, CaseStage } from '@/case/types';
import CaseDetailsForm from '@/case/CaseDetailsForm';
import CaseIntake from '@/case/CaseIntake';

export default function CaseStatus() {
  const app = useSelector((state: RootState) => state.app);
  const scrollRef = useRef<ScrollView>(null);
  const store = useStore();
  const dispatch = useDispatch();
  const [storageFailed, setStorageFailed] = useState(false);
  const router = useRouter();
  const theme = getTheme(useAppColorScheme());
  const { t, language } = useTranslation();
  const [demo, setDemo] = useState(false);
  const [demoCase, setDemoCase] = useState<CaseRecord>(hypotheticalCase);
  const [tab, setTab] = useState<'overview' | 'steps' | 'details'>('overview');
  const [exploring, setExploring] = useState<CaseStage | null>(null);
  const [intake, setIntake] = useState(false);
  const [draft, setDraft] = useState<CaseDetails | null>(null);
  const [saved, setSaved] = useState(false);
  const [linkFailed, setLinkFailed] = useState(false);
  const record = demo ? demoCase : app.caseStatus;
  const details = record?.details;
  const california = !!details && isCalifornia(details);
  const stage = CASE_STAGES.find(item => item.id === details?.stage);
  const selectedStage = CASE_STAGES.find(item => item.id === exploring) || stage;
  const currentIndex = CASE_STAGES.findIndex(item => item.id === details?.stage);
  const documents = demo ? [] : [app.evictionNotice, app.leaseAgreement, ...(app.additionalFiles ?? [])].filter((file): file is FileData => !!file);
  const evidence = record ? evidenceLevel(record.statusEvidence, documents) : 'unknown';
  const evidenceLabels = { user_reported: 'caseUserReported', document_supported: 'caseDocumentSupported', verified: 'caseVerified', unknown: 'caseUnknown' };
  const tasks = (CASE_TASKS[california ? details!.stage : 'unknown'] || CASE_TASKS.unknown).filter(task => task.id !== 'find-legal-help' || details?.representation !== 'represented');
  const completed = new Set(record?.completedTasks ?? []);
  const events = demo ? [] : app.events;
  const verified = events.filter(isVerifiedDeadline);
  const unverified = events.filter(event => !isVerifiedDeadline(event));
  const card = { padding: 20, gap: 14, borderRadius: 16, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.backgroundSecondary } as const;
  const heading = { color: theme.textHeading, fontSize: 20, fontWeight: '600' } as const;
  const text = { color: theme.text, fontSize: 15, lineHeight: 23 } as const;
  async function openResource(url: string) {
    setLinkFailed(false);
    try { await Linking.openURL(url); } catch { setLinkFailed(true); }
  }
  function Links() {
    return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      <Button label="caseChat" onPress={() => router.push('/chat')} />
      <Button label="caseUpload" onPress={() => router.push('/profile')} secondary />
      <Button label="caseCalendar" onPress={() => router.push('/calendar')} secondary />
      <Button label="caseLawyer" onPress={() => router.push('/lawyer-connect')} secondary />
    </View>;
  }
  function toggleTask(id: string) {
    if (demo) setDemoCase(previous => ({ ...previous, completedTasks: previous.completedTasks.includes(id) ? previous.completedTasks.filter(value => value !== id) : [...previous.completedTasks, id] }));
    else {
      dispatch(toggleCaseTask(id));
      void flushAppStorage(store).then(() => setStorageFailed(false)).catch(() => setStorageFailed(true));
    }
  }
  function changeMode() { setDemo(!demo); setDraft(null); setIntake(false); setExploring(null); setSaved(false); setTab('overview'); }
  async function save(details: CaseDetails) {
    const updatedAt = new Date().toISOString();
    if (demo) setDemoCase(previous => ({ ...previous, details, updatedAt, statusEvidence: { kind: details.stage === 'unknown' ? 'unknown' : 'user_reported' } }));
    else {
      dispatch(saveCaseDetails({ details, updatedAt }));
      try { await flushAppStorage(store); setStorageFailed(false); }
      catch { setStorageFailed(true); return false; }
    }
    setDraft(null); setIntake(false); setExploring(null); setSaved(true); setTab('details');
    return true;
  }
  const statusTitle = stage?.id === 'court_started' && details?.intake?.courtPapers === 'yes' ? 'caseCourtPapersReceived' : stage?.title || 'caseUnknown';
  const serviceLabels = { unknown: 'caseUnknown', personal: 'casePersonal', substituted: 'caseSubstituted', posting_mail: 'casePostingMail', other: 'caseOther' };
  const representationLabels = { unknown: 'caseUnknown', none: 'caseNoLawyer', seeking: 'caseSeekingLawyer', represented: 'caseHasLawyer' };
  return <Layout>
    <ScrollView ref={scrollRef} contentContainerStyle={{ padding: 20, gap: 20, width: '100%', maxWidth: 1100, alignSelf: 'center' }} keyboardShouldPersistTaps="handled">
      <Text accessibilityRole="header" style={{ ...heading, fontSize: 28 }}>{t('menuCaseStatus')}</Text>
      <Text style={text}>{t('caseIntro')}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}><Button label={demo ? 'caseDemoClose' : 'caseDemoOpen'} onPress={changeMode} secondary /></View>
      {demo && <View style={{ ...card, backgroundColor: theme.backgroundError }}>
        <Text accessibilityRole="alert" style={{ ...heading, color: theme.textWarning }}>{t('caseDemo')}</Text>
        <Text style={{ ...text, color: theme.textWarning }}>{t('caseDemoHelp')}</Text>
      </View>}
      <Card title="caseCurrent">
        <Text style={{ ...heading, fontSize: 28, lineHeight: 36 }}>{t(record ? statusTitle : 'caseNoCase')}</Text>
        {record ? <>
          <Text style={text}>{t(california ? stage?.meaning || 'caseStatusUnknown' : 'caseUnsupported')}</Text>
          <View style={{ alignSelf: 'flex-start', backgroundColor: theme.backgroundSelected, borderRadius: 8, padding: 8 }}><Text style={{ color: theme.text, fontWeight: '600' }}>{t(evidenceLabels[evidence])}</Text></View>
          <Text style={{ color: theme.textSecondary, lineHeight: 21 }}>{t('caseEvidenceHelp')}</Text>
          {'source' in record.statusEvidence && <Text style={text}>{t('caseSource')}: {record.statusEvidence.source}</Text>}
          {'reviewedBy' in record.statusEvidence && <Text style={text}>{t('caseReviewedBy')}: {record.statusEvidence.reviewedBy}</Text>}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            <Button label="caseEdit" onPress={() => { setDraft(details!); setIntake(false); setSaved(false); }} secondary />
            <Button label="caseIntake" onPress={() => { setIntake(true); setDraft(null); }} secondary />
          </View>
        </> : <Button label="caseSetup" onPress={() => setIntake(true)} />}
        <Text style={{ color: theme.textSecondary, fontSize: 12 }}>{t('caseStorage')}</Text>
      </Card>
      {intake && <View onLayout={event => scrollRef.current?.scrollTo({ y: event.nativeEvent.layout.y, animated: true })}><Card><CaseIntake onCancel={() => setIntake(false)} onApply={answers => {
        const base = details || emptyCaseDetails(app.location);
        setDraft({ ...base, stage: likelyStage(answers), responseFiled: answers.response, intake: { ...blankIntake, ...answers } }); setIntake(false);
      }} /></Card></View>}
      {draft && <View onLayout={event => scrollRef.current?.scrollTo({ y: event.nativeEvent.layout.y, animated: true })}><Card><CaseDetailsForm key={demo ? 'demo' : 'real'} initial={draft} onSave={save} onCancel={() => setDraft(null)} /></Card></View>}
      {storageFailed && !demo && <Text accessibilityRole="alert" style={{ color: theme.textWarning }}>{t('caseSaveFailed')}</Text>}
      {saved && <Text accessibilityLiveRegion="polite" style={{ color: theme.backgroundAccent }}>{t(demo ? 'caseDemoHelp' : 'caseSaved')}</Text>}
      <Card title="caseTracker">
        <Text style={{ color: theme.textSecondary, lineHeight: 21 }}>{t('caseTrackerHelp')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{ minWidth: '100%' }}>
          {CASE_STAGES.map((item, index) => {
            const reached = currentIndex >= 0 && index <= currentIndex;
            const current = index === currentIndex;
            const selected = selectedStage?.id === item.id;
            return <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`${t(item.title)}: ${t(current ? 'caseCurrentMarker' : reached ? 'caseEarlierMarker' : 'caseFutureMarker')}`} accessibilityState={{ selected }} onPress={() => setExploring(item.id)}
              style={{ flex: 1, minWidth: 150, paddingVertical: 12, gap: 10 }}>
              <View style={{ height: 6, backgroundColor: reached ? theme.backgroundAccent : theme.border }} />
              <View style={{ alignSelf: 'center', width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: reached ? theme.backgroundAccent : theme.border, borderWidth: selected ? 2 : 0, borderColor: theme.textHeading }}>
                <Text style={{ color: reached ? theme.textOnAccent : theme.text, fontWeight: '600' }}>{index + 1}</Text>
              </View>
              <Text style={{ color: theme.textHeading, textAlign: 'center', fontSize: 14, paddingHorizontal: 8, fontWeight: current ? '600' : '400' }}>{t(item.title)}</Text>
              {current && <Text style={{ color: theme.backgroundAccent, textAlign: 'center', fontSize: 12 }}>{t('caseCurrentMarker')}</Text>}
            </Pressable>;
          })}
        </ScrollView>
        {selectedStage && <View style={{ gap: 12 }}>
          <Text style={heading}>{t('caseExploring')}: {t(selectedStage.title)}</Text>
          {california || !record ? <>
            {!record && <Text style={{ color: theme.textSecondary }}>{t('caseCaliforniaOnly')}</Text>}
            <Text style={text}>{t(selectedStage.meaning)}</Text>
            <Text style={{ ...text, fontWeight: '600' }}>{t('caseDocuments')}</Text><Text style={text}>{t(selectedStage.documents)}</Text>
            <Text style={{ ...text, fontWeight: '600' }}>{t('casePossibleSteps')}</Text><Text style={text}>{t(selectedStage.next)}</Text>
            <Pressable accessibilityRole="link" onPress={() => void openResource(selectedStage.resource)} style={{ paddingVertical: 8 }}><Text style={{ color: theme.backgroundAccent, textDecorationLine: 'underline' }}>{t('caseResources')}</Text></Pressable>
            <Button label="caseUpload" onPress={() => router.push('/profile')} secondary />
          </> : <Text style={text}>{t(record ? 'caseUnsupported' : 'caseStatusUnknown')}</Text>}
        </View>}
      </Card>
      {record && <>
        <View accessibilityRole="tablist" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {([{ id: 'overview', label: 'caseOverview' }, { id: 'steps', label: 'caseNextSteps' }, { id: 'details', label: 'caseDetails' }] as const).map(item => <Pressable key={item.id} accessibilityRole="tab" accessibilityState={{ selected: tab === item.id }} onPress={() => setTab(item.id)}
            style={{ flexGrow: 1, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: theme.border, backgroundColor: tab === item.id ? theme.backgroundSelected : theme.backgroundSecondary }}>
            <Text style={{ color: theme.text, fontSize: 16, textAlign: 'center', fontWeight: '600' }}>{t(item.label)}</Text>
          </Pressable>)}
        </View>
        {tab === 'overview' && <>
          <Card title="caseMeaning"><Text style={text}>{t(california ? stage?.meaning || 'caseStatusUnknown' : 'caseUnsupported')}</Text></Card>
          <Card title="caseWhatNext"><Text style={text}>{t(california ? stage?.next || 'caseStatusUnknown' : 'caseUnsupported')}</Text>
            {california && <Pressable accessibilityRole="link" onPress={() => void openResource(stage?.resource || CA_EVICTION_GUIDE)}><Text style={{ color: theme.backgroundAccent, textDecorationLine: 'underline' }}>{t('caseGeneralGuide')}</Text></Pressable>}
          </Card>
          <Card title="caseDeadlines">
            <Text style={{ color: theme.textSecondary, lineHeight: 21 }}>{t('caseDeadlineHelp')}</Text>
            {verified.length === 0 && <Text style={{ color: theme.textWarning }}>{t('caseDeadlineUnverified')}</Text>}
            {[...verified, ...unverified].map(event => <View key={event.id} style={{ padding: 12, gap: 6, borderWidth: 1, borderColor: theme.border, borderRadius: 10 }}>
              <Text style={text}>{event.name}</Text>
              <Text style={{ color: theme.textSecondary }}>{deadlineDate(event) ? new Date(...event.date).toLocaleDateString(language) : t('caseUnknown')}</Text>
              <Text style={{ color: isVerifiedDeadline(event) ? theme.backgroundAccent : theme.textWarning }}>{t(isVerifiedDeadline(event) ? 'caseVerified' : 'caseDeadlineUnverified')}</Text>
              {isVerifiedDeadline(event) && <Text style={{ color: theme.textSecondary }}>{t('caseSource')}: {event.verification!.source} · {t('caseReviewedBy')}: {event.verification!.reviewedBy}</Text>}
            </View>)}
            <Button label="caseCalendar" onPress={() => router.push('/calendar')} secondary />
          </Card>
        </>}
        {tab === 'steps' && <Card title="caseNextSteps">
          <Text style={{ color: theme.textSecondary, lineHeight: 21 }}>{t('caseTasksHelp')}</Text>
          <Text style={text}>{tasks.filter(task => completed.has(`${details!.stage}:${task.id}`)).length} / {tasks.length} {t('caseTasksCompleted')}</Text>
          {tasks.map(task => <View key={task.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Pressable accessibilityRole="checkbox" accessibilityLabel={t(task.label)} accessibilityState={{ checked: completed.has(`${details!.stage}:${task.id}`) }} onPress={() => toggleTask(`${details!.stage}:${task.id}`)} style={{ flex: 1, flexDirection: 'row', gap: 10, paddingVertical: 12 }}>
              <Text style={{ color: theme.backgroundAccent, fontSize: 20 }}>{completed.has(`${details!.stage}:${task.id}`) ? '☑' : '☐'}</Text>
              <Text style={{ ...text, flex: 1, textDecorationLine: completed.has(`${details!.stage}:${task.id}`) ? 'line-through' : 'none' }}>{t(task.label)}</Text>
            </Pressable>
            <Button label="caseTaskOpen" secondary onPress={() => router.push(task.route)} />
          </View>)}
          <Links />
        </Card>}
        {tab === 'details' && <Card title="caseDetails">
          {[
            ['caseState', details!.jurisdiction.state], ['caseCounty', details!.jurisdiction.county], ['caseCity', details!.jurisdiction.city],
            ['caseNoticeType', demo && details!.noticeType === hypotheticalCase.details.noticeType ? t('caseDemoNotice') : details!.noticeType],
            ['caseServiceDate', details!.serviceDate], ['caseServiceMethod', t(serviceLabels[details!.serviceMethod])], ['caseNumber', details!.courtCaseNumber],
            ['caseResponseFiled', t(details!.responseFiled === 'yes' ? 'caseYes' : details!.responseFiled === 'no' ? 'caseNo' : 'caseUnknown')],
            ['caseRepresentation', t(representationLabels[details!.representation])],
            ['caseUpdated', record.updatedAt && Number.isFinite(Date.parse(record.updatedAt)) ? new Date(record.updatedAt).toLocaleString(language) : t(demo ? 'caseDemoDate' : 'caseUnknown')],
          ].map(([label, value]) => <View key={label} style={{ gap: 4 }}><Text style={{ color: theme.textSecondary, fontSize: 13 }}>{t(label!)}</Text><Text selectable style={text}>{value || t('caseUnknown')}</Text></View>)}
          <Button label="caseEdit" onPress={() => { setDraft(details!); setIntake(false); setSaved(false); }} />
          <Links />
        </Card>}
      </>}
      {linkFailed && <Text accessibilityRole="alert" style={{ color: theme.textWarning }}>{t('caseResourceFailed')}</Text>}
    </ScrollView>
  </Layout>;
}
