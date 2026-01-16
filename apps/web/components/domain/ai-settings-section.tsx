'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Select, Spinner } from '@/components/ui';

interface ModelOption {
  id: string;
  name: string;
  provider?: string;
  pricing?: {
    inputPer1k: number;
    outputPer1k: number;
  };
}

interface AgentConfig {
  model?: string;
  enabled?: boolean;
}

interface AISettingsData {
  settings: {
    _id: string;
    tripId: string;
    defaults?: {
      defaultModel?: string;
      fallbackEnabled?: boolean;
    };
    agents?: Record<string, AgentConfig>;
  };
  availableModels: Record<string, ModelOption[]>;
  defaultModels: Record<string, string>;
  allModels: ModelOption[];
}

interface AISettingsSectionProps {
  tripId: string;
}

const AGENT_DISPLAY_NAMES: Record<string, string> = {
  receipt_processor: 'Receipt Processor',
  payment_assistant: 'Payment Assistant',
  expense_reconciler: 'Expense Reconciler',
  gallery_organizer: 'Gallery Organizer',
  activity_recommender: 'Activity Recommender',
  poll_decision: 'Poll Decision',
};

const AGENT_DESCRIPTIONS: Record<string, string> = {
  receipt_processor: 'Extracts expense data from receipt images (requires vision)',
  payment_assistant: 'Calculates payment splits and suggests settlements',
  expense_reconciler: 'Identifies expense discrepancies and duplicates',
  gallery_organizer: 'Suggests tags and albums for media organization',
  activity_recommender: 'Recommends activities based on location and preferences',
  poll_decision: 'Analyzes poll results and provides insights',
};

function formatPrice(price: number): string {
  return `$${price.toFixed(4)}`;
}

export function AISettingsSection({ tripId }: AISettingsSectionProps) {
  const [data, setData] = useState<AISettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Local state for edits
  const [defaultModel, setDefaultModel] = useState<string>('');
  const [fallbackEnabled, setFallbackEnabled] = useState(true);
  const [agentModels, setAgentModels] = useState<Record<string, string>>({});

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/trips/${tripId}/ai-settings`);
      if (!response.ok) {
        throw new Error('Failed to load AI settings');
      }
      const result = await response.json();
      setData(result.data);

      // Initialize local state
      const settings = result.data.settings;
      setDefaultModel(settings.defaults?.defaultModel || 'anthropic/claude-3.5-sonnet');
      setFallbackEnabled(settings.defaults?.fallbackEnabled !== false);

      // Initialize agent models with current or default values
      const models: Record<string, string> = {};
      Object.keys(result.data.defaultModels).forEach((role) => {
        models[role] = settings.agents?.[role]?.model || result.data.defaultModels[role];
      });
      setAgentModels(models);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async () => {
    if (!data) return;

    try {
      setSaving(true);
      setError(null);

      const payload = {
        defaults: {
          defaultModel,
          fallbackEnabled,
        },
        agents: Object.entries(agentModels).reduce(
          (acc, [role, model]) => {
            // Only include if different from default
            if (model !== data.defaultModels[role]) {
              acc[role] = { model };
            }
            return acc;
          },
          {} as Record<string, AgentConfig>
        ),
      };

      const response = await fetch(`/api/trips/${tripId}/ai-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to save settings');
      }

      setHasChanges(false);
      await fetchSettings();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!data) return;
    setDefaultModel(data.settings.defaults?.defaultModel || 'anthropic/claude-3.5-sonnet');
    setFallbackEnabled(data.settings.defaults?.fallbackEnabled !== false);
    const models: Record<string, string> = {};
    Object.keys(data.defaultModels).forEach((role) => {
      models[role] = data.settings.agents?.[role]?.model || data.defaultModels[role];
    });
    setAgentModels(models);
    setHasChanges(false);
  };

  const updateAgentModel = (role: string, model: string) => {
    setAgentModels((prev) => ({ ...prev, [role]: model }));
    setHasChanges(true);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
        <Spinner size="lg" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <Card>
        <CardContent>
          <p style={{ color: '#dc2626', textAlign: 'center', padding: 20 }}>{error}</p>
          <Button onClick={fetchSettings} variant="outline" style={{ margin: '0 auto', display: 'block' }}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const globalModelOptions = data.allModels.map((m) => ({
    value: m.id,
    label: `${m.name} (${formatPrice(m.pricing?.inputPer1k || 0)}/1k in)`,
  }));

  return (
    <div className="ai-settings-section" data-testid="ai-settings-section">
      {error && (
        <div style={{ marginBottom: 16, padding: 12, backgroundColor: '#fef2f2', borderRadius: 4, color: '#dc2626' }}>
          {error}
        </div>
      )}

      {/* Global Defaults */}
      <Card style={{ marginBottom: 24 }}>
        <CardHeader>
          <CardTitle>Global AI Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ marginBottom: 16 }}>
            <Select
              label="Default Model"
              id="default-model"
              value={defaultModel}
              onChange={(e) => {
                setDefaultModel(e.target.value);
                setHasChanges(true);
              }}
              options={globalModelOptions}
            />
            <p style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
              Used when no agent-specific model is configured
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              id="fallback-enabled"
              checked={fallbackEnabled}
              onChange={(e) => {
                setFallbackEnabled(e.target.checked);
                setHasChanges(true);
              }}
            />
            <label htmlFor="fallback-enabled" style={{ cursor: 'pointer' }}>
              Enable automatic fallback on errors
            </label>
          </div>
          <p style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
            Automatically retry with alternative models on rate limits or errors
          </p>
        </CardContent>
      </Card>

      {/* Per-Agent Settings */}
      <Card style={{ marginBottom: 24 }}>
        <CardHeader>
          <CardTitle>Agent-Specific Models</CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {Object.entries(AGENT_DISPLAY_NAMES).map(([role, displayName]) => {
              const availableModels = data.availableModels[role] || [];
              const currentModel = agentModels[role] || data.defaultModels[role];
              const isDefault = currentModel === data.defaultModels[role];

              const modelOptions = availableModels.map((m) => ({
                value: m.id,
                label: m.name,
              }));

              return (
                <div key={role} style={{ borderBottom: '1px solid #eee', paddingBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <strong>{displayName}</strong>
                      {!isDefault && (
                        <span style={{ marginLeft: 8, fontSize: 11, color: '#0ea5e9', backgroundColor: '#e0f2fe', padding: '2px 6px', borderRadius: 4 }}>
                          Custom
                        </span>
                      )}
                      <p style={{ fontSize: 12, color: '#666', margin: '4px 0 0' }}>
                        {AGENT_DESCRIPTIONS[role]}
                      </p>
                    </div>
                  </div>
                  <Select
                    label=""
                    id={`agent-model-${role}`}
                    value={currentModel}
                    onChange={(e) => updateAgentModel(role, e.target.value)}
                    options={modelOptions}
                  />
                  <p style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
                    Default: {data.defaultModels[role]}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Save/Reset Buttons */}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
        <Button variant="secondary" onClick={handleReset} disabled={!hasChanges || saving}>
          Reset
        </Button>
        <Button variant="primary" onClick={handleSave} disabled={!hasChanges || saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
