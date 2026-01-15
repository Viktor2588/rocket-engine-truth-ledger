import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TruthBadge } from '@/components/shared/TruthBadge';
import { useEntityFacts } from '@/hooks/useApi';
import { Rocket, ChevronRight, ChevronDown, ExternalLink } from 'lucide-react';
import type { Entity } from '@/lib/types';

interface EntityCardProps {
  entity: Entity;
}

export function EntityCard({ entity }: EntityCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Only fetch facts when expanded to avoid unnecessary API calls
  const { data: facts, isLoading: factsLoading } = useEntityFacts(
    isExpanded ? entity.id : ''
  );

  return (
    <Card className="transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">{entity.name}</CardTitle>
          </div>
          <div className="flex items-center gap-1">
            <Link to={`/entities/${entity.id}`} onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline">{entity.type}</Badge>
            {entity.aliases.length > 0 && (
              <span className="text-sm text-muted-foreground">
                aka {entity.aliases.slice(0, 2).join(', ')}
                {entity.aliases.length > 2 && ` +${entity.aliases.length - 2}`}
              </span>
            )}
          </div>
          {entity.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {entity.description}
            </p>
          )}

          {/* Facts Section */}
          {isExpanded && (
            <div className="pt-3 border-t">
              <h4 className="text-sm font-medium mb-2">Facts</h4>
              {factsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-6 w-full" />
                  ))}
                </div>
              ) : facts && facts.length > 0 ? (
                <div className="space-y-2">
                  {facts.slice(0, 5).map((fact, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-sm py-1 px-2 rounded bg-muted/50"
                    >
                      <span className="font-medium text-muted-foreground truncate max-w-[40%]">
                        {fact.attributeName}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="truncate max-w-[120px]">
                          {String(fact.bestValue)}
                          {fact.bestUnit && (
                            <span className="text-muted-foreground ml-1">
                              {fact.bestUnit}
                            </span>
                          )}
                        </span>
                        <TruthBadge
                          score={fact.aggregatedTruth}
                          claimCount={fact.claimCount}
                        />
                      </div>
                    </div>
                  ))}
                  {facts.length > 5 && (
                    <Link
                      to={`/entities/${entity.id}`}
                      className="block text-xs text-primary hover:underline text-center pt-1"
                    >
                      View all {facts.length} facts
                    </Link>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-2">
                  No facts available
                </p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
