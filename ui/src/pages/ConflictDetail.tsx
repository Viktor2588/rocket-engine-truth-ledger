import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { TruthBadge } from '@/components/shared/TruthBadge';
import { useConflict } from '@/hooks/useApi';
import { ArrowLeft, AlertTriangle, ExternalLink, FileText, Quote, ChevronDown, ChevronUp } from 'lucide-react';
import { formatDate, cn } from '@/lib/utils';
import type { ClaimWithDetails } from '@/lib/types';
import { useState } from 'react';

interface ValueGroup {
  value: number | string;
  claims: ClaimWithDetails[];
  sources: Map<string, { name: string; trust: number; count: number }>;
  totalEvidence: number;
  avgTruth: number | null;
}

function groupClaimsByValue(claims: ClaimWithDetails[]): ValueGroup[] {
  const groups = new Map<string, ValueGroup>();

  for (const claim of claims) {
    const value = claim.valueJson?.value ?? claim.value;
    const valueKey = String(value);

    if (!groups.has(valueKey)) {
      groups.set(valueKey, {
        value,
        claims: [],
        sources: new Map(),
        totalEvidence: 0,
        avgTruth: null,
      });
    }

    const group = groups.get(valueKey)!;
    group.claims.push(claim);
    group.totalEvidence++;

    // Track sources
    const sourceKey = claim.sourceName || 'Unknown';
    if (!group.sources.has(sourceKey)) {
      group.sources.set(sourceKey, {
        name: sourceKey,
        trust: claim.sourceDefaultTrust || 0,
        count: 0,
      });
    }
    group.sources.get(sourceKey)!.count++;
  }

  // Calculate average truth scores
  for (const group of groups.values()) {
    const truthScores = group.claims
      .map((c) => c.truthRaw)
      .filter((t): t is number => t !== null);
    if (truthScores.length > 0) {
      group.avgTruth = truthScores.reduce((a, b) => a + b, 0) / truthScores.length;
    }
  }

  // Sort by evidence count (descending)
  return Array.from(groups.values()).sort((a, b) => b.totalEvidence - a.totalEvidence);
}

