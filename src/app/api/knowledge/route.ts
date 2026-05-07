import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/security';
import { logger } from '@/lib/logger';

// ── Validation Schemas ──────────────────────────────────────────

const createEntrySchema = z.object({
  title: z.string().min(2, 'Title is required').max(200),
  content: z.string().min(10, 'Content must be at least 10 characters'),
  source: z.string().optional(),
  category: z
    .enum(['flights', 'services', 'restaurants', 'shops', 'transport', 'general'])
    .default('general'),
  status: z.enum(['draft', 'validated', 'published']).default('draft'),
});

const updateEntrySchema = z.object({
  title: z.string().min(2).max(200).optional(),
  content: z.string().min(10).optional(),
  source: z.string().optional(),
  category: z
    .enum(['flights', 'services', 'restaurants', 'shops', 'transport', 'general'])
    .optional(),
  status: z.enum(['draft', 'validated', 'published', 'archived']).optional(),
  version: z.number().int().positive().optional(),
  chunkCount: z.number().int().min(1).optional(),
  ownerId: z.string().optional(),
});

const knowledgeQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  category: z
    .enum(['flights', 'services', 'restaurants', 'shops', 'transport', 'general'])
    .optional(),
  status: z.enum(['draft', 'validated', 'published', 'archived']).optional(),
  search: z.string().optional(),
});

// ── GET: List knowledge base entries ───────────────────────────

export async function GET(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const queryParams = {
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
      category: searchParams.get('category') || undefined,
      status: searchParams.get('status') || undefined,
      search: searchParams.get('search') || undefined,
    };

    const parsed = knowledgeQuerySchema.safeParse(queryParams);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { page, limit, category, status, search } = parsed.data;
    const skip = (page - 1) * limit;

    const where = {
      ...(category && { category }),
      ...(status && { status }),
      ...(search && {
        OR: [
          { title: { contains: search } },
          { content: { contains: search } },
        ],
      }),
    };

    const [entries, total] = await Promise.all([
      db.knowledgeBaseEntry.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          owner: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      db.knowledgeBaseEntry.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: entries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('[Knowledge API] GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch knowledge entries' },
      { status: 500 }
    );
  }
}

// ── POST: Create a new knowledge base entry ────────────────────

export async function POST(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const parsed = createEntrySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { title, content, source, category, status } = parsed.data;

    const entry = await db.knowledgeBaseEntry.create({
      data: {
        title,
        content,
        source,
        category,
        status: status as 'draft' | 'validated' | 'published',
        publishedAt: status === 'published' ? new Date() : null,
      },
    });

    return NextResponse.json(
      { success: true, data: entry },
      { status: 201 }
    );
  } catch (error) {
    logger.error('[Knowledge API] POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to create knowledge entry' },
      { status: 500 }
    );
  }
}

// ── PUT: Update a knowledge base entry ─────────────────────────

export async function PUT(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Entry ID is required' },
        { status: 400 }
      );
    }

    const parsed = updateEntrySchema.safeParse(updateData);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    // If publishing, set publishedAt
    const data: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.status === 'published') {
      data.publishedAt = new Date();
    }

    // Increment version on content changes
    if (parsed.data.content) {
      const current = await db.knowledgeBaseEntry.findUnique({
        where: { id },
        select: { version: true },
      });
      if (current) {
        data.version = current.version + 1;
      }
    }

    const entry = await db.knowledgeBaseEntry.update({
      where: { id },
      data,
    });

    return NextResponse.json({ success: true, data: entry });
  } catch (error) {
    logger.error('[Knowledge API] PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to update knowledge entry' },
      { status: 500 }
    );
  }
}

// ── DELETE: Archive a knowledge base entry ──────────────────────

export async function DELETE(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Entry ID is required as query parameter' },
        { status: 400 }
      );
    }

    // Check if entry exists
    const existing = await db.knowledgeBaseEntry.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Knowledge entry not found' },
        { status: 404 }
      );
    }

    if (existing.status === 'archived') {
      return NextResponse.json(
        { error: 'Entry is already archived' },
        { status: 400 }
      );
    }

    // Archive (soft delete) by setting status
    const entry = await db.knowledgeBaseEntry.update({
      where: { id },
      data: { status: 'archived' },
    });

    return NextResponse.json({
      success: true,
      data: entry,
      message: 'Entry archived successfully',
    });
  } catch (error) {
    logger.error('[Knowledge API] DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to archive knowledge entry' },
      { status: 500 }
    );
  }
}
