import regionsJson from '../data/regions.json';
import { listStations } from './stationService';

/** Regions supported by the application: the configured list plus any region already on a station. */
export function listRegions(): string[] {
  const set = new Set<string>(regionsJson as string[]);
  for (const s of listStations()) if (s.region) set.add(s.region);
  return Array.from(set);
}
