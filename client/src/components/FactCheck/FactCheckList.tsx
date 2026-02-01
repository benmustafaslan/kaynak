import type { FactCheck } from '../../utils/factChecksApi';

const STATUS_STYLES: Record<FactCheck['status'], string> = {
  pending: 'bg-amber-900/30 border-amber-700/50 text-amber-300',
  verified: 'bg-emerald-900/30 border-emerald-700/50 text-emerald-300',
  disputed: 'bg-red-900/30 border-red-800/50 text-red-300',
};

interface FactCheckListProps {
  factChecks: FactCheck[];
  onSelect?: (fc: FactCheck) => void;
  compact?: boolean;
}

export function FactCheckList({ factChecks, onSelect, compact }: FactCheckListProps) {
  if (factChecks.length === 0) {
    return (
      <p className={compact ? 'text-app-text-tertiary text-xs' : 'text-app-text-secondary text-sm'}>
        No fact-checks yet. Select text in the script and click Add Fact-Check.
      </p>
    );
  }
  return (
    <ul className={compact ? 'space-y-0.5' : 'space-y-2'}>
      {factChecks.map((fc) => (
        <li
          key={fc._id}
          className={`flex cursor-pointer items-center gap-1.5 rounded border transition-opacity duration-[120ms] hover:opacity-90 ${compact ? 'px-1.5 py-0.5 text-xs' : 'px-3 py-2 text-sm'} ${STATUS_STYLES[fc.status]}`}
          onClick={() => onSelect?.(fc)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onSelect?.(fc)}
        >
          <span className="font-medium">{fc.type}</span>
          <span>·</span>
          <span className="line-clamp-1 flex-1 min-w-0">
            {fc.textSelection.text.slice(0, 60)}{fc.textSelection.text.length > 60 ? '…' : ''}
          </span>
          <span className="text-xs opacity-80">({fc.status})</span>
        </li>
      ))}
    </ul>
  );
}
