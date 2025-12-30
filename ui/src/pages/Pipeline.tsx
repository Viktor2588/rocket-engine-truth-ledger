import { useState } from 'react';
import {
  ArrowRight,
  Database,
  FileText,
  Rss,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Activity,
  TrendingUp,
  Layers,
  ExternalLink,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  usePipelineStatus,
  usePipelineStats,
  usePipelineDataFlow,
  usePipelineHistory,
  useSourcesConfig,
  useSourcesFeeds,
} from '@/hooks/useApi';

// Format relative time
function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return 'Never';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

// Format duration
function formatDuration(seconds: number | null): string {
  if (seconds === null) return 'N/A';
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(0);
  return `${mins}m ${secs}s`;
}

// Status badge component
function StatusBadge({ state }: { state: string }) {
  const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof CheckCircle }> = {
    success: { variant: 'default', icon: CheckCircle },
    running: { variant: 'secondary', icon: RefreshCw },
    failed: { variant: 'destructive', icon: XCircle },
    pending: { variant: 'outline', icon: Clock },
  };

  const { variant, icon: Icon } = variants[state] || variants.pending;

  return (
    <Badge variant={variant} className="gap-1">
      <Icon className={`h-3 w-3 ${state === 'running' ? 'animate-spin' : ''}`} />
      {state}
    </Badge>
  );
}

