import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/shared/StatCard';
import { useReviewQueue, useReviewQueueStats, useUpdateReviewItem } from '@/hooks/useApi';
import { ClipboardList, Clock, CheckCircle, XCircle, AlertCircle, AlertTriangle, ExternalLink } from 'lucide-react';
import { formatDate, cn } from '@/lib/utils';
import type { ReviewQueueItem } from '@/lib/types';

const statusConfig: Record<
  ReviewQueueItem['status'],
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof Clock }
> = {
  pending: { label: 'Pending', variant: 'default', icon: Clock },
  in_review: { label: 'In Review', variant: 'secondary', icon: AlertCircle },
  resolved: { label: 'Resolved', variant: 'outline', icon: CheckCircle },
  dismissed: { label: 'Dismissed', variant: 'destructive', icon: XCircle },
};

interface ConflictNotes {
  valueGroups?: number;
  uniqueValues?: number[];
  evidenceAnalysis?: {
    clearWinner: boolean;
    evidenceCounts: number[];
  };
}

function parseNotes(notes: string | null): ConflictNotes | null {
  if (!notes) return null;
  try {
    return JSON.parse(notes);
  } catch {
    return null;
  }
}

function getConflictSeverity(notes: ConflictNotes | null): { level: 'low' | 'medium' | 'high' | 'critical'; label: string; color: string } {
  if (!notes || !notes.valueGroups) {
    return { level: 'low', label: 'Unknown', color: 'text-muted-foreground' };
  }

  const groups = notes.valueGroups;
  if (groups >= 10) {
    return { level: 'critical', label: `${groups} distinct values`, color: 'text-red-600' };
  } else if (groups >= 5) {
    return { level: 'high', label: `${groups} distinct values`, color: 'text-orange-500' };
  } else if (groups >= 3) {
    return { level: 'medium', label: `${groups} distinct values`, color: 'text-yellow-600' };
  } else {
    return { level: 'low', label: `${groups} distinct values`, color: 'text-green-600' };
  }
}

function formatScope(scopeJson: Record<string, unknown> | null): string {
  if (!scopeJson || Object.keys(scopeJson).length === 0) return '';
  return Object.entries(scopeJson)
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ');
}

export function ReviewQueue() {
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const { data: stats, isLoading: statsLoading } = useReviewQueueStats();
  const { data: items, isLoading: itemsLoading } = useReviewQueue({
    status: statusFilter === 'all' ? undefined : statusFilter,
    limit: 50,
  });
  const updateMutation = useUpdateReviewItem();

  const handleStatusChange = (id: string, newStatus: ReviewQueueItem['status']) => {
    updateMutation.mutate({ id, data: { status: newStatus } });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ClipboardList className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Review Queue</h1>
          <p className="text-muted-foreground">
            Conflicts requiring manual review and resolution
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        {statsLoading ? (
          <>
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </>
        ) : (
          <>
            <StatCard
              title="Pending"
              value={stats?.pendingCount ?? 0}
              icon={Clock}
              description={`${stats?.highPriorityCount ?? 0} high priority`}
            />
            <StatCard
              title="In Review"
              value={stats?.inReviewCount ?? 0}
              icon={AlertCircle}
            />
            <StatCard
              title="Resolved"
              value={stats?.resolvedCount ?? 0}
              icon={CheckCircle}
            />
            <StatCard
              title="Dismissed"
              value={stats?.dismissedCount ?? 0}
              icon={XCircle}
            />
          </>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_review">In Review</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="dismissed">Dismissed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Review Items */}
      <Card>
        <CardHeader>
          <CardTitle>Review Items</CardTitle>
        </CardHeader>
        <CardContent>
          {itemsLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : items && items.length > 0 ? (
            <div className="space-y-4">
              {items.map((item) => {
                const config = statusConfig[item.status];
                const StatusIcon = config.icon;
                const notes = parseNotes(item.notes);
                const severity = getConflictSeverity(notes);
                const entityName = (item as unknown as { entityName?: string }).entityName;
                const attributeName = (item as unknown as { attributeName?: string }).attributeName;
                const claimCount = (item as unknown as { claimCount?: number }).claimCount;
                const scopeJson = (item as unknown as { scopeJson?: Record<string, unknown> }).scopeJson;
                const scope = formatScope(scopeJson ?? null);

                return (
                  <div
                    key={item.id}
                    className={cn(
                      'p-4 rounded-lg border transition-colors hover:bg-muted/50',
                      item.priority >= 8 && item.status === 'pending'
                        ? 'border-destructive/50 bg-destructive/5'
                        : severity.level === 'critical'
                        ? 'border-red-300 bg-red-50/50'
                        : severity.level === 'high'
                        ? 'border-orange-300 bg-orange-50/50'
                        : 'bg-card'
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2 flex-1">
                        {/* Entity + Attribute Header */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {entityName ? (
                            <>
                              <span className="font-semibold text-lg">{entityName}</span>
                              <span className="text-muted-foreground">→</span>
                              <span className="font-medium text-primary">{attributeName || 'Unknown'}</span>
                            </>
                          ) : (
                            <span className="font-medium">{item.reason}</span>
                          )}
                          {scope && (
                            <Badge variant="outline" className="text-xs">
                              {scope}
                            </Badge>
                          )}
                          {item.priority >= 8 && (
                            <Badge variant="destructive">High Priority</Badge>
                          )}
                        </div>

                        {/* Conflict Severity */}
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1.5">
                            <AlertTriangle className={cn('h-4 w-4', severity.color)} />
                            <span className={severity.color}>{severity.label}</span>
                          </div>
                          {claimCount && (
                            <span className="text-muted-foreground">
                              {claimCount} total claims
                            </span>
                          )}
                          {notes?.evidenceAnalysis && (
                            <span className="text-muted-foreground">
                              {notes.evidenceAnalysis.clearWinner
                                ? '✓ Clear winner'
                                : '⚠ No clear winner'}
                            </span>
                          )}
                        </div>

                        {/* Meta info */}
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>Created: {formatDate(item.createdAt)}</span>
                          {item.resolvedAt && (
                            <span>
                              Resolved: {formatDate(item.resolvedAt)}
                              {item.resolvedBy && ` by ${item.resolvedBy}`}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge variant={config.variant} className="flex items-center gap-1">
                          <StatusIcon className="h-3 w-3" />
                          {config.label}
                        </Badge>

                        {item.itemType === 'conflict_group' && (
                          <Link to={`/conflicts/${item.itemId}`}>
                            <Button size="sm" variant="outline">
                              <ExternalLink className="h-3 w-3 mr-1" />
                              View
                            </Button>
                          </Link>
                        )}

                        {item.status === 'pending' && (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStatusChange(item.id, 'in_review')}
                              disabled={updateMutation.isPending}
                            >
                              Review
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleStatusChange(item.id, 'dismissed')}
                              disabled={updateMutation.isPending}
                            >
                              Dismiss
                            </Button>
                          </div>
                        )}
                        {item.status === 'in_review' && (
                          <Button
                            size="sm"
                            onClick={() => handleStatusChange(item.id, 'resolved')}
                            disabled={updateMutation.isPending}
                          >
                            Resolve
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No items in the review queue</p>
              {statusFilter !== 'all' && (
                <p className="text-sm text-muted-foreground mt-2">
                  Try changing the filter to see more
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
