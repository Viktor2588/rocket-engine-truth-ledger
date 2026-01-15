import { useState } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Database,
  FileText,
  MessageSquare,
  Lightbulb,
  Link2,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useSourcePipelineStats,
  useSourceDocuments,
  useDocumentSnippets,
  useSnippetClaims,
  useClaimEvidence,
} from '@/hooks/useApi';
import type { SourceWithPipelineStats } from '@/lib/types';

export function PipelineTreeView() {
  const { data: sourceStats, isLoading, error } = useSourcePipelineStats();
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Pipeline Data Explorer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
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
          <p className="text-red-600">Failed to load pipeline data</p>
        </CardContent>
      </Card>
    );
  }

  if (!sourceStats) return null;

  const activeSources = sourceStats.sources.filter(
    (s) => s.isActive && s.stats.documents > 0
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Pipeline Data Explorer
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Click to expand and explore the data lineage from sources to evidence
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {activeSources.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No sources with data to explore
            </div>
          ) : (
            activeSources.map((source) => (
              <SourceNode
                key={source.id}
                source={source}
                expandedNodes={expandedNodes}
                toggleNode={toggleNode}
              />
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Source Level Node
function SourceNode({
  source,
  expandedNodes,
  toggleNode,
}: {
  source: SourceWithPipelineStats;
  expandedNodes: Set<string>;
  toggleNode: (id: string) => void;
}) {
  const nodeId = `source-${source.id}`;
  const isExpanded = expandedNodes.has(nodeId);

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => toggleNode(nodeId)}
        className="w-full flex items-center gap-2 p-3 hover:bg-muted/50 transition-colors text-left"
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
        <Database className="h-4 w-4 text-blue-500 shrink-0" />
        <span className="font-medium flex-1">{source.name}</span>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {source.stats.documents} docs
          </Badge>
          <Badge variant="outline" className="text-xs">
            {source.stats.snippets} snippets
          </Badge>
          <Badge variant="outline" className="text-xs">
            {source.stats.claims} claims
          </Badge>
        </div>
      </button>

      {isExpanded && (
        <div className="border-t bg-muted/20 pl-6 py-2">
          <DocumentList sourceId={source.id} expandedNodes={expandedNodes} toggleNode={toggleNode} />
        </div>
      )}
    </div>
  );
}

// Document List (lazy loaded with real API data)
function DocumentList({
  sourceId,
  expandedNodes,
  toggleNode,
}: {
  sourceId: string;
  expandedNodes: Set<string>;
  toggleNode: (id: string) => void;
}) {
  const { data, isLoading } = useSourceDocuments(sourceId, 20);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground p-2">
        <Loader2 className="h-3 w-3 animate-spin" />
        Loading documents...
      </div>
    );
  }

  if (!data?.documents || data.documents.length === 0) {
    return (
      <div className="text-xs text-muted-foreground p-2 italic">
        No documents found for this source
      </div>
    );
  }

  return (
    <div className="space-y-1 py-2">
      <div className="text-xs text-muted-foreground px-2 mb-2">
        {data.total} documents from this source (showing {data.documents.length})
      </div>
      {data.documents.map((doc) => (
        <DocumentNode
          key={doc.id}
          document={doc}
          expandedNodes={expandedNodes}
          toggleNode={toggleNode}
        />
      ))}
    </div>
  );
}

