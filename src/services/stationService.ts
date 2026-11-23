import type { Station } from '../types/station';
import type { SessionUser } from '../types/user';
import { scopeStations } from '../utils/permissions';
import { KEYS, readCollection } from './storage';

/**
 * DATA SERVICE LAYER
 * One shared stations collection feeds every portal. stationCode and creditLimit are S4HANA-owned
 * (null until supplied). Later, replace `listStations` with an S4HANA / backend call.
 */
export const listStations = (): Station[] => readCollection<Station>(KEYS.stations);

/** Stations visible to the user according to the permission matrix (see utils/permissions.ts). */
export const getAssignedStations = (stations: Station[], user: SessionUser | null, users: SessionUser[]): Station[] =>
  scopeStations(user, stations, users);
