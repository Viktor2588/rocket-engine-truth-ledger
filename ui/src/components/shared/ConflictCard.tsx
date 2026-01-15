import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import type { ConflictGroup } from '@/lib/types';

interface ConflictCardProps {
  conflict: ConflictGroup;
}

export function ConflictCard({ conflict }: ConflictCardProps) {
  return (
    <Link to={`/conflicts/${conflict.id}`}>
      <Card className="hover:bg-muted/50 transition-colors cursor-pointer border-destructive/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <CardTitle className="text-lg">
                {conflict.attributeName || 'Unknown Attribute'}
              </CardTitle>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant={conflict.conflictPresent ? 'destructive' : 'secondary'}>
                {conflict.conflictPresent ? 'Conflict' : 'Resolved'}
              </Badge>
              <Badge variant="outline">{conflict.claimCount} claims</Badge>
            </div>
            {conflict.entityName && (
              <p className="text-sm text-muted-foreground">
                Entity: {conflict.entityName}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
