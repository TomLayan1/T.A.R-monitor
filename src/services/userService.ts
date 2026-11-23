import type { Role, SessionUser, StoredUser } from '../types/user';
import { STAKEHOLDER_DEPARTMENTS, fullName } from '../types/user';
import type { AccountType } from '../types/user';
import type { Station } from '../types/station';
import { recordAudit } from './audit.service';
import { listRegions } from './regionService';
import { KEYS, batch, newId, readCollection, readSessionUserId, saveCollection, wait, writeSessionUserId } from './storage';

/**
 * DEMO AUTHENTICATION ONLY - NOT PRODUCTION GRADE.
 * Accounts (including plain-text passwords) live in the browser's LocalStorage.
 * Replace with a real identity provider / backend before go-live.
 */
export const toSession = ({ password: _password, ...user }: StoredUser): SessionUser => user;

export const getStoredUsers = (): StoredUser[] => readCollection<StoredUser>(KEYS.users);
export const getSessionUsers = (): SessionUser[] => getStoredUsers().map(toSession);

/** Registered BM users (stakeholder department "Branch Manager"). */
export const listBmOptions = (): Array<{ id: string; name: string }> =>
  getStoredUsers()
    .filter((u) => u.role === 'BM')
    .map((u) => ({ id: u.id, name: fullName(u) }));

export const bmNameMap = (): Record<string, string> => Object.fromEntries(listBmOptions().map((b) => [b.id, b.name]));

export interface RegisterInput {
  firstName: string;
  surname: string;
  email: string;
  accountType: AccountType;
  /** Stakeholder department (becomes the role). Ignored for RMAs. */
  department: Exclude<Role, 'RMA'> | null;
  /** RMA only: BM user id. */
  bmId: string | null;
  /** RMA only. */
  region: string | null;
  /** RMA only: ids of unassigned stations in the region that this RMA takes on. */
  stationIds: string[];
  password: string;
}

export async function registerUser(input: RegisterInput): Promise<SessionUser> {
  await wait(400);
  const users = getStoredUsers();
  const email = input.email.trim().toLowerCase();
  if (users.some((u) => u.email.toLowerCase() === email)) throw new Error('An account with this email already exists.');

  let role: Role;
  if (input.accountType === 'RMA') {
    role = 'RMA';
  } else {
    const dept = STAKEHOLDER_DEPARTMENTS.find((d) => d.value === input.department);
    if (!dept) throw new Error('Select a valid department.');
    role = dept.value;
  }

  const userId = newId('user');
  let claimed: string[] = [];
  if (role === 'RMA') {
    if (!input.bmId || !users.some((u) => u.id === input.bmId && u.role === 'BM')) throw new Error('Select a registered Branch Manager.');
    if (!input.region || !listRegions().includes(input.region)) throw new Error('Select a valid region.');
    const stations = readCollection<Station>(KEYS.stations);
    for (const id of input.stationIds) {
      const st = stations.find((s) => s.id === id);
      if (!st) throw new Error('A selected station no longer exists.');
      if (st.region !== input.region) throw new Error(`${st.stationName} is not in the selected region.`);
      if (st.rmaId !== null) throw new Error(`${st.stationName} has already been assigned to an RMA.`);
    }
    claimed = input.stationIds;
  }

  const user: StoredUser = {
    id: userId,
    firstName: input.firstName.trim(),
    surname: input.surname.trim(),
    email,
    role,
    bmId: role === 'RMA' ? input.bmId : null,
    regions: role === 'RMA' && input.region ? [input.region] : [],
    password: input.password,
  };

  batch(() => {
    saveCollection(KEYS.users, [...users, user]);
    if (claimed.length > 0) {
      // The station record is the single source of the assignment (station.rmaId / station.bmId).
      saveCollection(
        KEYS.stations,
        readCollection<Station>(KEYS.stations).map((s) => (claimed.includes(s.id) ? { ...s, rmaId: user.id, bmId: user.bmId } : s)),
      );
    }
    recordAudit(user.id, 'USER_REGISTERED', 'user', user.id, `${fullName(user)} registered as ${role}${claimed.length ? ` with ${claimed.length} station(s)` : ''}`);
  });
  return toSession(user);
}

export async function authenticate(email: string, password: string): Promise<SessionUser> {
  await wait(400);
  const match = getStoredUsers().find((u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password);
  if (!match) throw new Error('Invalid email or password.');
  return toSession(match);
}

/** The signed-in user, resolved from the authoritative users collection (role comes from here, never from the browser session). */
export function getSessionUser(): SessionUser | null {
  const id = readSessionUserId();
  if (!id) return null;
  const stored = getStoredUsers().find((u) => u.id === id);
  return stored ? toSession(stored) : null;
}
export const saveSession = (user: SessionUser): void => writeSessionUserId(user.id);
export const clearSession = (): void => writeSessionUserId(null);
