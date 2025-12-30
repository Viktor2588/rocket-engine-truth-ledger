import { useState } from 'react';
import {
  FileText,
  MessageSquare,
  Lightbulb,
  Link2,
  Activity,
  TrendingUp,
  Clock,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useStageDetails } from '@/hooks/useApi';
import type { StageDetails } from '@/lib/types';

interface StageDetailPanelProps {
  stage: string | null;
  onClose: () => void;
}

const stageConfig: Record<string, { icon: React.ElementType; color: string; title: string; description: string }> = {
  documents: {
    icon: FileText,
    color: 'text-blue-500',
    title: 'Documents',
    description: 'Ingested documents from all sources',
  },
  snippets: {
    icon: MessageSquare,
    color: 'text-violet-500',
    title: 'Snippets',
    description: 'Extracted text segments from documents',
  },
  claims: {
    icon: Lightbulb,
    color: 'text-green-500',
    title: 'Claims',
    description: 'Facts extracted from snippets',
  },
  evidence: {
    icon: Link2,
    color: 'text-orange-500',
    title: 'Evidence',
    description: 'Supporting evidence linking claims to snippets',
  },
};

function formatTimeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Never';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function StageDetailPanel({ stage, onClose }: StageDetailPanelProps) {
  const { data, isLoading, error } = useStageDetails(stage || '', 20);
  const [activeTab, setActiveTab] = useState<'breakdown' | 'samples' | 'activity'>('breakdown');

  const config = stage ? stageConfig[stage] : null;
  const Icon = config?.icon || FileText;

  return (
    <Sheet open={!!stage} onOpenChange={() => onClose()}>
      <SheetContent className="w-[500px] sm:w-[600px] overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Icon className={`h-5 w-5 ${config?.color || 'text-gray-500'}`} />
            {config?.title || stage} Details
          </SheetTitle>
          <p className="text-sm text-muted-foreground">
            {config?.description || 'Pipeline stage details'}
          </p>
        </SheetHeader>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : error ? (
          <div className="text-red-500 p-4">
            Failed to load stage details
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="text-3xl font-bold">
                    {data.totalCount.toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                    <Activity className="h-4 w-4" />
                    Total Count
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-3xl font-bold">
                    {data.bySource.length}
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                    <TrendingUp className="h-4 w-4" />
                    Contributing Sources
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Processing Stats */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Processing Activity</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Last 24 hours</div>
                    <div className="text-xl font-semibold">
                      +{data.processingStats.last24h.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Last 7 days</div>
                    <div className="text-xl font-semibold">
                      +{data.processingStats.last7d.toLocaleString()}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Claims summary if available */}
            {data.summary && (
              <Card>
                <CardContent className="pt-4">
                  <div className="font-medium mb-3">Quality Metrics</div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Avg Truth Score</div>
                      <div className="text-lg font-semibold">
                        {(data.summary.avgTruth * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">High Confidence</div>
                      <div className="text-lg font-semibold text-green-600">
                        {data.summary.highConfidence}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Low Confidence</div>
                      <div className="text-lg font-semibold text-amber-600">
                        {data.summary.lowConfidence}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
              <TabsList className="w-full">
                <TabsTrigger value="breakdown" className="flex-1">By Source</TabsTrigger>
                <TabsTrigger value="samples" className="flex-1">Samples</TabsTrigger>
              </TabsList>

              <TabsContent value="breakdown" className="mt-4">
                <SourceBreakdown data={data} />
              </TabsContent>

              <TabsContent value="samples" className="mt-4">
                <SampleData data={data} stage={stage || ''} />
              </TabsContent>
            </Tabs>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function SourceBreakdown({ data }: { data: StageDetails }) {
  const maxCount = Math.max(...data.bySource.map((s) => s.count), 1);

  return (
    <div className="space-y-3">
      {data.bySource.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No sources have contributed to this stage yet
        </div>
      ) : (
        data.bySource.map((source) => (
          <div key={source.sourceId} className="p-3 rounded-lg bg-muted/30">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-sm">{source.sourceName}</span>
              <Badge variant="outline">
                {source.count.toLocaleString()} ({source.percentage.toFixed(1)}%)
              </Badge>
            </div>
            <Progress value={(source.count / maxCount) * 100} className="h-2" />
          </div>
        ))
      )}
    </div>
  );
}

function SampleData({ data, stage }: { data: StageDetails; stage: string }) {
  if (!data.samples || data.samples.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No sample data available
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-[400px] overflow-y-auto">
      {data.samples.map((sample, idx) => (
        <SampleCard key={idx} sample={sample as Record<string, unknown>} stage={stage} />
      ))}
    </div>
  );
}

function SampleCard({ sample, stage }: { sample: Record<string, unknown>; stage: string }) {
  const renderContent = () => {
    switch (stage) {
      case 'documents':
        return (
          <>
            <div className="font-medium text-sm line-clamp-2">
              {String(sample.title || 'Untitled')}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {String(sample.sourceName || 'Unknown source')}
            </div>
            {sample.url && (
              <a
                href={String(sample.url)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-500 hover:underline mt-1 block truncate"
              >
                {String(sample.url)}
              </a>
            )}
            <div className="text-xs text-muted-foreground mt-1">
              Retrieved {formatTimeAgo(String(sample.retrievedAt || ''))}
            </div>
          </>
        );

      case 'snippets':
        return (
          <>
            <div className="text-sm line-clamp-3">
              {String(sample.text || 'No text')}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className="text-xs">
                {String(sample.snippetType || 'unknown')}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {String(sample.locator || '')}
              </span>
            </div>
          </>
        );

      case 'claims':
        return (
          <>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-xs">
                {String(sample.entityName || 'Unknown entity')}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {String(sample.attributeName || 'Unknown attribute')}
              </span>
            </div>
            <div className="font-mono text-sm bg-muted/50 px-2 py-1 rounded">
              {JSON.stringify(sample.valueJson)}
              {sample.unit ? ` ${String(sample.unit)}` : null}
            </div>
            {sample.quote && (
              <div className="text-xs text-muted-foreground mt-2 italic line-clamp-2">
                "{String(sample.quote)}"
              </div>
            )}
            <div className="flex items-center gap-2 mt-2">
              <Badge
                variant={
                  String(sample.stance) === 'supports'
                    ? 'default'
                    : String(sample.stance) === 'contradicts'
                    ? 'destructive'
                    : 'secondary'
                }
                className="text-xs"
              >
                {String(sample.stance || 'unknown')}
              </Badge>
              <span className="text-xs text-muted-foreground">
                Confidence: {((Number(sample.confidence) || 0) * 100).toFixed(0)}%
              </span>
            </div>
          </>
        );

      case 'evidence':
        return (
          <>
            <div className="text-sm line-clamp-2">
              {String(sample.quote || 'No quote')}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              From: {String(sample.documentTitle || 'Unknown document')}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Badge
                variant={
                  String(sample.stance) === 'supports'
                    ? 'default'
                    : String(sample.stance) === 'contradicts'
                    ? 'destructive'
                    : 'secondary'
                }
                className="text-xs"
              >
                {String(sample.stance || 'unknown')}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {String(sample.sourceName || 'Unknown source')}
              </span>
            </div>
          </>
        );

      default:
        return (
          <pre className="text-xs overflow-x-auto">
            {JSON.stringify(sample, null, 2)}
          </pre>
        );
    }
  };

  return (
    <Card>
      <CardContent className="pt-3 pb-3">
        {renderContent()}
      </CardContent>
    </Card>
  );
}

// Export a hook for use by other components
export function useStageDetailPanel() {
  const [selectedStage, setSelectedStage] = useState<string | null>(null);

  return {
    selectedStage,
    openStage: setSelectedStage,
    closeStage: () => setSelectedStage(null),
    StageDetailPanel: () => (
      <StageDetailPanel stage={selectedStage} onClose={() => setSelectedStage(null)} />
    ),
  };
}
