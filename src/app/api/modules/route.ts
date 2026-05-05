import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';

// ── Validation Schemas ──────────────────────────────────────────

const createModuleSchema = z.object({
  name: z.string().min(2, 'Name is required').max(100),
  slug: z
    .string()
    .min(2, 'Slug is required')
    .max(50)
    .regex(/^[a-z0-9_]+$/, 'Slug must contain only lowercase letters, numbers, and underscores'),
  description: z.string().optional(),
  isActive: z.boolean().default(false),
  config: z.string().default('{}'),
  partnerId: z.string().optional(),
});

const toggleModuleSchema = z.object({
  id: z.string().min(1, 'Module ID is required'),
  isActive: z.boolean(),
});

// ── GET: List all modules ──────────────────────────────────────

export async function GET() {
  try {
    const modules = await db.module.findMany({
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: modules,
      count: modules.length,
    });
  } catch (error) {
    console.error('[Modules API] GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch modules' },
      { status: 500 }
    );
  }
}

// ── POST: Create a new module ──────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createModuleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { name, slug, description, isActive, config, partnerId } = parsed.data;

    // Check for duplicate slug
    const existingSlug = await db.module.findUnique({ where: { slug } });
    if (existingSlug) {
      return NextResponse.json(
        { error: 'A module with this slug already exists' },
        { status: 409 }
      );
    }

    // Check for duplicate name
    const existingName = await db.module.findUnique({ where: { name } });
    if (existingName) {
      return NextResponse.json(
        { error: 'A module with this name already exists' },
        { status: 409 }
      );
    }

    const modRecord = await db.module.create({
      data: {
        name,
        slug,
        description,
        isActive,
        config,
        partnerId,
      },
    });

    return NextResponse.json(
      { success: true, data: modRecord },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Modules API] POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to create module' },
      { status: 500 }
    );
  }
}

// ── PUT: Toggle module active status ───────────────────────────

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = toggleModuleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { id, isActive } = parsed.data;

    // Check module exists
    const existing = await db.module.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Module not found' },
        { status: 404 }
      );
    }

    const modRecord = await db.module.update({
      where: { id },
      data: { isActive },
    });

    return NextResponse.json({
      success: true,
      data: modRecord,
      message: isActive ? 'Module activated' : 'Module deactivated',
    });
  } catch (error) {
    console.error('[Modules API] PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to update module' },
      { status: 500 }
    );
  }
}
