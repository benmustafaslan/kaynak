import type { Story } from '../../types/story';
import { isOverdue } from './workflowUtils';

interface WorkflowMetricsProps {
  stories: Story[];
}

export function WorkflowMetrics({ stories }: WorkflowMetricsProps) {
  const overdueCount = stories.filter((s) => isOverdue(s)).length;

  if (overdueCount === 0) return null;

  return (
    <div className="workflow-metrics" role="region" aria-label="Workflow metrics">
      <div className="metric-card warning">
        <span className="metric-label">Overdue</span>
        <span className="metric-value">{overdueCount}</span>
      </div>
    </div>
  );
}
