export type OnboardingStatus = 'Active' | 'Onboarded';

/**
 * Station master record, shared by the RMA and Management portals.
 * stationCode and creditLimit are S4HANA-owned: for a station onboarded through the public website
 * they stay null ("unavailable") until the S4HANA source supplies them. They are never invented.
 * `rmaId` is the existing assignment relationship (RMA user id); `bmId` is the BM's id.
 */
export interface Station {
  id: string;
  stationCode: string | null;
  stationName: string;
  creditLimit: number | null;
  /** Assigned RMA's user id, or null when the station has not been assigned to an RMA yet. */
  rmaId: string | null;
  address: string | null;
  region: string | null;
  bmId: string | null;
  onboardedAt: string | null;
  onboardingStatus: OnboardingStatus;
}

export interface OnboardingRecord {
  id: string;
  stationId: string;
  stationName: string;
  address: string;
  region: string;
  rmaId: string;
  bmId: string;
  onboardedAt: string;
  status: 'Onboarded';
}

/** Station code, or the station name when no code has been supplied yet (for titles, links, search). */
export const stationRef = (s: { stationCode: string | null; stationName: string }): string => s.stationCode ?? s.stationName;

/** Label for a station code that may not have been supplied yet. */
export const stationCodeLabel = (s: { stationCode: string | null }): string => s.stationCode ?? 'Pending';
