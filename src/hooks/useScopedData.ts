import { useMemo } from 'react';
import { scopeReports, scopeRmas, scopeStations } from '../utils/permissions';
import { useAuth } from './useAuth';
import { useSharedData } from './useSharedData';

/**
 * The shared data filtered to what the signed-in user may see (RMA: own; BM: assigned; Head of Retail /
 * Risk / Management: everything). All dashboards, tables and charts read through this, so a BM never
 * receives another BM's stations, RMAs or reports.
 */
export function useScopedData() {
  const { user } = useAuth();
  const shared = useSharedData();

  const stations = useMemo(() => scopeStations(user, shared.stations, shared.users), [user, shared.stations, shared.users]);
  const rmas = useMemo(() => scopeRmas(user, shared.users, stations), [user, shared.users, stations]);
  const reports = useMemo(() => scopeReports(shared.reports, stations), [shared.reports, stations]);
  const currentReports = useMemo(() => scopeReports(shared.currentReports, stations), [shared.currentReports, stations]);

  return { ...shared, user, stations, rmas, reports, currentReports };
}
