/** Default Security Balance shown for every station on the Financial Monitor. */
export const DEFAULT_SECURITY_BALANCE = 10_000_000;

/**
 * Account Monitoring: one monthly stock, cash and account-balance log per station per reporting month.
 *
 * Opening values are NEVER typed by the RMA. They are carried forward from the same station's most recent
 * earlier monthly log (closing -> opening, separately for stock, C.I.T and balance) and persisted with the log.
 * A station's first monthly log opens at ₦0.
 */
export interface MonthlyLog {
  id: string;
  stationId: string;
  stationCode: string | null;
  stationName: string;
  /** Reporting month, YYYY-MM. */
  reportingMonth: string;
  openingStock: number;
  /** Opening C.I.T (cash in till). */
  openingBalanceCit: number;
  closingStock: number;
  /** Closing C.I.T (cash in till). */
  closingBalanceCit: number;
  /** Opening account balance = previous month's Closing Balance. */
  openingBalance: number;
  /** Entered by the RMA. */
  turnover: number;
  /** Entered by the RMA. */
  payment: number;
  /** Non-stock margin, optional on entry (0 when left blank). */
  nonStockMargin: number;
  /** Opening Balance + Turnover - Payment - Non-stock margin (stored so the next month can carry it forward). */
  closingBalance: number;
  securityBalance: number;
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
  turnover: number;
  payment: number;
  /** Optional; treated as 0 when omitted. */
  nonStockMargin?: number | null;
  comments?: string | null;
}

/** Financial Monitor figures, always derived from a monthly log (never edited directly). */
export interface FinancialMonitorFigures {
  openingStock: number;
  openingCit: number;
  openingAll: number;
  openingBalance: number;
  openingNetworth: number;
  turnover: number;
  payment: number;
  nonStockMargin: number;
  closingBalance: number;
  closingNetworth: number;
  closingStock: number;
  closingCit: number;
  closingAll: number;
  securityBalance: number;
  changeInBalance: number;
  changeInStock: number;
  netEffect: number;
}
