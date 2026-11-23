import { KEYS, readJSON, removeKey, writeJSON } from './storage';

/**
 * Controllable clock for testing the Monday deadline and reminder schedule.
 * With no override this is simply the real time. An override stores an offset, so the simulated
 * time keeps ticking forward from the instant you set it.
 */
interface ClockOverride {
  offsetMs: number;
}

export function getNow(): Date {
  const override = readJSON<ClockOverride>(KEYS.clock);
  return new Date(Date.now() + (override?.offsetMs ?? 0));
}

export const isClockSimulated = (): boolean => readJSON<ClockOverride>(KEYS.clock) !== null;

export function setSimulatedNow(target: Date): void {
  writeJSON<ClockOverride>(KEYS.clock, { offsetMs: target.getTime() - Date.now() });
}

export function resetClock(): void {
  removeKey(KEYS.clock);
}
