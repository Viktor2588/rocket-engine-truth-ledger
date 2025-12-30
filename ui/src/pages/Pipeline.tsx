import { useState, useEffect } from 'react';
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
  Play,
  Zap,
  Brain,
  Scale,
  GitBranch,
  AlertCircle,
  Timer,
  Loader2,
  Square,
  RotateCcw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  usePipelineStatus,
  usePipelineStats,
  usePipelineDataFlow,
  usePipelineHistory,
  usePipelineJobs,
  usePipelineFeedsStatus,
  useRunJob,
  useCancelJob,
} from '@/hooks/useApi';
import type { PipelineJob, FeedStatus } from '@/lib/api';

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

// Live elapsed time component that updates every second
function LiveElapsedTime({ startedAt }: { startedAt: string | Date }) {
  const [elapsed, setElapsed] = useState('0s');

  useEffect(() => {
    const startTime = new Date(startedAt).getTime();

    const updateElapsed = () => {
      const now = Date.now();
      const diffMs = now - startTime;
      const totalSeconds = Math.floor(diffMs / 1000);
      const mins = Math.floor(totalSeconds / 60);
      const secs = totalSeconds % 60;

      if (mins > 0) {
        setElapsed(`${mins}m ${secs}s`);
      } else {
        setElapsed(`${secs}s`);
      }
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);

    return () => clearInterval(interval);
  }, [startedAt]);

  return <span className="font-mono tabular-nums">{elapsed}</span>;
}

