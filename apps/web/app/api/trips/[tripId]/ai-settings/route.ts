import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { requireTripAccess } from '@/lib/auth/guards';
import { getAISettings, updateAISettings, getOrCreateAISettings } from '@/lib/db/operations/ai-settings';
import { MODEL_REGISTRY, getModelsForRole, DEFAULT_AGENT_MODELS } from '@/lib/agents/model-registry';
import { AgentRole } from '@/lib/agents/types';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

function isValidObjectId(id: string): boolean {
  return /^[a-fA-F0-9]{24}$/.test(id);
}

type RouteParams = { params: Promise<{ tripId: string }> };

/**
 * GET /api/trips/[tripId]/ai-settings
 * Get AI settings for a trip, including available models
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<unknown>>> {
  try {
    const { tripId } = await params;

    if (!isValidObjectId(tripId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid tripId format' },
        { status: 400 }
      );
    }

    await requireTripAccess(tripId);

    const tripObjectId = new ObjectId(tripId);
    const settings = await getOrCreateAISettings(tripObjectId);

    // Get available models for each agent role
    const availableModels: Record<string, { id: string; name: string }[]> = {};
    const defaultModels: Record<string, string> = {};

    Object.values(AgentRole).forEach((role) => {
      const models = getModelsForRole(role);
      availableModels[role] = models.map((m) => ({ id: m.id, name: m.name }));
      defaultModels[role] = DEFAULT_AGENT_MODELS[role] || 'anthropic/claude-3.5-sonnet';
    });

    // Get all models for the global default selector
    const allModels = Object.values(MODEL_REGISTRY).map((m) => ({
      id: m.id,
      name: m.name,
      provider: m.provider,
      pricing: m.pricing,
    }));

    return NextResponse.json({
      success: true,
      data: {
        settings,
        availableModels,
        defaultModels,
        allModels,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'NEXT_REDIRECT' || error.message === 'Unauthorized') {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        );
      }
      if (error.message.startsWith('Forbidden:')) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 403 }
        );
      }
    }

    console.error('GET /api/trips/[tripId]/ai-settings error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/trips/[tripId]/ai-settings
 * Update AI settings for a trip
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<unknown>>> {
  try {
    const { tripId } = await params;

    if (!isValidObjectId(tripId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid tripId format' },
        { status: 400 }
      );
    }

    await requireTripAccess(tripId);

    const tripObjectId = new ObjectId(tripId);
    const body = await request.json();

    // Validate the update payload
    const { defaults, agents } = body;

    // Validate model IDs exist in registry
    if (defaults?.defaultModel && !MODEL_REGISTRY[defaults.defaultModel]) {
      return NextResponse.json(
        { success: false, error: `Invalid model: ${defaults.defaultModel}` },
        { status: 400 }
      );
    }

    if (agents) {
      for (const [role, config] of Object.entries(agents)) {
        if (!Object.values(AgentRole).includes(role as typeof AgentRole[keyof typeof AgentRole])) {
          return NextResponse.json(
            { success: false, error: `Invalid agent role: ${role}` },
            { status: 400 }
          );
        }
        const agentConfig = config as { model?: string };
        if (agentConfig.model && !MODEL_REGISTRY[agentConfig.model]) {
          return NextResponse.json(
            { success: false, error: `Invalid model for ${role}: ${agentConfig.model}` },
            { status: 400 }
          );
        }
        // Validate vision requirement for receipt_processor
        if (role === 'receipt_processor' && agentConfig.model) {
          const modelDef = MODEL_REGISTRY[agentConfig.model];
          if (modelDef && !modelDef.capabilities.vision) {
            return NextResponse.json(
              { success: false, error: `Model ${agentConfig.model} does not support vision, required for receipt processing` },
              { status: 400 }
            );
          }
        }
      }
    }

    const updated = await updateAISettings(tripObjectId, { defaults, agents });

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'NEXT_REDIRECT' || error.message === 'Unauthorized') {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        );
      }
      if (error.message.startsWith('Forbidden:')) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 403 }
        );
      }
    }

    console.error('PUT /api/trips/[tripId]/ai-settings error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
