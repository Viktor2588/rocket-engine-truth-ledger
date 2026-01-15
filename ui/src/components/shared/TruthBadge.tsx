import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { getTruthLabel } from '@/lib/utils';

interface TruthBadgeProps {
  score: number;
  showScore?: boolean;
  claimCount?: number;
}

export function TruthBadge({ score, showScore = true, claimCount }: TruthBadgeProps) {
  const variant = score < 0.3 ? 'truth_low' : score < 0.7 ? 'truth_medium' : 'truth_high';
  const label = getTruthLabel(score);

  const content = (
    <Badge variant={variant}>
      {showScore ? `${(score * 100).toFixed(0)}%` : label}
    </Badge>
  );

  if (claimCount !== undefined) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent>
          <p>
            Truth: {(score * 100).toFixed(1)}% ({label})
          </p>
          <p className="text-xs text-muted-foreground">
            Based on {claimCount} claim{claimCount !== 1 ? 's' : ''}
          </p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
}
