import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';

// ── Validation Schemas ──────────────────────────────────────────

const createReservationSchema = z.object({
  userId: z.string().optional(),
  type: z.enum(['vip_lounge', 'hotel', 'car_rental', 'duty_free']),
  reference: z.string().min(1, 'Reference is required').max(50),
  details: z.string().min(1, 'Details are required'),
  totalAmount: z.number().min(0).default(0),
  currency: z.string().length(3).default('EUR'),
  conversationId: z.string().optional(),
});

const reservationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: z.enum(['vip_lounge', 'hotel', 'car_rental', 'duty_free']).optional(),
  status: z.enum(['pending', 'confirmed', 'cancelled', 'completed']).optional(),
  paymentStatus: z.enum(['pending', 'paid', 'refunded', 'cancelled']).optional(),
  userId: z.string().optional(),
});

// ── GET: List reservations ─────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryParams = {
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
      type: searchParams.get('type') || undefined,
      status: searchParams.get('status') || undefined,
      paymentStatus: searchParams.get('paymentStatus') || undefined,
      userId: searchParams.get('userId') || undefined,
    };

    const parsed = reservationQuerySchema.safeParse(queryParams);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { page, limit, type, status, paymentStatus, userId } = parsed.data;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      ...(type && { type }),
      ...(status && { status }),
      ...(paymentStatus && { paymentStatus }),
      ...(userId && { userId }),
    };

    const [reservations, total] = await Promise.all([
      db.reservation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, name: true, email: true, phone: true },
          },
          conversation: {
            select: { id: true, whatsappId: true },
          },
        },
      }),
      db.reservation.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: reservations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[Reservations API] GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch reservations' },
      { status: 500 }
    );
  }
}

// ── POST: Create a new reservation ─────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createReservationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { userId, type, reference, details, totalAmount, currency, conversationId } =
      parsed.data;

    // Check for duplicate reference
    const existingRef = await db.reservation.findUnique({ where: { reference } });
    if (existingRef) {
      return NextResponse.json(
        { error: 'A reservation with this reference already exists' },
        { status: 409 }
      );
    }

    // Validate user exists if userId provided
    if (userId) {
      const userExists = await db.user.findUnique({ where: { id: userId } });
      if (!userExists) {
        return NextResponse.json(
          { error: 'Referenced user not found' },
          { status: 404 }
        );
      }
    }

    // Validate conversation exists if conversationId provided
    if (conversationId) {
      const convExists = await db.conversation.findUnique({ where: { id: conversationId } });
      if (!convExists) {
        return NextResponse.json(
          { error: 'Referenced conversation not found' },
          { status: 404 }
        );
      }
    }

    const reservation = await db.reservation.create({
      data: {
        userId,
        type,
        status: 'pending',
        reference,
        details,
        totalAmount,
        currency,
        conversationId,
      },
    });

    // Create analytics event
    await db.analyticsEvent.create({
      data: {
        eventType: 'reservation_created',
        metadata: JSON.stringify({
          type,
          reference,
          amount: totalAmount,
          currency,
        }),
      },
    });

    return NextResponse.json(
      { success: true, data: reservation },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Reservations API] POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to create reservation' },
      { status: 500 }
    );
  }
}
