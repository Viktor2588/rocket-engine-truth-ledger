import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { TruthBadge } from '@/components/shared/TruthBadge';
import { useEntity, useEntityFacts, useConflicts } from '@/hooks/useApi';
import { useTruthSlider } from '@/context/TruthSliderContext';
import { ArrowLeft, Rocket, AlertTriangle, ExternalLink } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export function EntityDetail() {
  const { id } = useParams<{ id: string }>();
  const { truthMin } = useTruthSlider();
  const { data: entity, isLoading: entityLoading } = useEntity(id!);
  const { data: facts, isLoading: factsLoading } = useEntityFacts(id!);
  const { data: conflicts } = useConflicts({ entityId: id, hasConflict: true });

  if (entityLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!entity) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Entity not found</p>
        <Link to="/entities">
          <Button variant="link">Back to entities</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/entities">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <Rocket className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{entity.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline">{entity.type}</Badge>
              {entity.aliases.length > 0 && (
                <span className="text-sm text-muted-foreground">
                  aka {entity.aliases.join(', ')}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      {entity.description && (
        <Card>
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{entity.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Conflicts Warning */}
      {conflicts && conflicts.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Active Conflicts ({conflicts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {conflicts.slice(0, 3).map((conflict) => (
                <Link
                  key={conflict.id}
                  to={`/conflicts/${conflict.id}`}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-destructive/10 transition-colors"
                >
                  <span>{conflict.attributeName || 'Unknown attribute'}</span>
                  <Badge variant="destructive">{conflict.claimCount} claims</Badge>
                </Link>
              ))}
              {conflicts.length > 3 && (
                <Link to={`/conflicts?entity=${id}`}>
                  <Button variant="link" className="p-0">
                    View all {conflicts.length} conflicts
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Facts Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Facts</span>
            <span className="text-sm font-normal text-muted-foreground">
              Showing facts with truth ≥ {(truthMin * 100).toFixed(0)}%
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {factsLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : facts && facts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Attribute</th>
                    <th className="text-left py-3 px-4 font-medium">Value</th>
                    <th className="text-left py-3 px-4 font-medium">Truth</th>
                    <th className="text-left py-3 px-4 font-medium">Source</th>
                    <th className="text-left py-3 px-4 font-medium">Claims</th>
                  </tr>
                </thead>
                <tbody>
                  {facts.map((fact, i) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-3 px-4 font-medium">{fact.attributeName}</td>
                      <td className="py-3 px-4">
                        {String(fact.bestValue)}
                        {fact.bestUnit && (
                          <span className="text-muted-foreground ml-1">
                            {fact.bestUnit}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <TruthBadge
                          score={fact.aggregatedTruth}
                          claimCount={fact.claimCount}
                        />
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {fact.sourceName}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="secondary">{fact.claimCount}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No facts found above the current truth threshold.
              Try lowering the Truth slider to see more facts.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Metadata */}
      {entity.metadata && Object.keys(entity.metadata).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Metadata</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4">
              {Object.entries(entity.metadata).map(([key, value]) => (
                <div key={key}>
                  <dt className="text-sm font-medium text-muted-foreground">{key}</dt>
                  <dd className="text-sm">
                    {typeof value === 'string' && value.startsWith('http') ? (
                      <a
                        href={value}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-1"
                      >
                        {value}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      String(value)
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      )}

      {/* Footer */}
      <div className="text-sm text-muted-foreground">
        Created: {formatDate(entity.createdAt)} | Updated: {formatDate(entity.updatedAt)}
      </div>
    </div>
  );
}
