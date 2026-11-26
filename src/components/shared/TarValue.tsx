import { formatNaira } from '../../utils/currency';
import { tarLevel, tarTextClass } from '../../utils/tar-colours';

/** Renders a TAR amount using the shared classification (positive red + light red background). */
export function TarValue({ value, className = '' }: { value: number; className?: string }) {
  const highlighted = tarLevel(value) !== 'zero';
  return <span className={`font-medium ${highlighted ? 'inline-block rounded-md px-2 py-0.5' : ''} ${tarTextClass(value)} ${className}`}>{formatNaira(value)}</span>;
}
