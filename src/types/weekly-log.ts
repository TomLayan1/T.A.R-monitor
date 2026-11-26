export type LogStatus = 'Submitted' | 'Amended';

/**
 * One version of a station's weekly TAR report. Every amendment adds a NEW record
 * (version + 1); earlier versions are never overwritten.
 *
 * Sources
 *   creditLimit                        S4HANA (simulated by services/s4hana.service.ts until the integration exists)
 *   tradeBalance, availableStock, cit  RMA input
 *   availableCredit, totalStock, tar, exposure   calculated by utils/calculations.ts (stored with the version)
 */
export interface WeeklyLog {
  id: string;
  stationId: string;
  stationCode: string | null;
  /** Week-ending Sunday as an ISO date (YYYY-MM-DD). This is the single reporting-week identifier. */
  reportingWeek: string;
  /** ISO timestamp of when this version was submitted. */
  submittedAt: string;
  /** S4HANA credit limit at submission. null when S4HANA has not supplied it yet. */
  creditLimit: number | null;
  /** RMA input: the station's trade balance for the reporting week (formerly labelled Total Exposure). */
  tradeBalance: number;
  /** RMA input. */
  availableStock: number;
  /** Cash in Till: cash physically at the station that has not yet been deposited. RMA input. */
  cit: number;
  /** Trade Balance - Credit Limit. null when the credit limit is not yet available. */
  availableCredit: number | null;
  /** Available Stock + CIT */
  totalStock: number;
  /** Available Stock - Trade Balance */
  tar: number;
  /** TAR - Available Stock + CIT */
  exposure: number;
  rmaId: string;
  bmId: string | null;
  status: LogStatus;
  version: number;
  /** Optional RMA explanation of unusual positions. Shown only in the View modal. */
  comments: string | null;
  /**
   * Set only on records migrated from the old structure (RMA-entered "Total Exposure", no CIT).
   * The old value is kept for audit; it is NOT used as the Trade Balance.
   */
  legacy?: { totalExposure: number; tarDebt: number; migratedAt: string } | null;
}

/** What the UI supplies when submitting. S4HANA values, RMA, BM and derived values are set by the service. */
export interface NewWeeklyLogInput {
  stationId: string;
  reportingWeek: string;
  tradeBalance: number;
  availableStock: number;
  cit: number;
  comments?: string | null;
}
