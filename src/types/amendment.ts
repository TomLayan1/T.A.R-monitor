export type AmendmentStatus = 'Pending Approval' | 'Approved' | 'Rejected' | 'Completed';

export interface AmendmentRequest {
  id: string;
  /** The report version the request was raised against. */
  reportId: string;
  stationId: string;
  stationCode: string | null;
  stationName: string;
  reportingWeek: string;
  rmaId: string;
  reason: string;
  requestedAt: string;
  status: AmendmentStatus;
  decidedById: string | null;
  decidedAt: string | null;
  decisionComment: string | null;
  completedAt: string | null;
  resultingReportId: string | null;
  originalTotalExposure: number;
  originalAvailableStock: number;
}

export interface AmendmentHistoryEntry {
  id: string;
  requestId: string;
  stationId: string;
  stationCode: string | null;
  reportingWeek: string;
  originalReportId: string;
  updatedReportId: string;
  originalTotalExposure: number;
  originalAvailableStock: number;
  originalAvailableCredit: number | null;
  originalTarDebt: number;
  updatedTotalExposure: number;
  updatedAvailableStock: number;
  updatedAvailableCredit: number | null;
  updatedTarDebt: number;
  requestingRmaId: string;
  approvedById: string;
  reason: string;
  approvalDate: string;
  resubmissionDate: string;
}
