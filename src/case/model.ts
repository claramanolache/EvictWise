import type { CaseDetails, CaseEvidence, CaseRecord, IntakeAnswers } from './types';
import type { CalendarEvent, FileData } from '../types';
import type { LocationData } from '../slice';
import { stageIds } from './types';

export const blankIntake: IntakeAnswers = { notice: 'unknown', courtPapers: 'unknown', response: 'unknown', hearing: 'unknown', decision: 'unknown' };
export function likelyStage(answers: IntakeAnswers): CaseDetails['stage'] {
  // Unknown is preserved; nothing is inferred from the mere existence of an upload.
  if (answers.decision === 'yes') return 'after_decision';
  if (answers.hearing === 'yes') return 'hearing';
  if (answers.response === 'yes') return 'response';
  if (answers.courtPapers === 'yes') return 'court_started';
  if (answers.notice === 'yes') return 'notice';
  return 'unknown';
}
export function emptyCaseDetails(location?: LocationData | null): CaseDetails {
  return { stage: 'unknown', jurisdiction: { state: location?.state || '', county: location?.county || '', city: location?.city || '' },
    noticeType: '', serviceDate: '', serviceMethod: 'unknown', courtCaseNumber: '', responseFiled: 'unknown', representation: 'unknown' };
}
export function isCalifornia(details: CaseDetails) { return ['ca', 'california'].includes(details.jurisdiction.state.trim().toLowerCase()); }
export function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year!, month! - 1, day!);
  return year! >= 1900 && date.getFullYear() === year && date.getMonth() === month! - 1 && date.getDate() === day;
}
export function validateCaseDetails(details: CaseDetails, now = new Date()): string | null {
  if (details.stage === 'response' && details.responseFiled === 'no') return 'caseConflictStageResponse';
  if (details.responseFiled === 'yes' && ['notice', 'court_started'].includes(details.stage)) return 'caseConflictResponse';
  if (details.serviceDate && !validDate(details.serviceDate)) return 'caseDateInvalid';
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  if (details.serviceDate > today) return 'caseDateFuture';
  return null;
}
export function cleanCaseDetails(details: CaseDetails): CaseDetails {
  const text = (value: string) => value.trim().slice(0, 250);
  return { ...details, stage: stageIds.includes(details.stage as typeof stageIds[number]) ? details.stage : 'unknown',
    jurisdiction: { state: text(details.jurisdiction.state), county: text(details.jurisdiction.county), city: text(details.jurisdiction.city) },
    noticeType: text(details.noticeType), courtCaseNumber: text(details.courtCaseNumber), serviceDate: details.serviceDate.trim() };
}
// Future classification/verifier adapters must provide provenance. A file existing
// in storage does not by itself make a user-reported stage document-supported.
export function evidenceLevel(evidence: CaseEvidence, documents: FileData[]): CaseEvidence['kind'] {
  if (evidence.kind === 'verified') return evidence.source?.trim() && evidence.reviewedBy?.trim() && Number.isFinite(Date.parse(evidence.reviewedAt)) ? 'verified' : 'unknown';
  if (evidence.kind === 'document_supported') return evidence.source?.trim() && Number.isFinite(Date.parse(evidence.reviewedAt)) && documents.some(file => file.originalFileId === evidence.documentId) ? 'document_supported' : 'unknown';
  return evidence.kind === 'user_reported' ? 'user_reported' : 'unknown';
}
export function deadlineDate(event: CalendarEvent): string | null {
  const [year, month, day] = event.date;
  const value = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return validDate(value) ? value : null;
}
export function isVerifiedDeadline(event: CalendarEvent) {
  const v = event.verification;
  return Boolean(deadlineDate(event) && v?.status === 'verified' && v.source?.trim() && v.reviewedBy?.trim() && v.reviewedAt && Number.isFinite(Date.parse(v.reviewedAt)));
}
export const hypotheticalCase: CaseRecord = {
  version: 1,
  details: { ...emptyCaseDetails(), stage: 'court_started', jurisdiction: { state: 'California', county: 'Santa Clara', city: 'Palo Alto' },
    noticeType: 'Summons and Complaint (fictional example)', responseFiled: 'no', representation: 'seeking',
    intake: { ...blankIntake, notice: 'yes', courtPapers: 'yes', response: 'no', hearing: 'no', decision: 'no' } },
  statusEvidence: { kind: 'user_reported' }, completedTasks: [], updatedAt: '',
};
