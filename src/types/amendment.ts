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
  /** S4HANA value recorded with the original report (not editable by the RMA). */
  originalTradeBalance: number;
  originalAvailableStock: number;
  originalCit: number;
}

export interface AmendmentHistoryEntry {
  id: string;
  requestId: string;
  stationId: string;
  stationCode: string | null;
  reportingWeek: string;
  originalReportId: string;
  updatedReportId: string;
  originalTradeBalance: number;
  originalAvailableStock: number;
  originalCit: number;
  originalTotalStock: number;
  originalTar: number;
  originalExposure: number;
  updatedTradeBalance: number;
  updatedAvailableStock: number;
  updatedCit: number;
  updatedTotalStock: number;
  updatedTar: number;
  updatedExposure: number;
  requestingRmaId: string;
  approvedById: string;
  reason: string;
  approvalDate: string;
  resubmissionDate: string;
}
