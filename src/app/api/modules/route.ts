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

const updateModuleSchema = z.object({
  id: z.string().min(1, 'Module ID is required'),
  name: z.string().min(2).max(100).optional(),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9_]+$/).optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
  config: z.string().optional(),
  partnerId: z.string().optional(),
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

    const existingSlug = await db.module.findUnique({ where: { slug } });
    if (existingSlug) {
      return NextResponse.json(
        { error: 'A module with this slug already exists' },
        { status: 409 }
      );
    }

    const existingName = await db.module.findUnique({ where: { name } });
    if (existingName) {
      return NextResponse.json(
        { error: 'A module with this name already exists' },
        { status: 409 }
      );
    }

    const modRecord = await db.module.create({
      data: { name, slug, description, isActive, config, partnerId },
    });

    return NextResponse.json({ success: true, data: modRecord }, { status: 201 });
  } catch (error) {
    console.error('[Modules API] POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to create module' },
      { status: 500 }
    );
  }
}

// ── PUT: Update module (toggle status AND/OR update config) ─────

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = updateModuleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { id, ...updateData } = parsed.data;

    const existing = await db.module.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Module not found' },
        { status: 404 }
      );
    }

    // If slug is being updated, check uniqueness
    if (updateData.slug && updateData.slug !== existing.slug) {
      const slugExists = await db.module.findUnique({ where: { slug: updateData.slug } });
      if (slugExists) {
        return NextResponse.json(
          { error: 'A module with this slug already exists' },
          { status: 409 }
        );
      }
    }

    // If name is being updated, check uniqueness
    if (updateData.name && updateData.name !== existing.name) {
      const nameExists = await db.module.findUnique({ where: { name: updateData.name } });
      if (nameExists) {
        return NextResponse.json(
          { error: 'A module with this name already exists' },
          { status: 409 }
        );
      }
    }

    // Validate config JSON if provided
    if (updateData.config) {
      try {
        JSON.parse(updateData.config);
      } catch {
        return NextResponse.json(
          { error: 'Invalid config JSON string' },
          { status: 400 }
        );
      }
    }

    const modRecord = await db.module.update({
      where: { id },
      data: updateData,
    });

    const message = updateData.isActive !== undefined
      ? updateData.isActive ? 'Module activated' : 'Module deactivated'
      : 'Module updated';

    return NextResponse.json({
      success: true,
      data: modRecord,
      message,
    });
  } catch (error) {
    console.error('[Modules API] PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to update module' },
      { status: 500 }
    );
  }
}
