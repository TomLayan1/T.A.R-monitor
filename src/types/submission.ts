import type { Station } from './station';
import type { SessionUser } from './user';

export type SubmissionState = 'Submitted' | 'Pending' | 'Overdue';

export interface RmaSubmissionStatus {
  rma: SessionUser;
  bmName: string;
  weekEnding: string;
  stationCount: number;
  submittedStations: number;
  outstandingStations: number;
  outstandingStationCodes: string[];
  status: SubmissionState;
  lastNudgedAt: string | null;
}

export interface PerformanceRow {
  rma: SessionUser;
  bmName: string;
  stationCount: number;
  required: number;
  submitted: number;
  outstanding: number;
  /** Every station-week counted in `outstanding` (no report submitted), oldest week first. */
  outstandingReports: OutstandingReport[];
  onTime: number;
  late: number;
  compliance: number;
}

export interface OutstandingReport {
  station: Station;
  week: string;
}

export interface PerformanceTrendPoint {
  week: string;
  required: number;
  onTime: number;
  late: number;
  outstanding: number;
  compliance: number;
}
