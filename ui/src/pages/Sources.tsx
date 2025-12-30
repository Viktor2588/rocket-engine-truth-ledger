import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useSourcesList,
  useCreateSource,
  useUpdateSource,
  useDeleteSource,
  useToggleSource,
  useCreateFeed,
  useDeleteFeed,
  useToggleFeed,
  useCreateUrl,
  useDeleteUrl,
} from '@/hooks/useApi';
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  Rss,
  Link as LinkIcon,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Database,
  X,
} from 'lucide-react';
import type {
  Source,
  SourceFeed,
  SourceUrl,
  SourceType,
  DocType,
  FeedType,
  CreateSourceInput,
} from '@/lib/types';

// Source type defaults - links source type to default doc type and trust score
const SOURCE_TYPE_DEFAULTS: Record<SourceType, { docType: DocType; trust: number; description: string }> = {
  regulator: { docType: 'regulation', trust: 0.95, description: 'Official regulatory body (FAA, ESA)' },
  standards_body: { docType: 'standard', trust: 0.90, description: 'Standards organization (SAE, ISO)' },
  government_agency: { docType: 'standard_or_policy', trust: 0.85, description: 'Government agency (NASA, JAXA)' },
  manufacturer: { docType: 'manufacturer_datasheet', trust: 0.80, description: 'Engine/component manufacturer' },
  peer_reviewed: { docType: 'peer_reviewed_paper', trust: 0.85, description: 'Academic journals, peer review' },
  research: { docType: 'technical_report', trust: 0.75, description: 'Research institutions, labs' },
  news: { docType: 'news_article', trust: 0.50, description: 'News outlets, journalism' },
  wiki: { docType: 'wiki', trust: 0.40, description: 'Wikipedia, community wikis' },
  blog: { docType: 'blog_post', trust: 0.35, description: 'Personal/company blogs' },
  forum: { docType: 'forum_post', trust: 0.25, description: 'Forums, discussion boards' },
  social_media: { docType: 'social_media', trust: 0.20, description: 'Twitter, Reddit, etc.' },
  other: { docType: 'other', trust: 0.50, description: 'Other/uncategorized' },
};

const SOURCE_TYPES: { value: SourceType; label: string }[] = [
  { value: 'regulator', label: 'Regulator' },
  { value: 'standards_body', label: 'Standards Body' },
  { value: 'government_agency', label: 'Government Agency' },
  { value: 'manufacturer', label: 'Manufacturer' },
  { value: 'peer_reviewed', label: 'Peer Reviewed' },
  { value: 'research', label: 'Research' },
  { value: 'news', label: 'News' },
  { value: 'wiki', label: 'Wiki' },
  { value: 'blog', label: 'Blog' },
  { value: 'forum', label: 'Forum' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'other', label: 'Other' },
];

const DOC_TYPES: { value: DocType; label: string }[] = [
  { value: 'regulation', label: 'Regulation' },
  { value: 'standard', label: 'Standard' },
  { value: 'standard_or_policy', label: 'Standard/Policy' },
  { value: 'peer_reviewed_paper', label: 'Peer Reviewed Paper' },
  { value: 'technical_report', label: 'Technical Report' },
  { value: 'manufacturer_datasheet', label: 'Manufacturer Datasheet' },
  { value: 'company_news', label: 'Company News' },
  { value: 'news_article', label: 'News Article' },
  { value: 'blog_post', label: 'Blog Post' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'wiki', label: 'Wiki' },
  { value: 'forum_post', label: 'Forum Post' },
  { value: 'other', label: 'Other' },
];

const FEED_TYPES: { value: FeedType; label: string }[] = [
  { value: 'rss', label: 'RSS' },
  { value: 'atom', label: 'Atom' },
  { value: 'json', label: 'JSON' },
  { value: 'html', label: 'HTML' },
  { value: 'api', label: 'API' },
];

// Simple Modal Component
function Modal({ open, onClose, title, children }: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-50 w-full max-w-lg rounded-lg border bg-background p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}

