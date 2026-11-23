import { useMemo } from 'react';
import { buildSnapshots } from '../utils/calculations';
import { useScopedData } from './useScopedData';

/** Reports for the stakeholder portals, already restricted to the user's scope. */
export function useWeeklyReports() {
  const { stations, reports, currentReports, rmaNames, bmNames, rmas } = useScopedData();
  const snapshots = useMemo(() => buildSnapshots(stations, currentReports), [stations, currentReports]);
  return { stations, reports, currentReports, snapshots, rmaNames, bmNames, users: rmas };
}
