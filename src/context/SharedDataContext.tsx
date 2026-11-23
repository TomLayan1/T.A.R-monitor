import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { listAmendmentHistory, listAmendments } from '../services/amendment.service';
import { getNow } from '../services/clock.service';
import { KEYS, readCollection, subscribeStore } from '../services/storage';
import { listReports } from '../services/report.service';
import { listStations } from '../services/stationService';
import { listNudges, runScheduler } from '../services/submission.service';
import { bmNameMap, getSessionUsers } from '../services/userService';
import type { AmendmentHistoryEntry, AmendmentRequest } from '../types/amendment';
import type { AppNotification, AuditLog, NudgeRecord } from '../types/notification';
import type { Station } from '../types/station';
import { fullName, type SessionUser } from '../types/user';
import type { WeeklyLog } from '../types/weekly-log';
import { currentVersions } from '../utils/calculations';

/**
 * ONE shared data context for both portals. It mirrors the shared LocalStorage collections and
 * reloads whenever any tab changes them (BroadcastChannel / storage event), so the RMA and
 * Management portals stay in sync without a manual refresh.
 */
export interface SharedData {
  now: Date;
  users: SessionUser[];
  stations: Station[];
  /** Every version of every report (audit trail). */
  reports: WeeklyLog[];
  /** Current (highest) version per station + reporting week. */
  currentReports: WeeklyLog[];
  amendments: AmendmentRequest[];
  amendmentHistory: AmendmentHistoryEntry[];
  notifications: AppNotification[];
  nudges: NudgeRecord[];
  audit: AuditLog[];
  bmNames: Record<string, string>;
  rmaNames: Record<string, string>;
  refresh: () => void;
}

const load = (): Omit<SharedData, 'refresh'> => {
  const users = getSessionUsers();
  const reports = listReports();
  return {
    now: getNow(),
    users,
    stations: listStations(),
    reports,
    currentReports: currentVersions(reports),
    amendments: listAmendments(),
    amendmentHistory: listAmendmentHistory(),
    notifications: readCollection<AppNotification>(KEYS.notifications),
    nudges: listNudges(),
    audit: readCollection<AuditLog>(KEYS.audit),
    bmNames: bmNameMap(),
    rmaNames: Object.fromEntries(users.map((u) => [u.id, fullName(u)])),
  };
};

export const SharedDataContext = createContext<SharedData | null>(null);

export function SharedDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState(load);
  const refresh = useCallback(() => setData(load()), []);

  useEffect(() => subscribeStore(refresh), [refresh]);

  // Deadline / reminder scheduler: runs on mount and every 15 seconds (idempotent).
  useEffect(() => {
    const tick = () => {
      runScheduler();
      refresh();
    };
    tick();
    const id = window.setInterval(tick, 15000);
    return () => window.clearInterval(id);
  }, [refresh]);

  const value = useMemo(() => ({ ...data, refresh }), [data, refresh]);
  return <SharedDataContext.Provider value={value}>{children}</SharedDataContext.Provider>;
}
