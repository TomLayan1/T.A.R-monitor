export type LogStatus = 'Submitted' | 'Amended';

/**
 * One version of a station's weekly report. Every amendment adds a NEW record
 * (version + 1); earlier versions are never overwritten.
 */
export interface WeeklyLog {
  id: string;
  stationId: string;
  stationCode: string | null;
  /** Week-ending Sunday as an ISO date (YYYY-MM-DD). This is the single reporting-week identifier. */
  reportingWeek: string;
  /** ISO timestamp of when this version was submitted. */
  submittedAt: string;
  totalExposure: number;
  availableStock: number;
  /** totalExposure - creditLimit. null when the station's credit limit is not yet available. */
  availableCredit: number | null;
  /** availableStock - totalExposure */
  tarDebt: number;
  rmaId: string;
  bmId: string | null;
  status: LogStatus;
  version: number;
  /** Optional RMA explanation of unusual positions. Shown only in the View modal. */
  comments: string | null;
}

/** What the UI supplies when submitting. RMA, BM and derived values are set by the service. */
export interface NewWeeklyLogInput {
  stationId: string;
  reportingWeek: string;
  totalExposure: number;
  availableStock: number;
  comments?: string | null;
}
