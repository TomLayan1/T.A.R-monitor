import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { formatNaira } from '../../utils/currency';
import { netEffectClass, netEffectLabel, netEffectLevel } from '../../utils/net-effect';

/** Net Effect amount with its movement treatment (positive red, negative green, zero neutral). */
export function NetEffectValue({ value, showLabel = false, className = '' }: { value: number; showLabel?: boolean; className?: string }) {
  const level = netEffectLevel(value);
  const Icon = level === 'positive' ? ArrowUpRight : level === 'negative' ? ArrowDownRight : Minus;
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-semibold ${netEffectClass(value)} ${className}`} title={netEffectLabel(value)}>
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {formatNaira(value)}
      {showLabel && <span className="ml-1 text-xs font-medium">{netEffectLabel(value)}</span>}
      <span className="sr-only">{netEffectLabel(value)}</span>
    </span>
  );
}