// Pipeline flow diagram
function PipelineFlow() {
  const { data: status, isLoading } = usePipelineStatus();

  if (isLoading) {
    return (
      <div className="flex items-center gap-4 overflow-x-auto py-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <Skeleton className="h-24 w-40" />
            {i < 6 && <Skeleton className="h-6 w-6" />}
          </div>
        ))}
      </div>
    );
  }

  const stages = status?.stages || [];

  return (
    <div className="overflow-x-auto">
      <div className="flex items-center gap-2 min-w-max py-4">
        {stages.map((stage, idx) => (
          <div key={stage.id} className="flex items-center gap-2">
            <Card className={`w-44 transition-all ${
              stage.lastRun?.state === 'running' ? 'ring-2 ring-blue-500 animate-pulse' :
              stage.lastRun?.state === 'failed' ? 'ring-2 ring-red-500' :
              stage.lastRun?.state === 'success' ? 'ring-1 ring-green-500/50' : ''
            }`}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">{stage.name}</span>
                  {stage.lastRun && <StatusBadge state={stage.lastRun.state} />}
                </div>
                <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                  {stage.description}
                </p>
                <div className="text-xs text-muted-foreground space-y-1">
                  {stage.lastRun ? (
                    <>
                      <div className="flex justify-between">
                        <span>Last run:</span>
                        <span>{formatRelativeTime(stage.lastRun.completedAt)}</span>
                      </div>
                      {stage.lastRun.recordsSynced !== null && (
                        <div className="flex justify-between">
                          <span>Records:</span>
                          <span>{stage.lastRun.recordsSynced.toLocaleString()}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <span className="text-muted-foreground">Never run</span>
                  )}
                </div>
              </CardContent>
            </Card>
            {idx < stages.length - 1 && (
              <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Data flow visualization
function DataFlowVisualization() {
  const { data: dataFlow, isLoading } = usePipelineDataFlow();

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  const current = dataFlow?.current;
  if (!current) return null;

  const nodes = [
    { id: 'sources', label: 'Sources', count: current.sources, icon: Database },
    { id: 'documents', label: 'Documents', count: current.documents, icon: FileText },
    { id: 'snippets', label: 'Snippets', count: current.snippets, icon: Layers },
    { id: 'claims', label: 'Claims', count: current.claims, icon: FileText },
    { id: 'evidence', label: 'Evidence', count: current.evidence, icon: CheckCircle },
    { id: 'truth', label: 'Truth Metrics', count: current.truth_metrics, icon: TrendingUp },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-6 gap-2">
        {nodes.map((node, idx) => (
          <div key={node.id} className="relative">
            <Card className="text-center">
              <CardContent className="p-4">
                <node.icon className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <div className="text-2xl font-bold">{node.count.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">{node.label}</div>
              </CardContent>
            </Card>
            {idx < nodes.length - 1 && (
              <div className="absolute top-1/2 -right-2 transform -translate-y-1/2 z-10">
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-4 mt-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-xl font-bold text-orange-500">{current.active_conflicts}</div>
            <div className="text-xs text-muted-foreground">Active Conflicts</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-xl font-bold text-blue-500">{current.entities}</div>
            <div className="text-xs text-muted-foreground">Entities</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-xl font-bold text-green-500">{current.field_links}</div>
            <div className="text-xs text-muted-foreground">Field Links</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-xl font-bold text-yellow-500">{current.pending_reviews}</div>
            <div className="text-xs text-muted-foreground">Pending Reviews</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Stats cards
function PipelineStatsCards() {
  const { data: stats, isLoading } = usePipelineStats();

  if (isLoading) {
    return (
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  const summary = stats?.summary;
  if (!summary) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Last 24h</p>
              <p className="text-2xl font-bold">{summary.runs_24h}</p>
            </div>
            <Activity className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="mt-2 flex gap-2 text-xs">
            <span className="text-green-500">{summary.success_24h} success</span>
            {summary.failed_24h > 0 && (
              <span className="text-red-500">{summary.failed_24h} failed</span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Records (24h)</p>
              <p className="text-2xl font-bold">{summary.records_24h.toLocaleString()}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Runs</p>
              <p className="text-2xl font-bold">{summary.runs_total.toLocaleString()}</p>
            </div>
            <Database className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            {summary.records_total.toLocaleString()} total records
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Avg Duration</p>
              <p className="text-2xl font-bold">{formatDuration(summary.avg_duration_seconds)}</p>
            </div>
            <Clock className="h-8 w-8 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Sources configuration panel
function SourcesPanel() {
  const { data: config, isLoading: configLoading } = useSourcesConfig();
  const { isLoading: feedsLoading } = useSourcesFeeds();
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set());

  if (configLoading || feedsLoading) {
    return <Skeleton className="h-96" />;
  }

  const sources = config?.sources || [];

  const toggleExpand = (key: string) => {
    const newExpanded = new Set(expandedSources);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedSources(newExpanded);
  };

  // Group sources by type
  const sourcesByType: Record<string, typeof sources> = {};
  sources.forEach((source) => {
    if (!sourcesByType[source.sourceType]) {
      sourcesByType[source.sourceType] = [];
    }
    sourcesByType[source.sourceType].push(source);
  });

  const typeLabels: Record<string, string> = {
    government_agency: 'Government Agencies',
    regulator: 'Regulators',
    manufacturer: 'Manufacturers',
    news: 'News Sources',
    peer_reviewed: 'Research & Academic',
    research: 'Reference',
    wiki: 'Wiki',
    blog: 'Blogs',
    forum: 'Forums',
    standards_body: 'Standards Bodies',
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{config?.totalSources || 0}</div>
            <div className="text-xs text-muted-foreground">Total Sources</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-500">{config?.activeSources || 0}</div>
            <div className="text-xs text-muted-foreground">Active Sources</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-500">{config?.totalFeeds || 0}</div>
            <div className="text-xs text-muted-foreground">RSS Feeds</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{config?.totalUrls || 0}</div>
            <div className="text-xs text-muted-foreground">Static URLs</div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {Object.entries(sourcesByType).map(([type, typeSources]) => (
          <Card key={type}>
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center justify-between">
                {typeLabels[type] || type}
                <Badge variant="outline">{typeSources.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {typeSources.map((source) => (
                  <div key={source.key} className="border rounded-lg p-3">
                    <div
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => toggleExpand(source.key)}
                    >
                      <div className="flex items-center gap-2">
                        {expandedSources.has(source.key) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <span className="font-medium">{source.name}</span>
                        {!source.active && (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          Trust: {(source.baseTrust * 100).toFixed(0)}%
                        </Badge>
                        {source.feedCount > 0 && (
                          <Badge variant="secondary" className="gap-1">
                            <Rss className="h-3 w-3" />
                            {source.feedCount}
                          </Badge>
                        )}
                        {source.urlCount > 0 && (
                          <Badge variant="outline">{source.urlCount} URLs</Badge>
                        )}
                      </div>
                    </div>

                    {expandedSources.has(source.key) && (
                      <div className="mt-3 pl-6 text-sm text-muted-foreground space-y-2">
                        {source.description && <p>{source.description}</p>}
                        <div className="flex items-center gap-2">
                          <a
                            href={source.baseUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-blue-500 hover:underline"
                          >
                            {source.baseUrl}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                        {source.tags && source.tags.length > 0 && (
                          <div className="flex gap-1 flex-wrap">
                            {source.tags.map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Sync history table
function SyncHistoryTable() {
  const [filter, setFilter] = useState<{ sync_type?: string; state?: string }>({});
  const { data: historyData, isLoading } = usePipelineHistory({ ...filter, limit: 20 });

  if (isLoading) {
    return <Skeleton className="h-96" />;
  }

  const history = historyData?.history || [];

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <select
          className="border rounded px-2 py-1 text-sm"
          value={filter.sync_type || ''}
          onChange={(e) => setFilter({ ...filter, sync_type: e.target.value || undefined })}
        >
          <option value="">All stages</option>
          <option value="truth_ingest">Ingest</option>
          <option value="feed_ingest">Feed Ingest</option>
          <option value="truth_extract">Extract</option>
          <option value="conflict_detection">Conflicts</option>
          <option value="truth_derive">Derive</option>
          <option value="truth_score">Score</option>
        </select>
        <select
          className="border rounded px-2 py-1 text-sm"
          value={filter.state || ''}
          onChange={(e) => setFilter({ ...filter, state: e.target.value || undefined })}
        >
          <option value="">All states</option>
          <option value="success">Success</option>
          <option value="failed">Failed</option>
          <option value="running">Running</option>
        </select>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3">Stage</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Started</th>
              <th className="text-left p-3">Duration</th>
              <th className="text-right p-3">Records</th>
            </tr>
          </thead>
          <tbody>
            {history.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted-foreground">
                  No sync history found
                </td>
              </tr>
            ) : (
              history.map((item) => {
                const duration = item.completedAt
                  ? (new Date(item.completedAt).getTime() - new Date(item.startedAt).getTime()) / 1000
                  : null;

                return (
                  <tr key={item.id} className="border-t hover:bg-muted/50">
                    <td className="p-3">
                      <code className="text-xs">{item.syncType}</code>
                    </td>
                    <td className="p-3">
                      <StatusBadge state={item.state} />
                      {item.errorMessage && (
                        <div className="mt-1 text-xs text-red-500 max-w-xs truncate">
                          {item.errorMessage}
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {formatRelativeTime(item.startedAt)}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {formatDuration(duration)}
                    </td>
                    <td className="p-3 text-right">
                      {item.recordsSynced?.toLocaleString() ?? '-'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Main Pipeline page
export function Pipeline() {
  const { data: status } = usePipelineStatus();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pipeline</h1>
          <p className="text-muted-foreground">
            Data ingestion and processing pipeline visualization
          </p>
        </div>
        <div className="flex items-center gap-2">
          {status?.pipelineHealthy ? (
            <Badge variant="default" className="gap-1">
              <CheckCircle className="h-3 w-3" />
              Healthy
            </Badge>
          ) : (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              Issues Detected
            </Badge>
          )}
          {status?.runningJobs && status.runningJobs.length > 0 && (
            <Badge variant="secondary" className="gap-1">
              <RefreshCw className="h-3 w-3 animate-spin" />
              {status.runningJobs.length} Running
            </Badge>
          )}
        </div>
      </div>

      {/* Pipeline Flow Diagram */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Pipeline Stages</CardTitle>
          <CardDescription>
            Data flows through these stages from source ingestion to truth scoring
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PipelineFlow />
        </CardContent>
      </Card>

      {/* Stats */}
      <PipelineStatsCards />

      {/* Tabs for different views */}
      <Tabs defaultValue="dataflow">
        <TabsList>
          <TabsTrigger value="dataflow">Data Flow</TabsTrigger>
          <TabsTrigger value="sources">Sources</TabsTrigger>
          <TabsTrigger value="history">Sync History</TabsTrigger>
        </TabsList>

        <TabsContent value="dataflow" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Data Flow</CardTitle>
              <CardDescription>
                Current state of data at each stage in the pipeline
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataFlowVisualization />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sources" className="mt-4">
          <SourcesPanel />
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Sync History</CardTitle>
              <CardDescription>
                Recent pipeline runs and their status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SyncHistoryTable />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
