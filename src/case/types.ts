export const stageIds = ['notice', 'court_started', 'response', 'hearing', 'after_decision'] as const;
export type CaseStage = typeof stageIds[number];
export type Answer = 'yes' | 'no' | 'unknown';
export type IntakeAnswers = { notice: Answer; courtPapers: Answer; response: Answer; hearing: Answer; decision: Answer };
export type CaseEvidence =
  | { kind: 'unknown' | 'user_reported' }
  | { kind: 'document_supported'; documentId: string; source: string; reviewedAt: string }
  | { kind: 'verified'; source: string; reviewedBy: string; reviewedAt: string };
export interface CaseDetails {
  stage: CaseStage | 'unknown';
  jurisdiction: { state: string; county: string; city: string };
  noticeType: string;
  serviceDate: string; // YYYY-MM-DD, blank means unknown; never used to calculate a deadline.
  serviceMethod: 'unknown' | 'personal' | 'substituted' | 'posting_mail' | 'other';
  courtCaseNumber: string;
  responseFiled: Answer;
  representation: 'unknown' | 'none' | 'seeking' | 'represented';
  intake?: IntakeAnswers;
}
export interface CaseRecord {
  version: 1;
  details: CaseDetails;
  statusEvidence: CaseEvidence;
  completedTasks: string[];
  updatedAt: string;
}
export interface DeadlineVerification {
  status: 'verified' | 'unverified';
  source?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}
