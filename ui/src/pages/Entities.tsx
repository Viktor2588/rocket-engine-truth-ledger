import { useState } from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EntityCard } from '@/components/shared/EntityCard';
import { Skeleton } from '@/components/ui/skeleton';
import { useEntities } from '@/hooks/useApi';
import { Search } from 'lucide-react';

export function Entities() {
  const [type, setType] = useState<string>('all');
  const [search, setSearch] = useState('');

  const { data: entities, isLoading } = useEntities({
    type: type === 'all' ? undefined : type,
    name: search || undefined,
    limit: 50,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Entities</h1>
        <p className="text-muted-foreground">
          Browse rocket engines, components, and other entities
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="engine">Engines</SelectItem>
            <SelectItem value="component">Components</SelectItem>
            <SelectItem value="manufacturer">Manufacturers</SelectItem>
            <SelectItem value="vehicle">Vehicles</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Entity Grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : entities && entities.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {entities.map((entity) => (
            <EntityCard key={entity.id} entity={entity} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No entities found</p>
          {search && (
            <p className="text-sm text-muted-foreground mt-2">
              Try adjusting your search or filters
            </p>
          )}
        </div>
      )}
    </div>
  );
}
