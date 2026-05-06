/**
 * WhatsApp Contacts API
 * View and manage WhatsApp contacts (opt-in/opt-out, blacklist)
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSecurityHeaders, withSecurityHeaders, startTimer, requireAuth } from '@/lib/security';

// GET: List contacts
export async function GET(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;
  const timer = startTimer();

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const isBlacklisted = searchParams.get('blacklisted');

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { phoneNumber: { contains: search } },
        { pushName: { contains: search } },
      ];
    }
    if (isBlacklisted !== null && isBlacklisted !== undefined) {
      where.isBlacklisted = isBlacklisted === 'true';
    }

    const contacts = await db.whatsAppContact.findMany({
      where,
      orderBy: { lastSeenAt: 'desc' },
      take: 100,
    });

    return withSecurityHeaders(
      NextResponse.json({
        success: true,
        data: contacts.map((c) => ({
          ...c,
          phone: c.phoneNumber, // Alias
        })),
        total: contacts.length,
        durationMs: timer(),
      })
    );
  } catch (error) {
    return withSecurityHeaders(
      NextResponse.json({ success: false, error: 'Failed to fetch contacts' }, { status: 500 })
    );
  }
}

// POST: Opt-in/Opt-out/Blacklist
export async function POST(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { phoneNumber, action } = body;

    if (!phoneNumber || !action) {
      return withSecurityHeaders(
        NextResponse.json({ success: false, error: 'phoneNumber and action are required' }, { status: 400 })
      );
    }

    const validActions = ['opt_in', 'opt_out', 'blacklist', 'unblacklist'];
    if (!validActions.includes(action)) {
      return withSecurityHeaders(
        NextResponse.json({ success: false, error: `action must be one of: ${validActions.join(', ')}` }, { status: 400 })
      );
    }

    const updateData: Record<string, unknown> = {};
    switch (action) {
      case 'opt_in': updateData.isOptIn = true; break;
      case 'opt_out': updateData.isOptIn = false; break;
      case 'blacklist': updateData.isBlacklisted = true; break;
      case 'unblacklist': updateData.isBlacklisted = false; break;
    }

    const contact = await db.whatsAppContact.upsert({
      where: { phoneNumber },
      update: updateData,
      create: {
        phoneNumber,
        language: 'fr',
        isOptIn: action === 'opt_in',
        isBlacklisted: action === 'blacklist',
      },
    });

    return withSecurityHeaders(
      NextResponse.json({ success: true, data: contact, action })
    );
  } catch (error) {
    return withSecurityHeaders(
      NextResponse.json({ success: false, error: 'Failed to update contact' }, { status: 500 })
    );
  }
}
