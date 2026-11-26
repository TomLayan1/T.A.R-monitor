import { useCallback } from 'react';
import { openingPositionFor, submitMonthlyLog } from '../services/monthly-log.service';
import type { NewMonthlyLogInput } from '../types/monthly-log';
import { useAuth } from './useAuth';
import { useScopedData } from './useScopedData';

/** Account Monitoring logs for the signed-in user's scope, plus the RMA submit action. */
export function useMonthlyLogs() {
  const { user } = useAuth();
  const { monthlyLogs } = useScopedData();

  const logsForStation = useCallback(
    (stationId: string) => monthlyLogs.filter((l) => l.stationId === stationId).sort((a, b) => b.reportingMonth.localeCompare(a.reportingMonth)),
    [monthlyLogs],
  );
  const openingFor = useCallback((stationId: string, month: string) => openingPositionFor(monthlyLogs, stationId, month), [monthlyLogs]);
  const submit = useCallback(
    async (input: NewMonthlyLogInput) => {
      if (!user) throw new Error('You must be signed in.');
      return submitMonthlyLog(user.id, input);
    },
    [user],
  );

  return { monthlyLogs, logsForStation, openingFor, submit };
}