function ValueGroupCard({ group, unit, isWinner }: { group: ValueGroup; unit: string | null; isWinner: boolean }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className={cn(
      'transition-all',
      isWinner && 'ring-2 ring-green-500 bg-green-50/50'
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-2xl font-bold">
              {typeof group.value === 'number'
                ? group.value.toLocaleString()
                : String(group.value)}
              {unit && <span className="text-lg text-muted-foreground ml-2">{unit}</span>}
            </CardTitle>
            <CardDescription className="mt-1">
              {group.totalEvidence} evidence {group.totalEvidence === 1 ? 'item' : 'items'} from{' '}
              {group.sources.size} {group.sources.size === 1 ? 'source' : 'sources'}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {isWinner && (
              <Badge variant="default" className="bg-green-600">
                Most Supported
              </Badge>
            )}
            {group.avgTruth !== null && <TruthBadge score={group.avgTruth} />}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Source breakdown */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Sources Supporting This Value</h4>
          <div className="grid gap-2">
            {Array.from(group.sources.values())
              .sort((a, b) => b.trust - a.trust)
              .map((source) => (
                <div
                  key={source.name}
                  className="flex items-center justify-between px-3 py-2 rounded-md bg-muted/50"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{source.name}</span>
                    <Badge variant="outline" className="text-xs">
                      Trust: {(source.trust * 100).toFixed(0)}%
                    </Badge>
                  </div>
                  <Badge variant="secondary">{source.count} claims</Badge>
                </div>
              ))}
          </div>
        </div>

        {/* Expandable evidence list */}
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-between"
            onClick={() => setExpanded(!expanded)}
          >
            <span className="text-sm font-medium">View Evidence Details</span>
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>

          {expanded && (
            <div className="mt-3 space-y-3">
              {group.claims.map((claim, idx) => (
                <div
                  key={`${claim.id}-${idx}`}
                  className="p-3 rounded-md border bg-card text-sm space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-muted-foreground">
                      {claim.sourceName || 'Unknown Source'}
                    </span>
                    {claim.confidence && (
                      <Badge variant="outline">
                        Confidence: {(Number(claim.confidence) * 100).toFixed(0)}%
                      </Badge>
                    )}
                  </div>

                  {claim.quote && (
                    <div className="flex gap-2 text-muted-foreground">
                      <Quote className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      <span className="italic">"{claim.quote}"</span>
                    </div>
                  )}

                  {claim.rawText && !claim.quote && (
                    <div className="text-muted-foreground text-xs bg-muted/30 p-2 rounded">
                      <span className="font-medium">Source text: </span>
                      {claim.rawText.length > 200
                        ? claim.rawText.slice(0, 200) + '...'
                        : claim.rawText}
                    </div>
                  )}

                  {claim.documentUrl && (
                    <a
                      href={claim.documentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      {claim.documentTitle || 'View Source'}
                    </a>
                  )}

                  <div className="text-xs text-muted-foreground">
                    Extracted: {formatDate(claim.extractedAt)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function ConflictDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: conflict, isLoading } = useConflict(id!);

  const valueGroups = useMemo(() => {
    if (!conflict?.claims) return [];
    return groupClaimsByValue(conflict.claims);
  }, [conflict?.claims]);

  const unit = conflict?.claims?.[0]?.unit || null;

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
              {conflict.entityName || 'Unknown Entity'}
              <span className="text-muted-foreground mx-2">→</span>
              <span className="text-primary">{conflict.attributeName || 'Unknown Attribute'}</span>
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={conflict.conflictPresent ? 'destructive' : 'secondary'}>
                {conflict.conflictPresent ? 'Active Conflict' : 'Resolved'}
              </Badge>
              <Badge variant="outline">{valueGroups.length} distinct values</Badge>
              <Badge variant="outline">{conflict.claims?.length || 0} total evidence</Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Conflict Summary */}
      <Card className="border-orange-200 bg-orange-50/50">
        <CardHeader>
          <CardTitle className="text-lg">Conflict Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <div className="text-sm text-muted-foreground">Distinct Values</div>
              <div className="text-2xl font-bold">{valueGroups.length}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Total Evidence</div>
              <div className="text-2xl font-bold">{conflict.claims?.length || 0}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Sources Involved</div>
              <div className="text-2xl font-bold">
                {new Set(conflict.claims?.map((c) => c.sourceName)).size}
              </div>
            </div>
          </div>

          {valueGroups.length >= 2 && (
            <div className="mt-4 p-3 rounded-md bg-white/50">
              <h4 className="font-medium mb-2">Assessment</h4>
              <p className="text-sm text-muted-foreground">
                {valueGroups[0].totalEvidence > valueGroups[1].totalEvidence * 2 ? (
                  <>
                    <span className="text-green-700 font-medium">Clear winner: </span>
                    The value{' '}
                    <span className="font-mono font-bold">
                      {String(valueGroups[0].value)}
                    </span>{' '}
                    has {valueGroups[0].totalEvidence} supporting claims, significantly more than
                    the next value ({valueGroups[1].totalEvidence} claims).
                  </>
                ) : (
                  <>
                    <span className="text-orange-700 font-medium">No clear winner: </span>
                    Multiple values have comparable evidence. The top value has{' '}
                    {valueGroups[0].totalEvidence} claims while the second has{' '}
                    {valueGroups[1].totalEvidence}. Manual review recommended.
                  </>
                )}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scope */}
      {conflict.scopeJson && Object.keys(conflict.scopeJson).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Scope Context</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(conflict.scopeJson).map(([key, value]) => (
                <Badge key={key} variant="secondary">
                  {key}: {String(value)}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Value Groups */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Conflicting Values</h2>
        {valueGroups.map((group, index) => (
          <ValueGroupCard
            key={String(group.value)}
            group={group}
            unit={unit}
            isWinner={index === 0 && valueGroups.length > 1}
          />
        ))}
      </div>

      {/* Entity Link */}
      {conflict.entityId && (
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            Created: {formatDate(conflict.createdAt)} | Updated: {formatDate(conflict.updatedAt)}
          </div>
          <Link to={`/entities/${conflict.entityId}`}>
            <Button variant="outline" size="sm">
              View Entity
              <ExternalLink className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
