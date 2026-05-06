import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';

// ── Validation Schemas ──────────────────────────────────────────

const aiConfigSchema = z.object({
  model_name: z.string().min(1, 'Model name is required'),
  system_prompt: z.string().min(10, 'System prompt must be at least 10 characters'),
  confidence_threshold: z.number().min(0).max(1).default(0.75),
  supported_languages: z.array(z.string().min(1)).default(['fr', 'en']),
  human_fallback_enabled: z.boolean().default(true),
  max_tokens: z.number().int().min(100).max(16000).default(2048),
  temperature: z.number().min(0).max(2).default(0.7),
});

// ── GET: Retrieve AI configuration from DB ──────────────────────

export async function GET() {
  try {
    const configs = await db.systemConfig.findMany({
      where: {
        key: {
          startsWith: 'ai_',
        },
      },
    });

    // Build config object from key-value pairs
    const configObj: Record<string, unknown> = {};
    for (const c of configs) {
      const cleanKey = c.key.replace('ai_', '');
      try {
        configObj[cleanKey] = JSON.parse(c.value);
      } catch {
        configObj[cleanKey] = c.value;
      }
    }

    // Provide defaults for missing keys
    const defaults = {
      model_name: 'llama-3.3-70b-versatile',
      system_prompt:
        "Tu es AeroAssist, l'assistant virtuel intelligent de l'aéroport. Tu aides les voyageurs en français (ou dans leur langue si demandé) avec les informations sur les vols, restaurants, boutiques, services et transports.",
      confidence_threshold: 0.75,
      supported_languages: ['fr', 'en'],
      human_fallback_enabled: true,
      max_tokens: 2048,
      temperature: 0.7,
    };

    return NextResponse.json({
      success: true,
      data: { ...defaults, ...configObj },
    });
  } catch (error) {
    console.error('[AI Config API] GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch AI config' },
      { status: 500 }
    );
  }
}

// ── PUT: Save AI configuration to DB ────────────────────────────

export async function PUT(request: NextRequest) {
  const traceId = crypto.randomUUID?.() || `trace_${Date.now()}`;

  try {
    const body = await request.json();
    const parsed = aiConfigSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const configData = parsed.data;

    // Upsert each config key as a SystemConfig row
    const operations = Object.entries(configData).map(([key, value]) =>
      db.systemConfig.upsert({
        where: { key: `ai_${key}` },
        update: {
          value: JSON.stringify(value),
          type: typeof value === 'boolean' ? 'boolean' : typeof value === 'number' ? 'number' : 'json',
        },
        create: {
          key: `ai_${key}`,
          value: JSON.stringify(value),
          type: typeof value === 'boolean' ? 'boolean' : typeof value === 'number' ? 'number' : 'json',
        },
      })
    );

    await Promise.all(operations);

    console.log(JSON.stringify({
      level: 'info',
      traceId,
      event: 'ai_config_updated',
      keys: Object.keys(configData),
    }));

    return NextResponse.json({
      success: true,
      data: configData,
      message: 'Configuration IA mise à jour avec succès',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(JSON.stringify({
      level: 'error',
      traceId,
      event: 'ai_config_update_error',
      error: message,
    }));

    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to save AI config' },
      { status: 500 }
    );
  }
}
