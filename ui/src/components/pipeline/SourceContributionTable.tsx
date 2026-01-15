import { useState } from 'react';
import {
  Database,
  FileText,
  MessageSquare,
  Link2,
  ChevronDown,
  ChevronUp,
  Activity,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useSourcePipelineStats } from '@/hooks/useApi';
import type { SourceWithPipelineStats } from '@/lib/types';

type SortField = 'name' | 'documents' | 'snippets' | 'claims' | 'evidence' | 'baseTrust';
type SortDirection = 'asc' | 'desc';

export function SourceContributionTable() {
  const { data, isLoading, error } = useSourcePipelineStats();
  const [sortField, setSortField] = useState<SortField>('documents');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [showInactive, setShowInactive] = useState(false);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ChevronUp className="inline h-4 w-4" />
    ) : (
      <ChevronDown className="inline h-4 w-4" />
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Source Contributions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardContent className="pt-6">
          <p className="text-red-600">Failed to load source statistics</p>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const filteredSources = showInactive
    ? data.sources
    : data.sources.filter((s) => s.isActive);

  const sortedSources = [...filteredSources].sort((a, b) => {
    let aVal: number | string;
    let bVal: number | string;

    switch (sortField) {
      case 'name':
        aVal = a.name.toLowerCase();
        bVal = b.name.toLowerCase();
        break;
      case 'documents':
        aVal = a.stats.documents;
        bVal = b.stats.documents;
        break;
      case 'snippets':
        aVal = a.stats.snippets;
        bVal = b.stats.snippets;
        break;
      case 'claims':
        aVal = a.stats.claims;
        bVal = b.stats.claims;
        break;
      case 'evidence':
        aVal = a.stats.evidence;
        bVal = b.stats.evidence;
        break;
      case 'baseTrust':
        aVal = a.baseTrust;
        bVal = b.baseTrust;
        break;
      default:
        return 0;
    }

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const maxDocs = Math.max(...data.sources.map((s) => s.stats.documents), 1);
  const maxSnippets = Math.max(...data.sources.map((s) => s.stats.snippets), 1);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Source Contributions
          </CardTitle>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="rounded"
              />
              Show inactive
            </label>
            <div className="text-sm text-muted-foreground">
              {filteredSources.length} sources
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary Row */}
        <div className="grid grid-cols-5 gap-4 mb-4 p-3 bg-muted/50 rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{data.totals.documents}</div>
            <div className="text-xs text-muted-foreground">Total Documents</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{data.totals.snippets}</div>
            <div className="text-xs text-muted-foreground">Total Snippets</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{data.totals.claims}</div>
            <div className="text-xs text-muted-foreground">Total Claims</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{data.totals.evidence}</div>
            <div className="text-xs text-muted-foreground">Total Evidence</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600">{data.sources.length}</div>
            <div className="text-xs text-muted-foreground">Sources</div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th
                  className="text-left py-2 px-2 cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('name')}
                >
                  Source <SortIcon field="name" />
                </th>
                <th
                  className="text-center py-2 px-2 cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('baseTrust')}
                >
                  Trust <SortIcon field="baseTrust" />
                </th>
                <th
                  className="text-center py-2 px-2 cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('documents')}
                >
                  <FileText className="inline h-4 w-4 mr-1" />
                  Docs <SortIcon field="documents" />
                </th>
                <th
                  className="text-center py-2 px-2 cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('snippets')}
                >
                  <MessageSquare className="inline h-4 w-4 mr-1" />
                  Snippets <SortIcon field="snippets" />
                </th>
                <th
                  className="text-center py-2 px-2 cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('claims')}
                >
                  Claims <SortIcon field="claims" />
                </th>
                <th
                  className="text-center py-2 px-2 cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('evidence')}
                >
                  <Link2 className="inline h-4 w-4 mr-1" />
                  Evidence <SortIcon field="evidence" />
                </th>
                <th className="text-center py-2 px-2">
                  <Activity className="inline h-4 w-4 mr-1" />
                  Last Activity
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedSources.map((source) => (
                <SourceRow
                  key={source.id}
                  source={source}
                  maxDocs={maxDocs}
                  maxSnippets={maxSnippets}
                  formatDate={formatDate}
                />
              ))}
            </tbody>
          </table>
        </div>

        {sortedSources.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No sources found
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SourceRow({
  source,
  maxDocs,
  maxSnippets,
  formatDate,
}: {
  source: SourceWithPipelineStats;
  maxDocs: number;
  maxSnippets: number;
  formatDate: (date: string | null) => string;
}) {
  const docsPercent = (source.stats.documents / maxDocs) * 100;
  const snippetsPercent = (source.stats.snippets / maxSnippets) * 100;

  const trustColor =
    source.baseTrust >= 0.8
      ? 'text-green-600'
      : source.baseTrust >= 0.5
        ? 'text-yellow-600'
        : 'text-red-600';

  return (
    <tr className={`border-b hover:bg-muted/30 ${!source.isActive ? 'opacity-50' : ''}`}>
      <td className="py-2 px-2">
        <div className="flex items-center gap-2">
          <span className="font-medium">{source.name}</span>
          {!source.isActive && (
            <Badge variant="outline" className="text-xs">
              Inactive
            </Badge>
          )}
        </div>
        <div className="text-xs text-muted-foreground capitalize">
          {source.sourceType.replace(/_/g, ' ')}
        </div>
      </td>
      <td className="py-2 px-2 text-center">
        <span className={`font-mono ${trustColor}`}>
          {(source.baseTrust * 100).toFixed(0)}%
        </span>
      </td>
      <td className="py-2 px-2">
        <div className="flex items-center gap-2">
          <Progress value={docsPercent} className="h-2 w-16" />
          <span className="font-mono text-xs w-8 text-right">{source.stats.documents}</span>
        </div>
      </td>
      <td className="py-2 px-2">
        <div className="flex items-center gap-2">
          <Progress value={snippetsPercent} className="h-2 w-16" />
          <span className="font-mono text-xs w-10 text-right">{source.stats.snippets}</span>
        </div>
      </td>
      <td className="py-2 px-2 text-center font-mono text-xs">
        {source.stats.claims}
      </td>
      <td className="py-2 px-2 text-center font-mono text-xs">
        {source.stats.evidence}
      </td>
      <td className="py-2 px-2 text-center text-xs text-muted-foreground">
        {formatDate(source.recentActivity.lastDocumentAt)}
      </td>
    </tr>
  );
}