// Status badge component
function StatusBadge({ state }: { state: string }) {
  const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof CheckCircle }> = {
    success: { variant: 'default', icon: CheckCircle },
    running: { variant: 'secondary', icon: RefreshCw },
    failed: { variant: 'destructive', icon: XCircle },
    cancelled: { variant: 'outline', icon: Square },
    timeout: { variant: 'destructive', icon: Timer },
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

// Job category icons
const categoryIcons: Record<string, typeof Rss> = {
  ingestion: Rss,
  processing: Brain,
  scoring: Scale,
  orchestration: GitBranch,
};

// ============================================================================
// JOB RUNNER PANEL
// ============================================================================

function JobRunnerPanel() {
  const { data: jobsData, isLoading } = usePipelineJobs();
  const runJobMutation = useRunJob();
  const cancelJobMutation = useCancelJob();
  const [runningJobId, setRunningJobId] = useState<string | null>(null);
  const [cancellingJobId, setCancellingJobId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-48" />
        ))}
      </div>
    );
  }

  const jobs = jobsData?.jobs || [];

  const handleRunJob = async (jobId: string) => {
    setRunningJobId(jobId);
    try {
      await runJobMutation.mutateAsync(jobId);
    } finally {
      setRunningJobId(null);
    }
  };

  const handleCancelJob = async (jobId: string) => {
    setCancellingJobId(jobId);
    try {
      await cancelJobMutation.mutateAsync(jobId);
    } finally {
      setCancellingJobId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Running Jobs Alert */}
      {jobs.some(j => j.isRunning) && (
        <Card className="border-blue-500 bg-blue-500/5">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-blue-500 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-blue-700 dark:text-blue-300">
                  Jobs are running...
                </p>
                {jobs.filter(j => j.isRunning).map(job => (
                  <div key={job.id} className="mt-3 p-3 bg-background/50 rounded-lg">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{job.name}</span>
                        {job.runningInfo?.startedAt && (
                          <span className="flex items-center gap-1 text-xs text-blue-500">
                            <Timer className="h-3 w-3" />
                            <LiveElapsedTime startedAt={job.runningInfo.startedAt} />
                          </span>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                        onClick={() => handleCancelJob(job.id)}
                        disabled={cancellingJobId === job.id}
                      >
                        {cancellingJobId === job.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <>
                            <Square className="h-3 w-3 mr-1" />
                            Cancel
                          </>
                        )}
                      </Button>
                    </div>
                    <Progress
                      value={job.runningInfo?.progress?.current || 0}
                      className="h-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {job.runningInfo?.progress?.message || 'Processing...'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Job Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {jobs.map((job) => (
          <JobCard
            key={job.id}
            job={job}
            onRun={() => handleRunJob(job.id)}
            onCancel={() => handleCancelJob(job.id)}
            isTriggering={runningJobId === job.id}
            isCancelling={cancellingJobId === job.id}
          />
        ))}
      </div>
    </div>
  );
}

function JobCard({
  job,
  onRun,
  onCancel,
  isTriggering,
  isCancelling,
}: {
  job: PipelineJob;
  onRun: () => void;
  onCancel: () => void;
  isTriggering: boolean;
  isCancelling: boolean;
}) {
  const CategoryIcon = categoryIcons[job.category] || Activity;

  return (
    <Card className={`transition-all ${
      job.isRunning ? 'ring-2 ring-blue-500 animate-pulse' : ''
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${
              job.category === 'ingestion' ? 'bg-green-500/10 text-green-500' :
              job.category === 'processing' ? 'bg-purple-500/10 text-purple-500' :
              job.category === 'scoring' ? 'bg-yellow-500/10 text-yellow-500' :
              'bg-blue-500/10 text-blue-500'
            }`}>
              <CategoryIcon className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base">{job.name}</CardTitle>
              <Badge variant="outline" className="text-xs mt-1">
                {job.category}
              </Badge>
            </div>
          </div>
          {job.lastRun && (
            <StatusBadge state={job.isRunning ? 'running' : job.lastRun.state} />
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {job.description}
        </p>

        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="flex items-center gap-1">
              <Timer className="h-3 w-3" />
              Est. duration
            </span>
            <span>{job.estimatedDuration}</span>
          </div>

          <div className="flex items-center justify-between text-muted-foreground">
            <span className="flex items-center gap-1">
              <Layers className="h-3 w-3" />
              Affects
            </span>
            <span>{job.affects.join(', ')}</span>
          </div>

          {job.lastRun && (
            <>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Last run</span>
                <span>{formatRelativeTime(job.lastRun.completedAt || job.lastRun.startedAt)}</span>
              </div>
              {job.lastRun.recordsSynced !== null && (
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Records processed</span>
                  <span>{job.lastRun.recordsSynced.toLocaleString()}</span>
                </div>
              )}
              {job.lastRun.errorMessage && (
                <div className="mt-2 p-2 bg-red-500/10 rounded text-red-500 text-xs">
                  {job.lastRun.errorMessage}
                </div>
              )}
            </>
          )}
        </div>

        {job.isRunning ? (
          <div className="space-y-3">
            <Progress
              value={job.runningInfo?.progress?.current || 0}
              className="h-2"
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{job.runningInfo?.progress?.message || 'Processing...'}</span>
              {job.runningInfo?.startedAt && (
                <span className="flex items-center gap-1 text-blue-500">
                  <Timer className="h-3 w-3" />
                  <LiveElapsedTime startedAt={job.runningInfo.startedAt} />
                </span>
              )}
            </div>
            <Button
              onClick={onCancel}
              disabled={isCancelling}
              className="w-full"
              variant="destructive"
            >
              {isCancelling ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cancelling...
                </>
              ) : (
                <>
                  <Square className="h-4 w-4 mr-2" />
                  Cancel Job
                </>
              )}
            </Button>
          </div>
        ) : (
          <Button
            onClick={onRun}
            disabled={isTriggering}
            className="w-full"
            variant={job.id === 'full_pipeline' ? 'default' : 'outline'}
          >
            {isTriggering ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Starting...
              </>
            ) : job.lastRun ? (
              <>
                <RotateCcw className="h-4 w-4 mr-2" />
                Rerun {job.name}
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Run {job.name}
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// PIPELINE FLOW VISUALIZATION
// ============================================================================

function PipelineFlow() {
  const { data: status, isLoading } = usePipelineStatus();
  const { data: dataFlow } = usePipelineDataFlow();

  if (isLoading) {
    return (
      <div className="flex items-center gap-4 overflow-x-auto py-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <Skeleton className="h-32 w-48" />
            {i < 4 && <Skeleton className="h-6 w-6" />}
          </div>
        ))}
      </div>
    );
  }

  const stages = status?.stages || [];
  const current = dataFlow?.current;

  // Map stage IDs to data flow counts
  const stageCounts: Record<string, number> = {
    extract: current?.claims || 0,
    conflicts: current?.active_conflicts || 0,
    derive: current?.field_links || 0,
    score: current?.truth_metrics || 0,
  };

  return (
    <div className="overflow-x-auto">
      <div className="flex items-stretch gap-3 min-w-max py-4">
        {stages.map((stage, idx) => {
          const isRunning = stage.isRunning || stage.lastRun?.state === 'running';
          const progress = stage.runningProgress || stage.lastRun?.progress;

          return (
            <div key={stage.id} className="flex items-center gap-3">
              <Card className={`w-52 h-full transition-all ${
                isRunning ? 'ring-2 ring-blue-500 animate-pulse' :
                stage.lastRun?.state === 'failed' ? 'ring-2 ring-red-500' :
                stage.lastRun?.state === 'success' ? 'border-green-500/50' : ''
              }`}>
                <CardContent className="p-4 h-full flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-sm">{stage.name}</span>
                    {isRunning ? (
                      <Badge variant="secondary" className="gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        running
                      </Badge>
                    ) : stage.lastRun ? (
                      <StatusBadge state={stage.lastRun.state} />
                    ) : null}
                  </div>

                  <p className="text-xs text-muted-foreground mb-3 flex-1">
                    {stage.description}
                  </p>

                  {/* Running progress */}
                  {isRunning && progress && (
                    <div className="mb-3 space-y-1">
                      <Progress value={progress.current} className="h-2" />
                      <div className="text-xs text-blue-600 text-center">
                        {progress.message || `${progress.current}%`}
                      </div>
                    </div>
                  )}

                  {/* Data count for this stage (hide when running) */}
                  {!isRunning && stageCounts[stage.id] !== undefined && (
                    <div className="text-center py-2 bg-muted/50 rounded-lg mb-3">
                      <div className="text-2xl font-bold">
                        {stageCounts[stage.id].toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">records</div>
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground space-y-1">
                    {isRunning ? (
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-1">
                          <Timer className="h-3 w-3 animate-pulse text-blue-500" />
                          Elapsed:
                        </span>
                        <LiveElapsedTime startedAt={stage.lastRun?.startedAt || new Date().toISOString()} />
                      </div>
                    ) : stage.lastRun ? (
                      <>
                        <div className="flex justify-between">
                          <span>Last run:</span>
                          <span>{formatRelativeTime(stage.lastRun.completedAt)}</span>
                        </div>
                        {stage.lastRun.startedAt && stage.lastRun.completedAt && (
                          <div className="flex justify-between">
                            <span>Duration:</span>
                            <span>{formatDuration((new Date(stage.lastRun.completedAt).getTime() - new Date(stage.lastRun.startedAt).getTime()) / 1000)}</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <span className="text-muted-foreground italic">Never run</span>
                    )}
                  </div>
                </CardContent>
              </Card>
              {idx < stages.length - 1 && (
                <div className="flex flex-col items-center justify-center">
                  <ArrowRight className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// DATA FLOW VISUALIZATION
// ============================================================================

function DataFlowVisualization() {
  const { data: dataFlow, isLoading } = usePipelineDataFlow();

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  const current = dataFlow?.current;
  if (!current) return null;

  const nodes = [
    { id: 'sources', label: 'Sources', count: current.sources, icon: Database, color: 'text-blue-500' },
    { id: 'documents', label: 'Documents', count: current.documents, icon: FileText, color: 'text-green-500' },
    { id: 'snippets', label: 'Snippets', count: current.snippets, icon: Layers, color: 'text-purple-500' },
    { id: 'claims', label: 'Claims', count: current.claims, icon: FileText, color: 'text-orange-500' },
    { id: 'evidence', label: 'Evidence', count: current.evidence, icon: CheckCircle, color: 'text-cyan-500' },
    { id: 'truth', label: 'Truth Metrics', count: current.truth_metrics, icon: TrendingUp, color: 'text-yellow-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Main flow */}
      <div className="grid grid-cols-6 gap-2">
        {nodes.map((node, idx) => (
          <div key={node.id} className="relative">
            <Card className="text-center hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <node.icon className={`h-8 w-8 mx-auto mb-2 ${node.color}`} />
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

      {/* Secondary metrics */}
      <div className="grid grid-cols-4 gap-4">
        <Card className={current.active_conflicts > 0 ? 'border-orange-500' : ''}>
          <CardContent className="p-4 text-center">
            <AlertTriangle className={`h-6 w-6 mx-auto mb-1 ${current.active_conflicts > 0 ? 'text-orange-500' : 'text-muted-foreground'}`} />
            <div className={`text-xl font-bold ${current.active_conflicts > 0 ? 'text-orange-500' : ''}`}>
              {current.active_conflicts}
            </div>
            <div className="text-xs text-muted-foreground">Active Conflicts</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Zap className="h-6 w-6 mx-auto mb-1 text-blue-500" />
            <div className="text-xl font-bold text-blue-500">{current.entities}</div>
            <div className="text-xs text-muted-foreground">Entities</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <GitBranch className="h-6 w-6 mx-auto mb-1 text-green-500" />
            <div className="text-xl font-bold text-green-500">{current.field_links}</div>
            <div className="text-xs text-muted-foreground">Field Links</div>
          </CardContent>
        </Card>
        <Card className={current.pending_reviews > 0 ? 'border-yellow-500' : ''}>
          <CardContent className="p-4 text-center">
            <Clock className={`h-6 w-6 mx-auto mb-1 ${current.pending_reviews > 0 ? 'text-yellow-500' : 'text-muted-foreground'}`} />
            <div className={`text-xl font-bold ${current.pending_reviews > 0 ? 'text-yellow-500' : ''}`}>
              {current.pending_reviews}
            </div>
            <div className="text-xs text-muted-foreground">Pending Reviews</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ============================================================================
// FEED STATUS PANEL
// ============================================================================

function FeedStatusPanel() {
  const { data: feedsData, isLoading } = usePipelineFeedsStatus();

  if (isLoading) {
    return <Skeleton className="h-96" />;
  }

  const feeds = feedsData?.feeds || [];
  const summary = feedsData?.summary;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{summary?.total || 0}</div>
            <div className="text-xs text-muted-foreground">Total Feeds</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-500">{summary?.active || 0}</div>
            <div className="text-xs text-muted-foreground">Active</div>
          </CardContent>
        </Card>
        <Card className={summary?.dueForRefresh ? 'border-blue-500' : ''}>
          <CardContent className="p-4 text-center">
            <div className={`text-2xl font-bold ${summary?.dueForRefresh ? 'text-blue-500' : ''}`}>
              {summary?.dueForRefresh || 0}
            </div>
            <div className="text-xs text-muted-foreground">Due for Refresh</div>
          </CardContent>
        </Card>
        <Card className={summary?.withErrors ? 'border-red-500' : ''}>
          <CardContent className="p-4 text-center">
            <div className={`text-2xl font-bold ${summary?.withErrors ? 'text-red-500' : ''}`}>
              {summary?.withErrors || 0}
            </div>
            <div className="text-xs text-muted-foreground">With Errors</div>
          </CardContent>
        </Card>
        <Card className={summary?.neverFetched ? 'border-yellow-500' : ''}>
          <CardContent className="p-4 text-center">
            <div className={`text-2xl font-bold ${summary?.neverFetched ? 'text-yellow-500' : ''}`}>
              {summary?.neverFetched || 0}
            </div>
            <div className="text-xs text-muted-foreground">Never Fetched</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-muted-foreground">{summary?.inactive || 0}</div>
            <div className="text-xs text-muted-foreground">Inactive</div>
          </CardContent>
        </Card>
      </div>

      {/* Feed list */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3">Source</th>
              <th className="text-left p-3">Feed URL</th>
              <th className="text-left p-3">Type</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Last Fetched</th>
              <th className="text-right p-3">Docs</th>
            </tr>
          </thead>
          <tbody>
            {feeds.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                  No feeds configured
                </td>
              </tr>
            ) : (
              feeds.map((feed: FeedStatus) => (
                <tr key={feed.id} className="border-t hover:bg-muted/50">
                  <td className="p-3 font-medium">{feed.sourceName}</td>
                  <td className="p-3">
                    <a
                      href={feed.feedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline text-xs max-w-xs truncate block"
                    >
                      {feed.feedUrl}
                    </a>
                  </td>
                  <td className="p-3">
                    <Badge variant="outline">{feed.feedType.toUpperCase()}</Badge>
                  </td>
                  <td className="p-3">
                    {!feed.isActive ? (
                      <Badge variant="secondary">Inactive</Badge>
                    ) : feed.errorCount > 0 ? (
                      <Badge variant="destructive" className="gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {feed.errorCount} errors
                      </Badge>
                    ) : feed.isDue ? (
                      <Badge variant="outline" className="gap-1 border-blue-500 text-blue-500">
                        <Clock className="h-3 w-3" />
                        Due
                      </Badge>
                    ) : (
                      <Badge variant="default" className="gap-1">
                        <CheckCircle className="h-3 w-3" />
                        OK
                      </Badge>
                    )}
                    {feed.lastError && (
                      <div className="mt-1 text-xs text-red-500 max-w-xs truncate">
                        {feed.lastError}
                      </div>
                    )}
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {formatRelativeTime(feed.lastFetchedAt)}
                  </td>
                  <td className="p-3 text-right">
                    {feed.documentCount.toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================================
// STATS CARDS
// ============================================================================

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

// ============================================================================
// SYNC HISTORY
// ============================================================================

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
          className="border rounded px-2 py-1 text-sm bg-background"
          value={filter.sync_type || ''}
          onChange={(e) => setFilter({ ...filter, sync_type: e.target.value || undefined })}
        >
          <option value="">All stages</option>
          <option value="feed_ingest">Feed Ingest</option>
          <option value="truth_ingest">Document Ingest</option>
          <option value="truth_extract">Extract</option>
          <option value="conflict_detection">Conflicts</option>
          <option value="truth_derive">Derive</option>
          <option value="truth_score">Score</option>
          <option value="full_pipeline">Full Pipeline</option>
        </select>
        <select
          className="border rounded px-2 py-1 text-sm bg-background"
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
                      <code className="text-xs bg-muted px-2 py-1 rounded">{item.syncType}</code>
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

// ============================================================================
// MAIN PIPELINE PAGE
// ============================================================================

export function Pipeline() {
  const { data: status } = usePipelineStatus();
  const { data: jobsData } = usePipelineJobs();

  const runningCount = jobsData?.jobs?.filter(j => j.isRunning).length || 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pipeline</h1>
          <p className="text-muted-foreground">
            Data ingestion, processing, and truth scoring pipeline
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
          {runningCount > 0 && (
            <Badge variant="secondary" className="gap-1">
              <RefreshCw className="h-3 w-3 animate-spin" />
              {runningCount} Running
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
      <Tabs defaultValue="jobs">
        <TabsList>
          <TabsTrigger value="jobs" className="gap-2">
            <Play className="h-4 w-4" />
            Run Jobs
          </TabsTrigger>
          <TabsTrigger value="dataflow">Data Flow</TabsTrigger>
          <TabsTrigger value="feeds">Feed Status</TabsTrigger>
          <TabsTrigger value="history">Sync History</TabsTrigger>
        </TabsList>

        <TabsContent value="jobs" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Available Jobs</CardTitle>
              <CardDescription>
                Click to run individual stages or the full pipeline
              </CardDescription>
            </CardHeader>
            <CardContent>
              <JobRunnerPanel />
            </CardContent>
          </Card>
        </TabsContent>

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

        <TabsContent value="feeds" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Feed Status</CardTitle>
              <CardDescription>
                Status of RSS/Atom feeds with last fetch times and errors
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FeedStatusPanel />
            </CardContent>
          </Card>
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
