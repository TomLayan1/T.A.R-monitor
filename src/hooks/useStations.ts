import { useCallback } from 'react';
import { useScopedData } from './useScopedData';

/** Stations visible to the logged-in user (an RMA only sees their own; a BM only assigned ones). */
export function useStations() {
  const { stations: assigned } = useScopedData();

  const getStation = useCallback((id: string) => assigned.find((s) => s.id === id), [assigned]);

  const search = useCallback(
    (query: string) => {
      const q = query.trim().toLowerCase();
      if (!q) return assigned;
      return assigned.filter((s) => (s.stationCode ?? '').toLowerCase().includes(q) || s.stationName.toLowerCase().includes(q));
    },
    [assigned],
  );

  return { stations: assigned, loading: false, getStation, search };
}
