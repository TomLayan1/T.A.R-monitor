import type { Station } from '../types/station';
import type { Role, SessionUser, StoredUser } from '../types/user';
import { scopeRmas, scopeStations } from '../utils/permissions';
import { KEYS, readCollection } from './storage';

/**
 * Service-level authorisation. The acting user is ALWAYS re-loaded from the users collection by id,
 * so a tampered session value or display field cannot grant a role. Role and assignment checks live
 * here and in utils/permissions.ts, not only in navigation.
 */
export function getActor(actorId: string | null | undefined): StoredUser {
  const actor = readCollection<StoredUser>(KEYS.users).find((u) => u.id === actorId);
  if (!actor) throw new Error('You must be signed in to do this.');
  return actor;
}

export function requireRole(actor: StoredUser, roles: Role[]): void {
  if (!roles.includes(actor.role)) throw new Error('You do not have permission to perform this action.');
}

/** Stations and RMAs this actor may access (RMA: own; BM: assigned; Head of Retail / Risk / Management: all). */
export function getScope(actor: StoredUser): { stations: Station[]; rmas: SessionUser[] } {
  const users = readCollection<StoredUser>(KEYS.users);
  const stations = scopeStations(actor, readCollection<Station>(KEYS.stations), users);
  return { stations, rmas: scopeRmas(actor, users, stations) };
}
