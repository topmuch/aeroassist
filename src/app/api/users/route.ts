import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/security';
import { logger } from '@/lib/logger';

// ── Validation Schemas ──────────────────────────────────────────

const createUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  role: z.enum(['traveler', 'partner', 'admin', 'superadmin']).default('traveler'),
  language: z.string().length(2).default('fr'),
});

const updateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  role: z.enum(['traveler', 'partner', 'admin', 'superadmin']).optional(),
  language: z.string().length(2).optional(),
  isVerified: z.boolean().optional(),
  avatar: z.string().optional(),
});

const toggleActiveSchema = z.object({
  isActive: z.boolean(),
});

const userQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  role: z.enum(['traveler', 'partner', 'admin', 'superadmin']).optional(),
  search: z.string().optional(),
});

// ── GET: List users with pagination and filters ────────────────

export async function GET(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const queryParams = {
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
      role: searchParams.get('role') || undefined,
      search: searchParams.get('search') || undefined,
    };

    const parsed = userQuerySchema.safeParse(queryParams);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { page, limit, role, search } = parsed.data;
    const skip = (page - 1) * limit;

    const where = {
      ...(role && { role }),
      ...(search && {
        OR: [
          { name: { contains: search } },
          { email: { contains: search } },
          { phone: { contains: search } },
        ],
      }),
    };

    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          avatar: true,
          language: true,
          isVerified: true,
          isActive: true,
          lastLogin: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              conversations: true,
              reservations: true,
            },
          },
        },
      }),
      db.user.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('[Users API] GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// ── POST: Create a new user ────────────────────────────────────

export async function POST(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const parsed = createUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { name, email, phone, role, language } = parsed.data;

    // Check for existing email
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 409 }
      );
    }

    const user = await db.user.create({
      data: {
        name,
        email,
        phone,
        role,
        language,
      },
    });

    return NextResponse.json(
      { success: true, data: user },
      { status: 201 }
    );
  } catch (error) {
    logger.error('[Users API] POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to create user' },
      { status: 500 }
    );
  }
}

// ── PUT: Update a user ─────────────────────────────────────────

export async function PUT(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const parsed = updateUserSchema.safeParse(updateData);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    // Check if email is being changed and is unique
    if (parsed.data.email) {
      const existing = await db.user.findFirst({
        where: { email: parsed.data.email, NOT: { id } },
      });
      if (existing) {
        return NextResponse.json(
          { error: 'A user with this email already exists' },
          { status: 409 }
        );
      }
    }

    const user = await db.user.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    logger.error('[Users API] PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to update user' },
      { status: 500 }
    );
  }
}

// ── PATCH: Toggle user active status ────────────────────────────

export async function PATCH(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { id, isActive } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const parsed = toggleActiveSchema.safeParse({ isActive });
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const user = await db.user.update({
      where: { id },
      data: { isActive },
    });

    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    logger.error('[Users API] PATCH error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to toggle user status' },
      { status: 500 }
    );
  }
}
