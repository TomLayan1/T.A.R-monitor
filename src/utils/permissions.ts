import type { Station } from '../types/station';
import type { Role, SessionUser } from '../types/user';
import type { WeeklyLog } from '../types/weekly-log';

/**
 * AUTHORITATIVE PERMISSION MATRIX (pure functions, shared by services and hooks).
 *
 * Function                         RMA        BM              HoR  Risk Mgmt
 * View own assigned stations       yes        yes             yes  yes  yes
 * View all stations                no         no              yes  yes  yes
 * Submit weekly reports            yes        no              no   no   no
 * Download reports                 own scope  assigned scope  all  all  all
 * Request amendments               yes        no              no   no   no
 * Approve / reject amendments      no         no              no   yes  no
 * Nudge outstanding RMAs           no         no              no   no   yes
 * Receive positive T.A.R alerts    all roles
 */
export const hasOrgWideAccess = (role: Role): boolean => role === 'Head of Retail' || role === 'Risk' || role === 'Management';
export const canSubmitReports = (role: Role): boolean => role === 'RMA';
export const canRequestAmendment = (role: Role): boolean => role === 'RMA';
export const canDecideAmendment = (role: Role): boolean => role === 'Risk';
export const canNudge = (role: Role): boolean => role === 'Management';

type UserLike = Pick<SessionUser, 'id' | 'role' | 'bmId'>;

/** Stations the user may see. RMA: own stations. BM: stations of the RMAs assigned to them plus stations assigned to them. Others: all. */
export function scopeStations(user: UserLike | null, stations: Station[], users: UserLike[]): Station[] {
  if (!user) return [];
  if (hasOrgWideAccess(user.role)) return stations;
  if (user.role === 'RMA') return stations.filter((s) => s.rmaId === user.id);
  // BM
  const ownBy = new Map(users.map((u) => [u.id, u]));
  return stations.filter((s) => s.bmId === user.id || (s.rmaId !== null && ownBy.get(s.rmaId)?.bmId === user.id));
}

/** RMAs the user may see: self (RMA), assigned RMAs (BM), everyone (org-wide roles). */
export function scopeRmas<T extends UserLike>(user: UserLike | null, users: T[], scopedStations: Station[]): T[] {
  if (!user) return [];
  const rmas = users.filter((u) => u.role === 'RMA');
  if (hasOrgWideAccess(user.role)) return rmas;
  if (user.role === 'RMA') return rmas.filter((u) => u.id === user.id);
  const owners = new Set(scopedStations.map((s) => s.rmaId));
  return rmas.filter((u) => u.bmId === user.id || owners.has(u.id));
}

/** Reports (all versions) for the stations in scope. */
export function scopeReports(reports: WeeklyLog[], scopedStations: Station[]): WeeklyLog[] {
  const ids = new Set(scopedStations.map((s) => s.id));
  return reports.filter((r) => ids.has(r.stationId));
}
