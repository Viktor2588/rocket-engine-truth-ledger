import { useState } from 'react';
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
import { ClipboardList, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
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
            Items requiring manual review and resolution
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
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          ) : items && items.length > 0 ? (
            <div className="space-y-4">
              {items.map((item) => {
                const config = statusConfig[item.status];
                const StatusIcon = config.icon;

                return (
                  <div
                    key={item.id}
                    className={cn(
                      'p-4 rounded-lg border',
                      item.priority >= 8 && item.status === 'pending'
                        ? 'border-destructive/50 bg-destructive/5'
                        : 'bg-card'
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <StatusIcon className="h-4 w-4" />
                          <span className="font-medium">{item.reason}</span>
                          {item.priority >= 8 && (
                            <Badge variant="destructive">High Priority</Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Type: {item.itemType} | Created: {formatDate(item.createdAt)}
                        </div>
                        {item.notes && (
                          <div className="text-sm text-muted-foreground">
                            Notes: {item.notes}
                          </div>
                        )}
                        {item.resolvedAt && (
                          <div className="text-sm text-muted-foreground">
                            Resolved: {formatDate(item.resolvedAt)}
                            {item.resolvedBy && ` by ${item.resolvedBy}`}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={config.variant}>{config.label}</Badge>
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
