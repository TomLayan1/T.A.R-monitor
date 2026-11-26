/**
 * Account Monitoring: one monthly stock and cash-balance log per station per reporting month.
 *
 * Opening values are NEVER typed by the RMA. They are carried forward from the same station's most recent
 * earlier monthly log (closing -> opening, separately for stock and balance) and persisted with the log.
 * A station's first monthly log opens at ₦0 / ₦0.
 */
export interface MonthlyLog {
  id: string;
  stationId: string;
  stationCode: string | null;
  stationName: string;
  /** Reporting month, YYYY-MM. */
  reportingMonth: string;
  openingStock: number;
  openingBalanceCit: number;
  closingStock: number;
  closingBalanceCit: number;
  /** 'first-log' = ₦0 start; 'carried-forward' = copied from `carriedFromLogId`. */
  openingSource: 'first-log' | 'carried-forward';
  carriedFromLogId: string | null;
  carriedFromMonth: string | null;
  rmaId: string;
  bmId: string | null;
  submittedAt: string;
  comments: string | null;
}

export interface NewMonthlyLogInput {
  stationId: string;
  reportingMonth: string;
  closingStock: number;
  closingBalanceCit: number;
  comments?: string | null;
}

/** Financial Monitor figures, always derived from a monthly log (never edited directly). */
export interface FinancialMonitorFigures {
  openingStock: number;
  openingBalanceCit: number;
  totalOpeningStock: number;
  closingStock: number;
  closingBalanceCit: number;
  totalClosingStock: number;
  changeInBalance: number;
  changeInStock: number;
  netEffect: number;
}
