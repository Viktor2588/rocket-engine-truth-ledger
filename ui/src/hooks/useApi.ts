import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { statsApi, entityApi, conflictApi, reviewApi, pipelineApi, sourcesApi } from '@/lib/api';
import { useTruthSlider } from '@/context/TruthSliderContext';
import type {
  EntityFilters,
  ConflictFilters,
  ReviewQueueFilters,
  ReviewQueueItem,
  CreateSourceInput,
  UpdateSourceInput,
  CreateFeedInput,
  UpdateFeedInput,
  CreateUrlInput,
} from '@/lib/types';

// Query keys
export const queryKeys = {
  stats: ['stats'] as const,
  entities: (filters?: EntityFilters) => ['entities', filters] as const,
  entity: (id: string) => ['entity', id] as const,
  entityFacts: (id: string, truthMin: number) => ['entity', id, 'facts', truthMin] as const,
  conflicts: (filters?: ConflictFilters) => ['conflicts', filters] as const,
  conflict: (id: string) => ['conflict', id] as const,
  reviewQueue: (filters?: ReviewQueueFilters) => ['review-queue', filters] as const,
  reviewQueueStats: ['review-queue', 'stats'] as const,
  reviewQueueItem: (id: string) => ['review-queue', id] as const,
  pipelineStatus: ['pipeline', 'status'] as const,
  pipelineStages: ['pipeline', 'stages'] as const,
  pipelineHistory: (params?: Record<string, unknown>) => ['pipeline', 'history', params] as const,
  pipelineStats: ['pipeline', 'stats'] as const,
  pipelineDataFlow: ['pipeline', 'data-flow'] as const,
  sourcesConfig: ['sources', 'config'] as const,
  sourcesFeeds: ['sources', 'feeds'] as const,
  sourcesList: (params?: { isActive?: boolean; type?: string }) => ['sources', 'list', params] as const,
  source: (id: string) => ['sources', id] as const,
  sourceFeeds: (sourceId: string) => ['sources', sourceId, 'feeds'] as const,
  sourceUrls: (sourceId: string) => ['sources', sourceId, 'urls'] as const,
};

// Stats hooks
export function useStats() {
  return useQuery({
    queryKey: queryKeys.stats,
    queryFn: statsApi.get,
  });
}

// Entity hooks
export function useEntities(filters?: EntityFilters) {
  return useQuery({
    queryKey: queryKeys.entities(filters),
    queryFn: () => entityApi.list(filters),
  });
}

export function useEntity(id: string) {
  return useQuery({
    queryKey: queryKeys.entity(id),
    queryFn: () => entityApi.get(id),
    enabled: !!id,
  });
}

export function useEntityFacts(id: string) {
  const { truthMin } = useTruthSlider();
  return useQuery({
    queryKey: queryKeys.entityFacts(id, truthMin),
    queryFn: () => entityApi.getFacts(id, truthMin),
    enabled: !!id,
  });
}

// Conflict hooks
export function useConflicts(filters?: ConflictFilters) {
  return useQuery({
    queryKey: queryKeys.conflicts(filters),
    queryFn: () => conflictApi.list(filters),
  });
}

export function useConflict(id: string) {
  return useQuery({
    queryKey: queryKeys.conflict(id),
    queryFn: () => conflictApi.get(id),
    enabled: !!id,
  });
}

// Review Queue hooks
export function useReviewQueue(filters?: ReviewQueueFilters) {
  return useQuery({
    queryKey: queryKeys.reviewQueue(filters),
    queryFn: () => reviewApi.list(filters),
  });
}

export function useReviewQueueStats() {
  return useQuery({
    queryKey: queryKeys.reviewQueueStats,
    queryFn: reviewApi.getStats,
  });
}

export function useReviewQueueItem(id: string) {
  return useQuery({
    queryKey: queryKeys.reviewQueueItem(id),
    queryFn: () => reviewApi.get(id),
    enabled: !!id,
  });
}

export function useUpdateReviewItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Pick<ReviewQueueItem, 'status' | 'notes'>>;
    }) => reviewApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['review-queue'] });
    },
  });
}

// Pipeline hooks
export function usePipelineStatus() {
  return useQuery({
    queryKey: queryKeys.pipelineStatus,
    queryFn: pipelineApi.getStatus,
    refetchInterval: 3000, // Refresh every 3 seconds for real-time progress
  });
}

export function usePipelineStages() {
  return useQuery({
    queryKey: queryKeys.pipelineStages,
    queryFn: pipelineApi.getStages,
  });
}

