import { Rocket, FileText, Database, AlertTriangle, ClipboardList, CheckCircle } from 'lucide-react';
import { StatCard } from '@/components/shared/StatCard';
import { EntityCard } from '@/components/shared/EntityCard';
import { ConflictCard } from '@/components/shared/ConflictCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useStats, useEntities, useConflicts, useReviewQueueStats } from '@/hooks/useApi';

export function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useStats();
  const { data: entities, isLoading: entitiesLoading } = useEntities({ limit: 4, type: 'engine' });
  const { data: conflicts, isLoading: conflictsLoading } = useConflicts({ hasConflict: true, limit: 4 });
  const { data: reviewStats, isLoading: reviewLoading } = useReviewQueueStats();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your rocket engine knowledge base
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsLoading ? (
          <>
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </>
        ) : (
          <>
            <StatCard
              title="Total Entities"
              value={stats?.entityCount ?? 0}
              icon={Rocket}
              description="Rocket engines & components"
            />
            <StatCard
              title="Total Claims"
              value={stats?.claimCount ?? 0}
              icon={FileText}
              description="From all sources"
            />
            <StatCard
              title="Active Conflicts"
              value={stats?.conflictCount ?? 0}
              icon={AlertTriangle}
              description="Requiring resolution"
            />
            <StatCard
              title="Pending Reviews"
              value={reviewStats?.pendingCount ?? 0}
              icon={ClipboardList}
              description={
                reviewStats?.highPriorityCount
                  ? `${reviewStats.highPriorityCount} high priority`
                  : 'In review queue'
              }
            />
          </>
        )}
      </div>

      {/* Additional Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        {statsLoading || reviewLoading ? (
          <>
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </>
        ) : (
          <>
            <StatCard
              title="Sources"
              value={stats?.sourceCount ?? 0}
              icon={Database}
              description="Knowledge sources"
            />
            <StatCard
              title="Derived Facts"
              value={stats?.factCount ?? 0}
              icon={CheckCircle}
              description="Verified facts"
            />
            <StatCard
              title="Avg Resolution Time"
              value={
                reviewStats?.avgResolutionHours
                  ? `${reviewStats.avgResolutionHours.toFixed(1)}h`
                  : 'N/A'
              }
              icon={ClipboardList}
              description="For review items"
            />
          </>
        )}
      </div>

      {/* Recent Entities */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Engines</CardTitle>
        </CardHeader>
        <CardContent>
          {entitiesLoading ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </div>
          ) : entities && entities.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {entities.map((entity) => (
                <EntityCard key={entity.id} entity={entity} />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No entities found</p>
          )}
        </CardContent>
      </Card>

      {/* Active Conflicts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Active Conflicts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {conflictsLoading ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </div>
          ) : conflicts && conflicts.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {conflicts.map((conflict) => (
                <ConflictCard key={conflict.id} conflict={conflict} />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No active conflicts</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
