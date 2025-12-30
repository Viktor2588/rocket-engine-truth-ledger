import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { TruthBadge } from '@/components/shared/TruthBadge';
import { useConflict } from '@/hooks/useApi';
import { ArrowLeft, AlertTriangle, ExternalLink } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export function ConflictDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: conflict, isLoading } = useConflict(id!);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!conflict) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Conflict not found</p>
        <Link to="/conflicts">
          <Button variant="link">Back to conflicts</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/conflicts">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-8 w-8 text-destructive" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {conflict.attributeName || 'Conflict Details'}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={conflict.conflictPresent ? 'destructive' : 'secondary'}>
                {conflict.conflictPresent ? 'Active Conflict' : 'Resolved'}
              </Badge>
              <Badge variant="outline">{conflict.claimCount} claims</Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Entity Link */}
      {conflict.entityName && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-muted-foreground">Entity: </span>
                <span className="font-medium">{conflict.entityName}</span>
              </div>
              <Link to={`/entities/${conflict.entityId}`}>
                <Button variant="outline" size="sm">
                  View Entity
                  <ExternalLink className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Conflicting Claims */}
      <Card>
        <CardHeader>
          <CardTitle>Conflicting Claims</CardTitle>
        </CardHeader>
        <CardContent>
          {conflict.claims && conflict.claims.length > 0 ? (
            <div className="space-y-4">
              {conflict.claims.map((claim, index) => (
                <div
                  key={claim.id}
                  className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-semibold">
                          {String(claim.value)}
                          {claim.unit && (
                            <span className="text-muted-foreground ml-1">
                              {claim.unit}
                            </span>
                          )}
                        </span>
                        {claim.truthRaw !== null && (
                          <TruthBadge score={claim.truthRaw} />
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium">Source:</span> {claim.sourceName}
                        {claim.sourceDefaultTrust && (
                          <span className="ml-2">
                            (Trust: {(claim.sourceDefaultTrust * 100).toFixed(0)}%)
                          </span>
                        )}
                      </div>
                      {claim.confidence && (
                        <div className="text-sm text-muted-foreground">
                          <span className="font-medium">Confidence:</span>{' '}
                          {(claim.confidence * 100).toFixed(0)}%
                        </div>
                      )}
                      {claim.rawText && (
                        <div className="text-sm text-muted-foreground">
                          <span className="font-medium">Raw text:</span>{' '}
                          <span className="italic">"{claim.rawText}"</span>
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground">
                        Extracted: {formatDate(claim.extractedAt)}
                      </div>
                    </div>
                    <Badge variant="outline">Claim #{index + 1}</Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No claims found for this conflict
            </p>
          )}
        </CardContent>
      </Card>

      {/* Scope */}
      {conflict.scopeJson && Object.keys(conflict.scopeJson).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Scope</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4">
              {Object.entries(conflict.scopeJson).map(([key, value]) => (
                <div key={key}>
                  <dt className="text-sm font-medium text-muted-foreground">{key}</dt>
                  <dd className="text-sm">{String(value)}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      )}

      {/* Footer */}
      <div className="text-sm text-muted-foreground">
        Created: {formatDate(conflict.createdAt)} | Updated: {formatDate(conflict.updatedAt)}
      </div>
    </div>
  );
}
