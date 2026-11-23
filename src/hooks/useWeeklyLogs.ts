import { useCallback, useMemo } from 'react';
import { submitReport } from '../services/report.service';
import type { NewWeeklyLogInput } from '../types/weekly-log';
import { latestLogByStation, sortLogsNewestFirst } from '../utils/calculations';
import { useAuth } from './useAuth';
import { useSharedData } from './useSharedData';
import { useStations } from './useStations';

/** Current-version weekly logs for the stations visible to the logged-in user. */
export function useWeeklyLogs() {
  const { user } = useAuth();
  const { currentReports, rmaNames, bmNames, amendments } = useSharedData();
  const { stations } = useStations();

  const logs = useMemo(() => {
    const ids = new Set(stations.map((s) => s.id));
    return currentReports.filter((l) => ids.has(l.stationId));
  }, [currentReports, stations]);

  const latestByStation = useMemo(() => latestLogByStation(logs), [logs]);

  const logsForStation = useCallback(
    (stationId: string) => sortLogsNewestFirst(logs.filter((l) => l.stationId === stationId)),
    [logs],
  );

  const findSubmission = useCallback(
    (stationId: string, reportingWeek: string) =>
      currentReports.find((l) => l.stationId === stationId && l.reportingWeek === reportingWeek),
    [currentReports],
  );

  /** The open (pending / approved) or latest amendment request for a report's station + week. */
  const amendmentFor = useCallback(
    (stationId: string, reportingWeek: string) => {
      const matches = amendments
        .filter((a) => a.stationId === stationId && a.reportingWeek === reportingWeek)
        .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
      return matches.find((a) => a.status === 'Pending Approval' || a.status === 'Approved') ?? matches[0] ?? null;
    },
    [amendments],
  );

  const submitLog = useCallback(
    async (input: NewWeeklyLogInput) => {
      if (!user) throw new Error('You must be signed in.');
      return submitReport(user.id, input);
    },
    [user],
  );

  const rmaName = useCallback((id: string) => rmaNames[id] ?? id, [rmaNames]);
  const bmName = useCallback((id: string | null) => (id ? bmNames[id] ?? id : '—'), [bmNames]);

  return { logs, loading: false, latestByStation, logsForStation, findSubmission, amendmentFor, submitLog, rmaName, bmName };
}
