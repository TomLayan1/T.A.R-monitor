import { useCallback, useMemo } from 'react';
import { completeAmendment, decideAmendment, requestAmendment } from '../services/amendment.service';
import { useAuth } from './useAuth';
import { useSharedData } from './useSharedData';

export function useAmendments() {
  const { user } = useAuth();
  const { amendments, amendmentHistory } = useSharedData();

  const mine = useMemo(() => (user ? amendments.filter((a) => a.rmaId === user.id) : []), [amendments, user]);
  const pending = useMemo(() => amendments.filter((a) => a.status === 'Pending Approval'), [amendments]);

  const request = useCallback(
    async (reportId: string, reason: string) => {
      if (!user) throw new Error('You must be signed in.');
      return requestAmendment(user.id, reportId, reason);
    },
    [user],
  );
  const decide = useCallback(
    async (requestId: string, decision: 'Approved' | 'Rejected', comment: string) => {
      if (!user) throw new Error('You must be signed in.');
      return decideAmendment(user.id, requestId, decision, comment);
    },
    [user],
  );
  const complete = useCallback(
    async (requestId: string, totalExposure: number, availableStock: number) => {
      if (!user) throw new Error('You must be signed in.');
      return completeAmendment(user.id, requestId, totalExposure, availableStock);
    },
    [user],
  );

  return { all: amendments, mine, pending, history: amendmentHistory, request, decide, complete };
}
