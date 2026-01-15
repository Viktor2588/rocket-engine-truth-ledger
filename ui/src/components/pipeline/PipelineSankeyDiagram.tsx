import { useState, useMemo } from 'react';
import {
  ArrowRight,
  Database,
  FileText,
  MessageSquare,
  Lightbulb,
  Link2,
  Info,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useSourcePipelineStats } from '@/hooks/useApi';

interface FlowNode {
  id: string;
  label: string;
  count: number;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

interface FlowLink {
  from: string;
  to: string;
  value: number;
  percentage: number;
}

export function PipelineSankeyDiagram() {
  const { data: sourceStats, isLoading, error } = useSourcePipelineStats();
  const [showTopN, setShowTopN] = useState(10);

  const flowData = useMemo(() => {
    if (!sourceStats) return null;

    // Get top N sources by document count
    const topSources = sourceStats.sources
      .filter(s => s.stats.documents > 0)
      .sort((a, b) => b.stats.documents - a.stats.documents)
      .slice(0, showTopN);

    // Build flow nodes
    const nodes: FlowNode[] = [
      {
        id: 'documents',
        label: 'Documents',
        count: sourceStats.totals.documents,
        icon: FileText,
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
      },
      {
        id: 'snippets',
        label: 'Snippets',
        count: sourceStats.totals.snippets,
        icon: MessageSquare,
        color: 'text-violet-500',
        bgColor: 'bg-violet-500/10',
      },
      {
        id: 'claims',
        label: 'Claims',
        count: sourceStats.totals.claims,
        icon: Lightbulb,
        color: 'text-green-500',
        bgColor: 'bg-green-500/10',
      },
      {
        id: 'evidence',
        label: 'Evidence',
        count: sourceStats.totals.evidence,
        icon: Link2,
        color: 'text-orange-500',
        bgColor: 'bg-orange-500/10',
      },
    ];

    // Build flow links
    const links: FlowLink[] = [
      {
        from: 'documents',
        to: 'snippets',
        value: sourceStats.totals.snippets,
        percentage: sourceStats.totals.documents > 0
          ? (sourceStats.totals.snippets / sourceStats.totals.documents) * 100
          : 0,
      },
      {
        from: 'snippets',
        to: 'claims',
        value: sourceStats.totals.claims,
        percentage: sourceStats.totals.snippets > 0
          ? (sourceStats.totals.claims / sourceStats.totals.snippets) * 100
          : 0,
      },
      {
        from: 'claims',
        to: 'evidence',
        value: sourceStats.totals.evidence,
        percentage: sourceStats.totals.claims > 0
          ? (sourceStats.totals.evidence / sourceStats.totals.claims) * 100
          : 0,
      },
    ];

    return { nodes, links, topSources };
  }, [sourceStats, showTopN]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Pipeline Data Flow
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardContent className="pt-6">
          <p className="text-red-600">Failed to load pipeline flow data</p>
        </CardContent>
      </Card>
    );
  }

  if (!flowData || flowData.nodes.every(n => n.count === 0)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Pipeline Data Flow
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
            <Info className="h-12 w-12 mb-4 opacity-50" />
            <p>No pipeline data to visualize</p>
            <p className="text-sm">Run the ingestion pipeline to see data flow</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Pipeline Data Flow
          </CardTitle>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Show top</span>
              <select
                value={showTopN}
                onChange={(e) => setShowTopN(Number(e.target.value))}
                className="px-2 py-1 text-sm border rounded"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={20}>20</option>
              </select>
              <span className="text-sm text-muted-foreground">sources</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Flow Diagram */}
        <div className="relative">
          {/* Flow Nodes */}
          <div className="grid grid-cols-4 gap-4">
            {flowData.nodes.map((node, idx) => {
              const Icon = node.icon;
              return (
                <div key={node.id} className="relative">
                  <div className={`p-4 rounded-lg border-2 ${node.bgColor} border-current/20`}>
                    <div className="flex items-center justify-center mb-2">
                      <Icon className={`h-8 w-8 ${node.color}`} />
                    </div>
                    <div className={`text-2xl font-bold text-center ${node.color}`}>
                      {node.count.toLocaleString()}
                    </div>
                    <div className="text-sm text-center text-muted-foreground">
                      {node.label}
                    </div>
                  </div>
                  {/* Arrow to next node */}
                  {idx < flowData.nodes.length - 1 && (
                    <div className="absolute top-1/2 -right-3 transform -translate-y-1/2 z-10">
                      <ArrowRight className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Flow Links with percentages */}
          <div className="grid grid-cols-3 gap-4 mt-4 px-8">
            {flowData.links.map((link) => (
              <div key={`${link.from}-${link.to}`} className="text-center">
                <div className="text-xs text-muted-foreground mb-1">
                  {link.percentage.toFixed(1)}% conversion
                </div>
                <Progress value={Math.min(link.percentage, 100)} className="h-1.5" />
              </div>
            ))}
          </div>
        </div>

        {/* Top Sources Breakdown */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium mb-3">Top Sources by Documents</h4>
          <div className="space-y-2">
            {flowData.topSources.map((source) => {
              const maxDocs = flowData.topSources[0]?.stats.documents || 1;
              const percentage = (source.stats.documents / maxDocs) * 100;

              return (
                <div key={source.id} className="flex items-center gap-3">
                  <div className="w-32 truncate text-sm font-medium" title={source.name}>
                    {source.name}
                  </div>
                  <div className="flex-1">
                    <Progress value={percentage} className="h-2" />
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Badge variant="outline">{source.stats.documents} docs</Badge>
                    <Badge variant="secondary">{source.stats.snippets} snippets</Badge>
                    <Badge variant="default">{source.stats.claims} claims</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Conversion Rates Summary */}
        {sourceStats && (
          <div className="border-t pt-4">
            <div className="text-sm font-medium mb-2">Pipeline Efficiency</div>
            <div className="flex flex-wrap gap-4 text-sm">
              <Badge variant="outline" className="py-1.5">
                Extraction Rate: {sourceStats.totals.documents > 0
                  ? ((sourceStats.totals.snippets / sourceStats.totals.documents)).toFixed(1)
                  : '0'} snippets/doc
              </Badge>
              <Badge variant="outline" className="py-1.5">
                Claim Yield: {sourceStats.totals.snippets > 0
                  ? ((sourceStats.totals.claims / sourceStats.totals.snippets) * 100).toFixed(1)
                  : '0'}% of snippets
              </Badge>
              <Badge variant="outline" className="py-1.5">
                Evidence Coverage: {sourceStats.totals.claims > 0
                  ? ((sourceStats.totals.evidence / sourceStats.totals.claims) * 100).toFixed(1)
                  : '0'}% of claims linked
              </Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
