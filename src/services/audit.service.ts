import type { AuditLog } from '../types/notification';
import { KEYS, newId, updateCollection } from './storage';
import { getNow } from './clock.service';

export function recordAudit(actorId: string, action: string, entity: string, entityId: string, details: string): void {
  updateCollection<AuditLog>(KEYS.audit, (logs) => [
    ...logs,
    { id: newId('aud'), at: getNow().toISOString(), actorId, action, entity, entityId, details },
  ]);
}