// Toggle Button Component (simpler than Switch)
function ToggleButton({ checked, onChange, disabled }: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      className={`
        relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent
        transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-ring
        ${checked ? 'bg-primary' : 'bg-muted'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <span
        className={`
          pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0
          transition duration-200 ease-in-out
          ${checked ? 'translate-x-5' : 'translate-x-0'}
        `}
      />
    </button>
  );
}

// Source Card Component
function SourceCard({ source, onEdit, onDelete }: {
  source: Source;
  onEdit: (source: Source) => void;
  onDelete: (source: Source) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [showAddFeed, setShowAddFeed] = useState(false);
  const [showAddUrl, setShowAddUrl] = useState(false);
  const [feedUrl, setFeedUrl] = useState('');
  const [feedType, setFeedType] = useState<FeedType>('rss');
  const [feedInterval, setFeedInterval] = useState(60);
  const [newUrl, setNewUrl] = useState('');

  const toggleSource = useToggleSource();
  const createFeed = useCreateFeed();
  const deleteFeed = useDeleteFeed();
  const toggleFeed = useToggleFeed();
  const createUrl = useCreateUrl();
  const deleteUrl = useDeleteUrl();

  const handleToggleSource = () => {
    toggleSource.mutate(source.id);
  };

  const handleAddFeed = () => {
    if (!feedUrl) return;
    createFeed.mutate({
      sourceId: source.id,
      input: {
        feedUrl,
        feedType,
        refreshIntervalMinutes: feedInterval,
      },
    }, {
      onSuccess: () => {
        setFeedUrl('');
        setShowAddFeed(false);
      },
      onError: (error: any) => {
        const message = error.response?.data?.error || error.message || 'Failed to add feed';
        alert(message);
      },
    });
  };

  const handleAddUrl = () => {
    if (!newUrl) return;
    createUrl.mutate({
      sourceId: source.id,
      input: { url: newUrl },
    }, {
      onSuccess: () => {
        setNewUrl('');
        setShowAddUrl(false);
      },
      onError: (error: any) => {
        const message = error.response?.data?.error || error.message || 'Failed to add URL';
        alert(message);
      },
    });
  };

  return (
    <Card className={!source.isActive ? 'opacity-60' : ''}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              {source.name}
              {source.isActive ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              )}
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <Badge variant="outline">{source.sourceType.replace('_', ' ')}</Badge>
              <Badge variant="secondary">Trust: {(source.baseTrust * 100).toFixed(0)}%</Badge>
              {source.feeds && source.feeds.length > 0 && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Rss className="h-3 w-3" />
                  {source.feeds.length} feeds
                </Badge>
              )}
              {source.urls && source.urls.length > 0 && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <LinkIcon className="h-3 w-3" />
                  {source.urls.length} URLs
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ToggleButton
              checked={source.isActive}
              onChange={handleToggleSource}
              disabled={toggleSource.isPending}
            />
            <Button variant="ghost" size="icon" onClick={() => onEdit(source)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onDelete(source)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {source.description && (
          <p className="text-sm text-muted-foreground mb-3">{source.description}</p>
        )}
        {source.baseUrl && (
          <a
            href={source.baseUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-500 hover:underline flex items-center gap-1 mb-3"
          >
            {source.baseUrl}
            <ExternalLink className="h-3 w-3" />
          </a>
        )}

        {/* Expandable feeds/urls section */}
        <div className="border-t pt-3">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center justify-between w-full text-sm text-muted-foreground hover:text-foreground"
          >
            <span>Feeds & URLs</span>
            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>

          {isOpen && (
            <div className="space-y-4 mt-3">
              {/* Feeds section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Rss className="h-4 w-4" />
                    Feeds ({source.feeds?.length || 0})
                  </h4>
                  <Button size="sm" variant="outline" onClick={() => setShowAddFeed(true)}>
                    <Plus className="h-3 w-3 mr-1" />
                    Add Feed
                  </Button>
                </div>
                {showAddFeed && (
                  <div className="border rounded-lg p-3 mb-2 space-y-2 bg-muted/50">
                    <Input
                      placeholder="Feed URL"
                      value={feedUrl}
                      onChange={(e) => setFeedUrl(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Select value={feedType} onValueChange={(v) => setFeedType(v as FeedType)}>
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FEED_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        placeholder="Interval (min)"
                        value={feedInterval}
                        onChange={(e) => setFeedInterval(parseInt(e.target.value) || 60)}
                        className="w-32"
                      />
                      <Button size="sm" onClick={handleAddFeed} disabled={createFeed.isPending}>
                        Add
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setShowAddFeed(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
                {source.feeds && source.feeds.length > 0 ? (
                  <div className="space-y-2">
                    {source.feeds.map((feed) => (
                      <FeedRow
                        key={feed.id}
                        feed={feed}
                        onDelete={() => deleteFeed.mutate(feed.id)}
                        onToggle={() => toggleFeed.mutate(feed.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No feeds configured</p>
                )}
              </div>

              {/* URLs section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <LinkIcon className="h-4 w-4" />
                    Static URLs ({source.urls?.length || 0})
                  </h4>
                  <Button size="sm" variant="outline" onClick={() => setShowAddUrl(true)}>
                    <Plus className="h-3 w-3 mr-1" />
                    Add URL
                  </Button>
                </div>
                {showAddUrl && (
                  <div className="border rounded-lg p-3 mb-2 space-y-2 bg-muted/50">
                    <div className="flex gap-2">
                      <Input
                        placeholder="URL"
                        value={newUrl}
                        onChange={(e) => setNewUrl(e.target.value)}
                        className="flex-1"
                      />
                      <Button size="sm" onClick={handleAddUrl} disabled={createUrl.isPending}>
                        Add
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setShowAddUrl(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
                {source.urls && source.urls.length > 0 ? (
                  <div className="space-y-2">
                    {source.urls.map((url) => (
                      <UrlRow
                        key={url.id}
                        url={url}
                        onDelete={() => deleteUrl.mutate(url.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No static URLs configured</p>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Feed Row Component
function FeedRow({ feed, onDelete, onToggle }: {
  feed: SourceFeed;
  onDelete: () => void;
  onToggle: () => void;
}) {
  return (
    <div className={`flex items-center justify-between p-2 border rounded-lg text-sm ${!feed.isActive ? 'opacity-60' : ''}`}>
      <div className="flex-1 overflow-hidden">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">{feed.feedType.toUpperCase()}</Badge>
          <span className="truncate">{feed.feedUrl}</span>
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          Refresh: {feed.refreshIntervalMinutes}min
          {feed.lastFetchedAt && (
            <> | Last: {new Date(feed.lastFetchedAt).toLocaleDateString()}</>
          )}
          {feed.errorCount > 0 && (
            <span className="text-destructive"> | Errors: {feed.errorCount}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 ml-2">
        <ToggleButton checked={feed.isActive} onChange={onToggle} />
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onDelete}>
          <Trash2 className="h-3 w-3 text-destructive" />
        </Button>
      </div>
    </div>
  );
}

// URL Row Component
function UrlRow({ url, onDelete }: {
  url: SourceUrl;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center justify-between p-2 border rounded-lg text-sm">
      <div className="flex-1 overflow-hidden">
        <a
          href={url.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:underline truncate flex items-center gap-1"
        >
          {url.url}
          <ExternalLink className="h-3 w-3 flex-shrink-0" />
        </a>
      </div>
      <Button variant="ghost" size="icon" className="h-8 w-8 ml-2" onClick={onDelete}>
        <Trash2 className="h-3 w-3 text-destructive" />
      </Button>
    </div>
  );
}

// Helper to get trust color
function getTrustColor(trust: number): string {
  if (trust >= 0.8) return 'text-green-600 bg-green-500/10';
  if (trust >= 0.6) return 'text-blue-600 bg-blue-500/10';
  if (trust >= 0.4) return 'text-yellow-600 bg-yellow-500/10';
  return 'text-red-600 bg-red-500/10';
}

function getTrustLabel(trust: number): string {
  if (trust >= 0.9) return 'Very High';
  if (trust >= 0.7) return 'High';
  if (trust >= 0.5) return 'Medium';
  if (trust >= 0.3) return 'Low';
  return 'Very Low';
}

// Source Form Component
function SourceForm({
  source,
  onSubmit,
  onCancel,
  isSubmitting,
}: {
  source?: Source;
  onSubmit: (data: CreateSourceInput) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}) {
  const isEditing = !!source;
  const [name, setName] = useState(source?.name || '');
  const [sourceType, setSourceType] = useState<SourceType>(source?.sourceType || 'government_agency');
  const [baseUrl, setBaseUrl] = useState(source?.baseUrl || '');
  const [baseTrust, setBaseTrust] = useState(source?.baseTrust ?? SOURCE_TYPE_DEFAULTS['government_agency'].trust);
  const [description, setDescription] = useState(source?.description || '');
  const [defaultDocType, setDefaultDocType] = useState<DocType>(
    source?.defaultDocType || SOURCE_TYPE_DEFAULTS['government_agency'].docType
  );
  const [tags, setTags] = useState(source?.tags?.join(', ') || '');

  // When source type changes, auto-fill trust and doc type (only for new sources or if user hasn't customized)
  const handleSourceTypeChange = (newType: SourceType) => {
    const defaults = SOURCE_TYPE_DEFAULTS[newType];
    setSourceType(newType);
    // Always update trust and doc type when type changes (user can still override)
    if (!isEditing) {
      setBaseTrust(defaults.trust);
      setDefaultDocType(defaults.docType);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      sourceType,
      baseUrl: baseUrl || undefined,
      baseTrust,
      description: description || undefined,
      defaultDocType: defaultDocType || undefined,
      tags: tags ? tags.split(',').map(t => t.trim()) : undefined,
    });
  };

  const currentDefaults = SOURCE_TYPE_DEFAULTS[sourceType];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Name *</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., NASA Technical Reports Server"
          required
        />
      </div>

      {/* Source Type - Main selector */}
      <div>
        <label className="block text-sm font-medium mb-1">Source Type *</label>
        <Select value={sourceType} onValueChange={(v) => handleSourceTypeChange(v as SourceType)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SOURCE_TYPES.map((t) => {
              const defaults = SOURCE_TYPE_DEFAULTS[t.value];
              return (
                <SelectItem key={t.value} value={t.value}>
                  <div className="flex items-center justify-between w-full gap-4">
                    <span>{t.label}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${getTrustColor(defaults.trust)}`}>
                      {Math.round(defaults.trust * 100)}%
                    </span>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground mt-1">
          {currentDefaults.description}
        </p>
      </div>

      {/* Trust Score with visual indicator */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium">Trust Score *</label>
          <Badge className={getTrustColor(baseTrust)}>
            {getTrustLabel(baseTrust)} ({Math.round(baseTrust * 100)}%)
          </Badge>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={baseTrust}
            onChange={(e) => setBaseTrust(parseFloat(e.target.value))}
            className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
          />
          <Input
            type="number"
            min={0}
            max={1}
            step={0.05}
            value={baseTrust}
            onChange={(e) => setBaseTrust(parseFloat(e.target.value) || 0.5)}
            className="w-20"
            required
          />
        </div>
        {baseTrust !== currentDefaults.trust && (
          <p className="text-xs text-muted-foreground mt-1">
            Default for {sourceType.replace('_', ' ')}: {Math.round(currentDefaults.trust * 100)}%
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto p-0 ml-2 text-xs"
              onClick={() => setBaseTrust(currentDefaults.trust)}
            >
              Reset to default
            </Button>
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Base URL</label>
        <Input
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          placeholder="https://example.com"
        />
      </div>

      {/* Document Type - linked to source type */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium">Default Document Type</label>
          {defaultDocType !== currentDefaults.docType && (
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs"
              onClick={() => setDefaultDocType(currentDefaults.docType)}
            >
              Reset to default
            </Button>
          )}
        </div>
        <Select value={defaultDocType} onValueChange={(v) => setDefaultDocType(v as DocType)}>
          <SelectTrigger>
            <SelectValue placeholder="Select document type" />
          </SelectTrigger>
          <SelectContent>
            {DOC_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
                {t.value === currentDefaults.docType && (
                  <span className="text-xs text-muted-foreground ml-2">(default)</span>
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="Brief description of this source..."
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Tags (comma-separated)</label>
        <Input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="aerospace, official, nasa"
        />
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting || !name}>
          {isSubmitting ? 'Saving...' : source ? 'Save Changes' : 'Create Source'}
        </Button>
      </div>
    </form>
  );
}

// Main Sources Page
export function Sources() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingSource, setEditingSource] = useState<Source | null>(null);
  const [deletingSource, setDeletingSource] = useState<Source | null>(null);

  const { data, isLoading } = useSourcesList({
    isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
    type: typeFilter === 'all' ? undefined : typeFilter,
  });

  const createSource = useCreateSource();
  const updateSource = useUpdateSource();
  const deleteSource = useDeleteSource();

  const handleCreateSource = (input: CreateSourceInput) => {
    createSource.mutate(input, {
      onSuccess: () => setShowAddDialog(false),
    });
  };

  const handleUpdateSource = (input: CreateSourceInput) => {
    if (!editingSource) return;
    updateSource.mutate({ id: editingSource.id, input }, {
      onSuccess: () => setEditingSource(null),
    });
  };

  const handleDeleteSource = () => {
    if (!deletingSource) return;
    deleteSource.mutate(deletingSource.id, {
      onSuccess: () => setDeletingSource(null),
    });
  };

  // Filter sources by search
  const filteredSources = data?.sources.filter((source) => {
    if (!search) return true;
    return source.name.toLowerCase().includes(search.toLowerCase()) ||
      source.description?.toLowerCase().includes(search.toLowerCase());
  }) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Database className="h-8 w-8" />
            Data Sources
          </h1>
          <p className="text-muted-foreground">
            Manage data sources, feeds, and URLs for the truth ledger pipeline
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Source
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search sources..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {SOURCE_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats summary */}
      {data && (
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{data.count} total sources</span>
          <span>|</span>
          <span>{filteredSources.filter(s => s.isActive).length} active</span>
          <span>|</span>
          <span>{filteredSources.reduce((sum, s) => sum + (s.feeds?.length || 0), 0)} feeds</span>
          <span>|</span>
          <span>{filteredSources.reduce((sum, s) => sum + (s.urls?.length || 0), 0)} URLs</span>
        </div>
      )}

      {/* Sources List */}
      {isLoading ? (
        <div className="grid gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : filteredSources.length > 0 ? (
        <div className="grid gap-4">
          {filteredSources.map((source) => (
            <SourceCard
              key={source.id}
              source={source}
              onEdit={setEditingSource}
              onDelete={setDeletingSource}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border rounded-lg">
          <Database className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No sources found</p>
          {search && (
            <p className="text-sm text-muted-foreground mt-2">
              Try adjusting your search or filters
            </p>
          )}
          <Button className="mt-4" onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Source
          </Button>
        </div>
      )}

      {/* Add Source Modal */}
      <Modal
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        title="Add New Source"
      >
        <p className="text-sm text-muted-foreground mb-4">
          Configure a new data source for the truth ledger
        </p>
        <SourceForm
          onSubmit={handleCreateSource}
          onCancel={() => setShowAddDialog(false)}
          isSubmitting={createSource.isPending}
        />
      </Modal>

      {/* Edit Source Modal */}
      <Modal
        open={!!editingSource}
        onClose={() => setEditingSource(null)}
        title="Edit Source"
      >
        <p className="text-sm text-muted-foreground mb-4">
          Update the source configuration
        </p>
        {editingSource && (
          <SourceForm
            source={editingSource}
            onSubmit={handleUpdateSource}
            onCancel={() => setEditingSource(null)}
            isSubmitting={updateSource.isPending}
          />
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={!!deletingSource}
        onClose={() => setDeletingSource(null)}
        title="Delete Source"
      >
        <div className="space-y-4">
          <p>
            Are you sure you want to delete <strong>{deletingSource?.name}</strong>?
          </p>
          <p className="text-destructive text-sm">
            This will permanently delete the source and all associated data including:
          </p>
          <ul className="list-disc list-inside text-sm text-destructive">
            <li>All feeds and URLs</li>
            <li>All documents from this source</li>
            <li>All snippets and claims</li>
            <li>All evidence linked to this source</li>
          </ul>
          <p className="font-medium text-sm">This action cannot be undone.</p>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setDeletingSource(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteSource}
              disabled={deleteSource.isPending}
            >
              {deleteSource.isPending ? 'Deleting...' : 'Delete Source'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
