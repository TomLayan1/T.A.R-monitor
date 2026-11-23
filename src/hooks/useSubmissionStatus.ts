import { useMemo } from 'react';
import { computeRmaStatuses } from '../services/submission.service';
import { currentWeekEnding } from '../utils/date';
import { useScopedData } from './useScopedData';

/** Per-RMA submission status for a reporting week (defaults to the current one), within the user's scope. */
export function useSubmissionStatus(weekEnding?: string) {
  const { rmas, stations, reports, now, bmNames, nudges } = useScopedData();
  const week = weekEnding ?? currentWeekEnding(now);
  const statuses = useMemo(
    () => computeRmaStatuses(rmas, stations, reports, week, now, bmNames, nudges),
    [rmas, stations, reports, week, now, bmNames, nudges],
  );
  return { week, statuses };
}
