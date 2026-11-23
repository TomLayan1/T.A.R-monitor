import type { OnboardingRecord, Station } from '../types/station';
import type { StoredUser } from '../types/user';
import { fullName } from '../types/user';
import { recordAudit } from './audit.service';
import { getNow } from './clock.service';
import { associatedBm, managementUsers, pushNotifications, routes } from './notification.service';
import { listRegions } from './regionService';
import { KEYS, batch, newId, readCollection, saveCollection } from './storage';
import { listBmOptions } from './userService';

export interface OnboardInput {
  stationName: string;
  address: string;
  region: string;
  /** Selected RMA's user id. */
  rmaId: string;
  /** Selected BM's id. */
  bmId: string;
}

const norm = (v: string) => v.trim().replace(/\s+/g, ' ').toLowerCase();

/**
 * Public station onboarding. Creates ONE record in the shared stations collection, linked to the chosen
 * RMA (rmaId) and BM (bmId). No reports, exposure or stock are invented; station code and credit limit
 * stay null (unavailable) until the S4HANA source supplies them.
 */
export function onboardStation(input: OnboardInput): { station: Station; record: OnboardingRecord } {
  const stationName = input.stationName.trim().replace(/\s+/g, ' ');
  const address = input.address.trim().replace(/\s+/g, ' ');
  if (!stationName) throw new Error('Station name is required.');
  if (!address) throw new Error('Address is required.');
  if (!listRegions().includes(input.region)) throw new Error('Select a valid region.');

  const rma = readCollection<StoredUser>(KEYS.users).find((u) => u.id === input.rmaId && u.role === 'RMA');
  if (!rma) throw new Error('The selected RMA is not available. Choose a registered RMA.');
  const bm = listBmOptions().find((b) => b.id === input.bmId);
  if (!bm) throw new Error('The selected BM is not available. Choose a registered BM.');

  const stations = readCollection<Station>(KEYS.stations);
  if (stations.some((s) => norm(s.stationName) === norm(stationName) && norm(s.address ?? '') === norm(address))) {
    throw new Error('A station with this name and address has already been onboarded.');
  }

  const now = getNow().toISOString();
  const station: Station = {
    id: newId('station'),
    stationCode: null,
    stationName,
    creditLimit: null,
    rmaId: rma.id,
    address,
    region: input.region,
    bmId: bm.id,
    onboardedAt: now,
    onboardingStatus: 'Onboarded',
  };
  const record: OnboardingRecord = {
    id: newId('onb'),
    stationId: station.id,
    stationName,
    address,
    region: input.region,
    rmaId: rma.id,
    bmId: bm.id,
    onboardedAt: now,
    status: 'Onboarded',
  };

  batch(() => {
    saveCollection(KEYS.stations, [...stations, station]);
    saveCollection(KEYS.onboarding, [...readCollection<OnboardingRecord>(KEYS.onboarding), record]);
    recordAudit('public', 'STATION_ONBOARDED', 'station', station.id, `${stationName} (${input.region}) -> RMA ${fullName(rma)}, BM ${bm.name}`);
    pushNotifications([
      {
        userId: rma.id,
        category: 'System',
        title: `New station assigned: ${stationName}`,
        description: `${stationName} (${input.region}) was onboarded and assigned to you. You can submit its weekly report from the Stations tab.`,
        link: routes.rmaStations,
        stationId: station.id,
        reportId: null,
        requestId: null,
        dedupeKey: `onboard:${station.id}:${rma.id}`,
      },
      ...[...managementUsers(), ...(associatedBm(station) ? [associatedBm(station)!] : [])].map((u) => ({
        userId: u.id,
        category: 'System' as const,
        title: `Station onboarded: ${stationName}`,
        description: `${stationName} (${input.region}) was onboarded and assigned to ${fullName(rma)} (BM: ${bm.name}).`,
        link: routes.mgmtStations(stationName),
        stationId: station.id,
        reportId: null,
        requestId: null,
        dedupeKey: `onboard:${station.id}:${u.id}`,
      })),
    ]);
  });
  return { station, record };
}
