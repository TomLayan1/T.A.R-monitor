import type { Station } from '../types/station';

/**
 * S4HANA DATA SOURCE (mock).
 *
 * The application is not yet connected to S4HANA. The only S4HANA-owned value the portal reads is the station's
 * Credit Limit, and every screen and service reads it ONLY through `s4hana`, so this mock can later be swapped for
 * a real API client (implementing `S4HanaSource`) without touching forms, tables or calculations.
 * Trade Balance is entered by the RMA on the weekly log; it is not generated here.
 */
export interface S4HanaSource {
  readonly simulated: boolean;
  getCreditLimit(station: Pick<Station, 'creditLimit'>): number | null;
}

/** Credit Limit comes from the station master record (src/data/stations.json); null until it is supplied. */
export const mockS4Hana: S4HanaSource = {
  simulated: true,
  getCreditLimit: (station) => station.creditLimit,
};

/** The active S4HANA source. Replace with a real client when the integration is available. */
export const s4hana: S4HanaSource = mockS4Hana;