export function usePipelineHistory(params?: {
  sync_type?: string;
  state?: string;
  limit?: number;
  offset?: number;
  since?: string;
}) {
  return useQuery({
    queryKey: queryKeys.pipelineHistory(params),
    queryFn: () => pipelineApi.getHistory(params),
  });
}

export function usePipelineStats() {
  return useQuery({
    queryKey: queryKeys.pipelineStats,
    queryFn: pipelineApi.getStats,
  });
}

export function usePipelineDataFlow() {
  return useQuery({
    queryKey: queryKeys.pipelineDataFlow,
    queryFn: pipelineApi.getDataFlow,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

export function usePipelineJobs() {
  return useQuery({
    queryKey: ['pipeline', 'jobs'] as const,
    queryFn: pipelineApi.getJobs,
    refetchInterval: 5000, // Refresh every 5 seconds for real-time status
  });
}

export function usePipelineRunningJobs() {
  return useQuery({
    queryKey: ['pipeline', 'jobs', 'running'] as const,
    queryFn: pipelineApi.getRunningJobs,
    refetchInterval: 2000, // Refresh every 2 seconds when jobs are running
  });
}

export function usePipelineFeedsStatus() {
  return useQuery({
    queryKey: ['pipeline', 'feeds', 'status'] as const,
    queryFn: pipelineApi.getFeedsStatus,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

export function useRunJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (jobId: string) => pipelineApi.runJob(jobId),
    onSuccess: () => {
      // Invalidate jobs queries to show running status
      queryClient.invalidateQueries({ queryKey: ['pipeline', 'jobs'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline'] });
    },
  });
}

export function useCancelJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (jobId: string) => pipelineApi.cancelJob(jobId),
    onSuccess: () => {
      // Invalidate jobs queries to show cancelled status
      queryClient.invalidateQueries({ queryKey: ['pipeline', 'jobs'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline'] });
    },
  });
}

// Sources hooks
export function useSourcesConfig() {
  return useQuery({
    queryKey: queryKeys.sourcesConfig,
    queryFn: sourcesApi.getConfig,
  });
}

export function useSourcesFeeds() {
  return useQuery({
    queryKey: queryKeys.sourcesFeeds,
    queryFn: sourcesApi.getFeeds,
  });
}

export function useSourcesList(params?: { isActive?: boolean; type?: string }) {
  return useQuery({
    queryKey: queryKeys.sourcesList(params),
    queryFn: () => sourcesApi.list(params),
  });
}

export function useSource(id: string) {
  return useQuery({
    queryKey: queryKeys.source(id),
    queryFn: () => sourcesApi.get(id),
    enabled: !!id,
  });
}

export function useSourceFeeds(sourceId: string) {
  return useQuery({
    queryKey: queryKeys.sourceFeeds(sourceId),
    queryFn: () => sourcesApi.listFeeds(sourceId),
    enabled: !!sourceId,
  });
}

export function useSourceUrls(sourceId: string) {
  return useQuery({
    queryKey: queryKeys.sourceUrls(sourceId),
    queryFn: () => sourcesApi.listUrls(sourceId),
    enabled: !!sourceId,
  });
}

// Source mutations
export function useCreateSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateSourceInput) => sourcesApi.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sources'] });
    },
  });
}

export function useUpdateSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateSourceInput }) =>
      sourcesApi.update(id, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sources'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.source(variables.id) });
    },
  });
}

export function useDeleteSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => sourcesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sources'] });
    },
  });
}

export function useToggleSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => sourcesApi.toggle(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['sources'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.source(id) });
    },
  });
}

// Feed mutations
export function useCreateFeed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ sourceId, input }: { sourceId: string; input: CreateFeedInput }) =>
      sourcesApi.createFeed(sourceId, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sources'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.sourceFeeds(variables.sourceId) });
    },
  });
}

export function useUpdateFeed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ feedId, input }: { feedId: string; input: UpdateFeedInput }) =>
      sourcesApi.updateFeed(feedId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sources'] });
    },
  });
}

export function useDeleteFeed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (feedId: string) => sourcesApi.deleteFeed(feedId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sources'] });
    },
  });
}

export function useToggleFeed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (feedId: string) => sourcesApi.toggleFeed(feedId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sources'] });
    },
  });
}

// URL mutations
export function useCreateUrl() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ sourceId, input }: { sourceId: string; input: CreateUrlInput }) =>
      sourcesApi.createUrl(sourceId, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sources'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.sourceUrls(variables.sourceId) });
    },
  });
}

export function useDeleteUrl() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (urlId: string) => sourcesApi.deleteUrl(urlId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sources'] });
    },
  });
}