// Document Node
function DocumentNode({
  document,
  expandedNodes,
  toggleNode,
}: {
  document: {
    id: string;
    title: string;
    url: string;
    docType: string;
    snippetCount: number;
  };
  expandedNodes: Set<string>;
  toggleNode: (id: string) => void;
}) {
  const nodeId = `doc-${document.id}`;
  const isExpanded = expandedNodes.has(nodeId);
  const { data, isLoading } = useDocumentSnippets(isExpanded ? document.id : '', 20);

  return (
    <div className="border-l-2 border-blue-200 ml-2">
      <button
        onClick={() => toggleNode(nodeId)}
        className="w-full flex items-center gap-2 p-2 hover:bg-muted/50 transition-colors text-left text-sm"
      >
        {isExpanded ? (
          <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
        )}
        <FileText className="h-3 w-3 text-blue-500 shrink-0" />
        <span className="flex-1 truncate" title={document.title}>
          {document.title || 'Untitled Document'}
        </span>
        <Badge variant="outline" className="text-[10px] shrink-0">
          {document.snippetCount} snippets
        </Badge>
      </button>

      {isExpanded && (
        <div className="pl-6 py-1 space-y-1">
          {document.url && (
            <div className="text-xs text-muted-foreground px-2 pb-2">
              <a
                href={document.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline flex items-center gap-1"
              >
                <ExternalLink className="h-3 w-3" />
                View source
              </a>
            </div>
          )}
          {isLoading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground p-2">
              <Loader2 className="h-3 w-3 animate-spin" />
              Loading snippets...
            </div>
          ) : data?.snippets && data.snippets.length > 0 ? (
            data.snippets.map((snippet) => (
              <SnippetNode
                key={snippet.id}
                snippet={snippet}
                expandedNodes={expandedNodes}
                toggleNode={toggleNode}
              />
            ))
          ) : (
            <div className="text-xs text-muted-foreground p-2 italic">
              No snippets found for this document
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Snippet Node
function SnippetNode({
  snippet,
  expandedNodes,
  toggleNode,
}: {
  snippet: { id: string; text: string; snippetType: string; locator: string };
  expandedNodes: Set<string>;
  toggleNode: (id: string) => void;
}) {
  const nodeId = `snippet-${snippet.id}`;
  const isExpanded = expandedNodes.has(nodeId);
  const { data, isLoading } = useSnippetClaims(isExpanded ? snippet.id : '');

  return (
    <div className="border-l-2 border-violet-200 ml-2">
      <button
        onClick={() => toggleNode(nodeId)}
        className="w-full flex items-center gap-2 p-2 hover:bg-muted/50 transition-colors text-left text-xs"
      >
        {isExpanded ? (
          <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
        )}
        <MessageSquare className="h-3 w-3 text-violet-500 shrink-0" />
        <span className="flex-1 truncate">{snippet.text.slice(0, 50)}...</span>
        <Badge variant="secondary" className="text-[10px]">
          {snippet.snippetType}
        </Badge>
      </button>

      {isExpanded && (
        <div className="pl-6 py-1 space-y-1">
          <div className="text-xs bg-muted/50 p-2 rounded mb-2 line-clamp-3">
            {snippet.text}
          </div>
          {isLoading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground p-2">
              <Loader2 className="h-3 w-3 animate-spin" />
              Loading claims...
            </div>
          ) : data?.claims && data.claims.length > 0 ? (
            data.claims.map((claim) => (
              <ClaimNode
                key={claim.id}
                claim={claim}
                expandedNodes={expandedNodes}
                toggleNode={toggleNode}
              />
            ))
          ) : (
            <div className="text-xs text-muted-foreground p-2 italic">
              No claims extracted from this snippet
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Claim Node
function ClaimNode({
  claim,
  expandedNodes,
  toggleNode,
}: {
  claim: {
    id: string;
    valueJson: unknown;
    unit: string | null;
    entityName: string | null;
    attributeName: string | null;
    stance: string;
    confidence: number;
    quote: string;
  };
  expandedNodes: Set<string>;
  toggleNode: (id: string) => void;
}) {
  const nodeId = `claim-${claim.id}`;
  const isExpanded = expandedNodes.has(nodeId);
  const { data, isLoading } = useClaimEvidence(isExpanded ? claim.id : '');

  return (
    <div className="border-l-2 border-green-200 ml-2">
      <button
        onClick={() => toggleNode(nodeId)}
        className="w-full flex items-center gap-2 p-2 hover:bg-muted/50 transition-colors text-left text-xs"
      >
        {isExpanded ? (
          <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
        )}
        <Lightbulb className="h-3 w-3 text-green-500 shrink-0" />
        <span className="flex-1">
          <span className="font-medium">{claim.entityName || 'Unknown'}</span>
          <span className="text-muted-foreground"> / {claim.attributeName || 'Unknown'}</span>
        </span>
        <Badge
          variant={claim.stance === 'supports' ? 'default' : claim.stance === 'contradicts' ? 'destructive' : 'secondary'}
          className="text-[10px]"
        >
          {claim.stance}
        </Badge>
      </button>

      {isExpanded && (
        <div className="pl-6 py-1 space-y-2">
          <div className="bg-muted/50 p-2 rounded text-xs">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium">Value:</span>
              <code className="bg-background px-1 rounded">
                {JSON.stringify(claim.valueJson)}
                {claim.unit && ` ${claim.unit}`}
              </code>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium">Confidence:</span>
              <span>{(claim.confidence * 100).toFixed(0)}%</span>
            </div>
            {claim.quote && (
              <div className="mt-2 italic text-muted-foreground">
                "{claim.quote}"
              </div>
            )}
          </div>

          <div className="text-xs font-medium text-muted-foreground">Evidence:</div>
          {isLoading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground p-2">
              <Loader2 className="h-3 w-3 animate-spin" />
              Loading evidence...
            </div>
          ) : data?.evidence && data.evidence.length > 0 ? (
            data.evidence.map((ev) => (
              <EvidenceNode key={ev.id} evidence={ev} />
            ))
          ) : (
            <div className="text-xs text-muted-foreground p-2 italic">
              No evidence linked to this claim
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Evidence Node (leaf node)
function EvidenceNode({
  evidence,
}: {
  evidence: {
    id: string;
    quote: string;
    stance: string;
    confidence: number;
    documentTitle: string;
    documentUrl: string;
    sourceName: string;
  };
}) {
  return (
    <div className="border-l-2 border-orange-200 ml-2 p-2 bg-muted/30 rounded-r text-xs">
      <div className="flex items-center gap-2 mb-1">
        <Link2 className="h-3 w-3 text-orange-500 shrink-0" />
        <span className="font-medium">{evidence.sourceName}</span>
        <Badge
          variant={evidence.stance === 'supports' ? 'default' : evidence.stance === 'contradicts' ? 'destructive' : 'secondary'}
          className="text-[10px]"
        >
          {evidence.stance}
        </Badge>
        <span className="text-muted-foreground">
          {(evidence.confidence * 100).toFixed(0)}% confidence
        </span>
      </div>
      <div className="italic text-muted-foreground mb-1">"{evidence.quote}"</div>
      <div className="flex items-center gap-1 text-muted-foreground">
        <span className="truncate">{evidence.documentTitle}</span>
        {evidence.documentUrl && (
          <a
            href={evidence.documentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline shrink-0"
          >
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </div>
  );
}
