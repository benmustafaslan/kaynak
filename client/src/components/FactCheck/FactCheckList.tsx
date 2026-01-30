import type { FactCheck } from '../../utils/factChecksApi';

const STATUS_STYLES: Record<FactCheck['status'], string> = {
  pending: 'bg-[#fff9e6] border-app-yellow/40 text-[#b88400]',
  verified: 'bg-[#e8f5f1] border-app-green/40 text-app-green',
  disputed: 'bg-[#ffe8e8] border-app-red/40 text-app-red',
};

interface FactCheckListProps {
  factChecks: FactCheck[];
  onSelect?: (fc: FactCheck) => void;
}

export function FactCheckList({ factChecks, onSelect }: FactCheckListProps) {
  if (factChecks.length === 0) {
    return (
      <p className="text-app-text-secondary text-sm">
        No fact-checks yet. Select text in the script and click Add Fact-Check.
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {factChecks.map((fc) => (
        <li
          key={fc._id}
          className={`flex cursor-pointer items-center gap-2 rounded border px-3 py-2 text-sm transition-opacity duration-[120ms] hover:opacity-90 ${STATUS_STYLES[fc.status]}`}
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
