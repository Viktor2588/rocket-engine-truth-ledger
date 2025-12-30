import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Rocket, ChevronRight } from 'lucide-react';
import type { Entity } from '@/lib/types';

interface EntityCardProps {
  entity: Entity;
}

export function EntityCard({ entity }: EntityCardProps) {
  return (
    <Link to={`/entities/${entity.id}`}>
      <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Rocket className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">{entity.name}</CardTitle>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
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
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
