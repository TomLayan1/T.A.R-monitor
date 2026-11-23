import type { SubmissionState } from '../../types/submission';
import { tarLabel, tarTone } from '../../utils/tar-colours';
import { Badge } from '../ui/Badge';

export function TarStatusBadge({ value }: { value: number }) {
  return <Badge tone={tarTone(value)}>{tarLabel(value)}</Badge>;
}

export function SubmissionBadge({ state }: { state: SubmissionState }) {
  const tone = state === 'Submitted' ? 'green' : state === 'Pending' ? 'amber' : 'rose';
  return <Badge tone={tone}>{state}</Badge>;
}
