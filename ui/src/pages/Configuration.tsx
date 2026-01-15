import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useEntities,
  useCreateEntity,
  useUpdateEntity,
  useDeleteEntity,
  useExtractorPatterns,
  useCreateExtractorPattern,
  useUpdateExtractorPattern,
  useDeleteExtractorPattern,
  useTestExtractorPattern,
} from '@/hooks/useApi';
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Cog,
  X,
  AlertCircle,
  TestTube,
  Copy,
  Database,
} from 'lucide-react';
import {
  ENTITY_TYPES,
  getEntityTypeOrDefault,
  getSortedEntityTypes,
  type EntityTypeValue,
} from '@/lib/entity-types';
import type {
  Entity,
  ExtractorPattern,
  CreateEntityInput,
  UpdateEntityInput,
  CreateExtractorPatternInput,
  UpdateExtractorPatternInput,
} from '@/lib/types';

// Tab type
type TabType = 'entities' | 'extractors';

// Modal Component
function Modal({ open, onClose, title, children, wide = false }: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className={`relative z-50 w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} max-h-[90vh] overflow-auto rounded-lg border bg-background p-6 shadow-lg`}>
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

// Toggle Button
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

// Entity Form
function EntityForm({ entity, onSubmit, onCancel, isSubmitting }: {
  entity?: Entity;
  onSubmit: (data: CreateEntityInput) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}) {
  const [canonicalName, setCanonicalName] = useState(entity?.name || '');
  const [entityType, setEntityType] = useState<EntityTypeValue>(
    (entity?.type as EntityTypeValue) || 'engine'
  );
  const [aliasesText, setAliasesText] = useState(entity?.aliases?.join(', ') || '');

  const sortedTypes = getSortedEntityTypes();
  const selectedType = getEntityTypeOrDefault(entityType);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const aliases = aliasesText.split(',').map(a => a.trim()).filter(a => a);
    onSubmit({
      canonicalName,
      entityType,
      aliases,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium">Canonical Name *</label>
        <Input
          value={canonicalName}
          onChange={e => setCanonicalName(e.target.value)}
          placeholder={`e.g., ${selectedType.examples[0] || 'Entity name'}`}
          required
        />
      </div>

      {!entity && (
        <div>
          <label className="text-sm font-medium">Type *</label>
          <Select value={entityType} onValueChange={(v: EntityTypeValue) => setEntityType(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sortedTypes.map(type => {
                const Icon = type.icon;
                return (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${type.color}`} />
                      <span>{type.label}</span>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">
            {selectedType.description}. Examples: {selectedType.examples.slice(0, 3).join(', ')}
          </p>
        </div>
      )}

      <div>
        <label className="text-sm font-medium">Aliases (comma separated)</label>
        <Input
          value={aliasesText}
          onChange={e => setAliasesText(e.target.value)}
          placeholder="e.g., Raptor V2, SpaceX Raptor 2"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Alternative names that should match to this entity
        </p>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting || !canonicalName}>
          {isSubmitting ? 'Saving...' : entity ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  );
}

// Extractor Pattern Form
function ExtractorPatternForm({ pattern, onSubmit, onCancel, isSubmitting }: {
  pattern?: ExtractorPattern;
  onSubmit: (data: CreateExtractorPatternInput) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}) {
  const [name, setName] = useState(pattern?.name || '');
  const [description, setDescription] = useState(pattern?.description || '');
  const [attributePattern, setAttributePattern] = useState(pattern?.attributePattern || '');
  const [entityType, setEntityType] = useState<EntityTypeValue | ''>(
    (pattern?.entityType as EntityTypeValue) || ''
  );
  const sortedTypes = getSortedEntityTypes();
  const [patternsText, setPatternsText] = useState(pattern?.patterns?.join('\n') || '');
  const [targetUnit, setTargetUnit] = useState(pattern?.targetUnit || '');
  const [unitConversionsText, setUnitConversionsText] = useState(
    pattern?.unitConversions ? JSON.stringify(pattern.unitConversions, null, 2) : '{}'
  );
  const [isActive, setIsActive] = useState(pattern?.isActive ?? true);
  const [priority, setPriority] = useState(pattern?.priority || 100);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Parse patterns
    const patterns = patternsText.split('\n').map(p => p.trim()).filter(p => p);
    if (patterns.length === 0) {
      setError('At least one pattern is required');
      return;
    }

    // Validate regex patterns
    for (const p of patterns) {
      try {
        new RegExp(p, 'i');
      } catch (e: any) {
        setError(`Invalid regex: ${p} - ${e.message}`);
        return;
      }
    }

    // Parse unit conversions
    let unitConversions: Record<string, number> = {};
    try {
      unitConversions = JSON.parse(unitConversionsText);
    } catch (e) {
      setError('Invalid JSON for unit conversions');
      return;
    }

    onSubmit({
      name,
      description: description || undefined,
      attributePattern,
      entityType: entityType || undefined,
      patterns,
      targetUnit: targetUnit || undefined,
      unitConversions,
      isActive,
      priority,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-destructive/10 text-destructive rounded-md flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Name *</label>
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g., Thrust Extractor"
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium">Attribute Pattern *</label>
          <Input
            value={attributePattern}
            onChange={e => setAttributePattern(e.target.value)}
            placeholder="e.g., engines.thrust_n"
            required
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">Description</label>
        <Input
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="What this extractor does"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="text-sm font-medium">Entity Type</label>
          <Select value={entityType} onValueChange={(v: EntityTypeValue | '') => setEntityType(v)}>
            <SelectTrigger>
              <SelectValue placeholder="Any" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Any</SelectItem>
              {sortedTypes.map(type => {
                const Icon = type.icon;
                return (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${type.color}`} />
                      <span>{type.label}</span>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium">Target Unit</label>
          <Input
            value={targetUnit}
            onChange={e => setTargetUnit(e.target.value)}
            placeholder="e.g., N, s, kg"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Priority</label>
          <Input
            type="number"
            value={priority}
            onChange={e => setPriority(parseInt(e.target.value) || 100)}
            min={1}
            max={1000}
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">Regex Patterns * (one per line)</label>
        <Textarea
          value={patternsText}
          onChange={e => setPatternsText(e.target.value)}
          placeholder={`(?:thrust)[:\\s]+(\\d+(?:,\\d{3})*(?:\\.\\d+)?)\\s*(n|kn|mn)?
(\\d+(?:,\\d{3})*(?:\\.\\d+)?)\\s*(kn|mn)\\s+thrust`}
          rows={5}
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Use capturing groups: (1) = value, (2) = unit (optional)
        </p>
      </div>

      <div>
        <label className="text-sm font-medium">Unit Conversions (JSON)</label>
        <Textarea
          value={unitConversionsText}
          onChange={e => setUnitConversionsText(e.target.value)}
          placeholder='{"n": 1, "kn": 1000, "mn": 1000000}'
          rows={3}
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Map of unit → conversion factor to target unit
        </p>
      </div>

      <div className="flex items-center gap-2">
        <ToggleButton checked={isActive} onChange={() => setIsActive(!isActive)} />
        <span className="text-sm">Active</span>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting || !name || !attributePattern}>
          {isSubmitting ? 'Saving...' : pattern ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  );
}

// Pattern Test Modal
function PatternTestModal({ pattern, open, onClose }: {
  pattern: ExtractorPattern;
  open: boolean;
  onClose: () => void;
}) {
  const [testText, setTestText] = useState('');
  const testMutation = useTestExtractorPattern();

  const handleTest = () => {
    if (testText.trim()) {
      testMutation.mutate({ id: pattern.id, text: testText });
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={`Test: ${pattern.name}`} wide>
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium">Sample Text</label>
          <Textarea
            value={testText}
            onChange={e => setTestText(e.target.value)}
            placeholder="Paste text to test extraction, e.g., 'The engine produces 2,300 kN of thrust...'"
            rows={4}
          />
        </div>

        <Button onClick={handleTest} disabled={!testText.trim() || testMutation.isPending}>
          <TestTube className="h-4 w-4 mr-2" />
          {testMutation.isPending ? 'Testing...' : 'Test Extraction'}
        </Button>

        {testMutation.data && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <h3 className="font-medium mb-2">
              Results: {testMutation.data.matchCount} match(es)
              {testMutation.data.targetUnit && ` → ${testMutation.data.targetUnit}`}
            </h3>
            {testMutation.data.matches.length > 0 ? (
              <div className="space-y-2">
                {testMutation.data.matches.map((match, i) => (
                  <div key={i} className="p-2 bg-background rounded border text-sm">
                    <div className="font-mono text-xs text-muted-foreground mb-1 truncate">
                      Pattern: {match.pattern.substring(0, 50)}...
                    </div>
                    <div>
                      <span className="font-medium">Match:</span> "{match.match}"
                    </div>
                    <div>
                      <span className="font-medium">Value:</span> {match.value}
                      {match.unit && <span className="text-muted-foreground"> {match.unit}</span>}
                      {match.convertedValue !== null && match.convertedValue !== match.value && (
                        <span className="text-green-600 ml-2">
                          → {match.convertedValue.toLocaleString()} {testMutation.data?.targetUnit}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No matches found</p>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

// Entities Tab Content
function EntitiesTab() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Entity | null>(null);

  const { data: entities, isLoading } = useEntities({
    type: typeFilter !== 'all' ? typeFilter : undefined,
    name: search || undefined,
    limit: 200,
  });

  const createMutation = useCreateEntity();
  const updateMutation = useUpdateEntity();
  const deleteMutation = useDeleteEntity();

  const filteredEntities = entities || [];

  const handleCreate = async (data: CreateEntityInput) => {
    await createMutation.mutateAsync(data);
    setShowForm(false);
  };

  const handleUpdate = async (data: UpdateEntityInput) => {
    if (editingEntity) {
      await updateMutation.mutateAsync({ id: editingEntity.id, input: data });
      setEditingEntity(null);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirm) {
      try {
        await deleteMutation.mutateAsync(deleteConfirm.id);
        setDeleteConfirm(null);
      } catch (e: any) {
        alert(e.response?.data?.error || 'Failed to delete entity');
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search entities..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {getSortedEntityTypes().map(type => {
                const Icon = type.icon;
                return (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${type.color}`} />
                      <span>{type.labelPlural}</span>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Entity
        </Button>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-2">
        {ENTITY_TYPES.filter(type => {
          const count = filteredEntities.filter(e => e.type === type.value).length;
          return count > 0;
        }).map(type => {
          const Icon = type.icon;
          const count = filteredEntities.filter(e => e.type === type.value).length;
          return (
            <Badge key={type.value} variant="outline" className={type.bgColor}>
              <Icon className={`h-3 w-3 mr-1 ${type.color}`} />
              {count} {count === 1 ? type.label : type.labelPlural}
            </Badge>
          );
        })}
      </div>

      {/* Entity List */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredEntities.map(entity => {
            const entityTypeConfig = getEntityTypeOrDefault(entity.type);
            const Icon = entityTypeConfig.icon;
            return (
              <Card key={entity.id} className="hover:bg-muted/50 transition-colors">
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-full ${entityTypeConfig.bgColor}`}>
                      <Icon className={`h-5 w-5 ${entityTypeConfig.color}`} />
                    </div>
                    <div>
                      <div className="font-medium">{entity.name}</div>
                      {entity.aliases && entity.aliases.length > 0 && (
                        <div className="text-sm text-muted-foreground">
                          Aliases: {entity.aliases.join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className={entityTypeConfig.bgColor}>
                      <Icon className={`h-3 w-3 mr-1 ${entityTypeConfig.color}`} />
                      {entityTypeConfig.label}
                    </Badge>
                    <Button variant="ghost" size="icon" onClick={() => setEditingEntity(entity)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteConfirm(entity)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {filteredEntities.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No entities found
            </div>
          )}
        </div>
      )}

      {/* Create Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Add Entity">
        <EntityForm
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
          isSubmitting={createMutation.isPending}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal
        open={!!editingEntity}
        onClose={() => setEditingEntity(null)}
        title="Edit Entity"
      >
        {editingEntity && (
          <EntityForm
            entity={editingEntity}
            onSubmit={handleUpdate}
            onCancel={() => setEditingEntity(null)}
            isSubmitting={updateMutation.isPending}
          />
        )}
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Entity"
      >
        <div className="space-y-4">
          <p>Are you sure you want to delete <strong>{deleteConfirm?.name}</strong>?</p>
          <p className="text-sm text-muted-foreground">
            This action cannot be undone. Entities with associated claims cannot be deleted.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// Extractors Tab Content
function ExtractorsTab() {
  const [showForm, setShowForm] = useState(false);
  const [editingPattern, setEditingPattern] = useState<ExtractorPattern | null>(null);
  const [testingPattern, setTestingPattern] = useState<ExtractorPattern | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<ExtractorPattern | null>(null);

  const { data, isLoading } = useExtractorPatterns();
  const patterns = data?.patterns || [];

  const createMutation = useCreateExtractorPattern();
  const updateMutation = useUpdateExtractorPattern();
  const deleteMutation = useDeleteExtractorPattern();

  const handleCreate = async (data: CreateExtractorPatternInput) => {
    await createMutation.mutateAsync(data);
    setShowForm(false);
  };

  const handleUpdate = async (data: UpdateExtractorPatternInput) => {
    if (editingPattern) {
      await updateMutation.mutateAsync({ id: editingPattern.id, input: data });
      setEditingPattern(null);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirm) {
      await deleteMutation.mutateAsync(deleteConfirm.id);
      setDeleteConfirm(null);
    }
  };

  const copyPattern = (pattern: ExtractorPattern) => {
    const copy = {
      name: `${pattern.name} (Copy)`,
      description: pattern.description,
      attributePattern: pattern.attributePattern,
      entityType: pattern.entityType,
      patterns: pattern.patterns,
      targetUnit: pattern.targetUnit,
      unitConversions: pattern.unitConversions,
      isActive: false,
      priority: pattern.priority,
    };
    navigator.clipboard.writeText(JSON.stringify(copy, null, 2));
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Badge variant="outline">
            {patterns.filter(p => p.isActive).length} Active
          </Badge>
          <Badge variant="secondary">
            {patterns.length} Total
          </Badge>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Pattern
        </Button>
      </div>

      {/* Pattern List */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : (
        <div className="space-y-3">
          {patterns.map(pattern => (
            <Card key={pattern.id} className={!pattern.isActive ? 'opacity-60' : ''}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-base">{pattern.name}</CardTitle>
                    {pattern.isActive ? (
                      <Badge variant="default" className="bg-green-500">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                    {pattern.entityType && (
                      <Badge variant="outline">{pattern.entityType}</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setTestingPattern(pattern)}>
                      <TestTube className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => copyPattern(pattern)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setEditingPattern(pattern)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteConfirm(pattern)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                {pattern.description && (
                  <CardDescription>{pattern.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Attribute:</span>{' '}
                    <code className="text-xs bg-muted px-1 rounded">{pattern.attributePattern}</code>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Target Unit:</span>{' '}
                    {pattern.targetUnit || 'None'}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Priority:</span>{' '}
                    {pattern.priority}
                  </div>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {pattern.patterns.length} pattern(s)
                </div>
              </CardContent>
            </Card>
          ))}
          {patterns.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No extractor patterns configured
            </div>
          )}
        </div>
      )}

      {/* Create Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Add Extractor Pattern" wide>
        <ExtractorPatternForm
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
          isSubmitting={createMutation.isPending}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal
        open={!!editingPattern}
        onClose={() => setEditingPattern(null)}
        title="Edit Extractor Pattern"
        wide
      >
        {editingPattern && (
          <ExtractorPatternForm
            pattern={editingPattern}
            onSubmit={handleUpdate}
            onCancel={() => setEditingPattern(null)}
            isSubmitting={updateMutation.isPending}
          />
        )}
      </Modal>

      {/* Test Modal */}
      {testingPattern && (
        <PatternTestModal
          pattern={testingPattern}
          open={!!testingPattern}
          onClose={() => setTestingPattern(null)}
        />
      )}

      {/* Delete Confirmation */}
      <Modal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Pattern"
      >
        <div className="space-y-4">
          <p>Are you sure you want to delete <strong>{deleteConfirm?.name}</strong>?</p>
          <p className="text-sm text-muted-foreground">
            This will remove the extractor pattern from the database.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// Main Configuration Page
export default function Configuration() {
  const [activeTab, setActiveTab] = useState<TabType>('entities');

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Cog className="h-6 w-6" />
          Configuration
        </h1>
        <p className="text-muted-foreground">
          Manage entities and extraction patterns for the truth ledger
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        <button
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'entities'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('entities')}
        >
          <Database className="h-4 w-4 inline mr-2" />
          Entities
        </button>
        <button
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'extractors'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('extractors')}
        >
          <Cog className="h-4 w-4 inline mr-2" />
          Extractor Patterns
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'entities' ? <EntitiesTab /> : <ExtractorsTab />}
    </div>
  );
}
