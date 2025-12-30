import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConflictCard } from '@/components/shared/ConflictCard';
import { Skeleton } from '@/components/ui/skeleton';
import { useConflicts } from '@/hooks/useApi';
import { AlertTriangle } from 'lucide-react';

export function Conflicts() {
  const [filter, setFilter] = useState<string>('active');

  const { data: conflicts, isLoading } = useConflicts({
    hasConflict: filter === 'active' ? true : filter === 'resolved' ? false : undefined,
    limit: 50,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-8 w-8 text-destructive" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Conflicts</h1>
          <p className="text-muted-foreground">
            Review and resolve conflicting claims
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter conflicts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Conflicts</SelectItem>
            <SelectItem value="active">Active Only</SelectItem>
            <SelectItem value="resolved">Resolved Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Conflicts Grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : conflicts && conflicts.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {conflicts.map((conflict) => (
            <ConflictCard key={conflict.id} conflict={conflict} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No conflicts found</p>
          {filter !== 'all' && (
            <p className="text-sm text-muted-foreground mt-2">
              Try changing the filter to see more
            </p>
          )}
        </div>
      )}
    </div>
  );
}
