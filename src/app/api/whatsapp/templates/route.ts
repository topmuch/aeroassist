/**
 * WhatsApp Templates API
 * CRUD for WhatsApp message templates (OpenBSP / Meta)
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSecurityHeaders, withSecurityHeaders, startTimer, requireAuth } from '@/lib/security';

// GET: List all templates
export async function GET(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;
  const timer = startTimer();

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const category = searchParams.get('category') || undefined;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (category) where.category = category;

    const templates = await db.whatsAppTemplate.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
    });

    return withSecurityHeaders(
      NextResponse.json({
        success: true,
        data: templates,
        total: templates.length,
        durationMs: timer(),
      })
    );
  } catch (error) {
    return withSecurityHeaders(
      NextResponse.json({ success: false, error: 'Failed to fetch templates' }, { status: 500 })
    );
  }
}

// POST: Create a new template
export async function POST(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { name, displayName, category, language, bodyText, components } = body;

    if (!name || !displayName || !category || !bodyText) {
      return withSecurityHeaders(
        NextResponse.json({ success: false, error: 'name, displayName, category, and bodyText are required' }, { status: 400 })
      );
    }

    const validCategories = ['MARKETING', 'UTILITY', 'AUTHENTICATION'];
    if (!validCategories.includes(category)) {
      return withSecurityHeaders(
        NextResponse.json({ success: false, error: `category must be one of: ${validCategories.join(', ')}` }, { status: 400 })
      );
    }

    const template = await db.whatsAppTemplate.create({
      data: {
        name,
        displayName,
        category,
        language: language || 'fr',
        bodyText,
        components: JSON.stringify(components || []),
        status: 'draft',
      },
    });

    return withSecurityHeaders(
      NextResponse.json({ success: true, data: template }, { status: 201 })
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('Unique')) {
      return withSecurityHeaders(
        NextResponse.json({ success: false, error: 'Template with this name already exists' }, { status: 409 })
      );
    }
    return withSecurityHeaders(
      NextResponse.json({ success: false, error: 'Failed to create template' }, { status: 500 })
    );
  }
}

// PUT: Update template status (submit, approve)
export async function PUT(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { id, status, metaTemplateId } = body;

    if (!id || !status) {
      return withSecurityHeaders(
        NextResponse.json({ success: false, error: 'id and status are required' }, { status: 400 })
      );
    }

    const validStatuses = ['draft', 'submitted', 'approved', 'rejected'];
    if (!validStatuses.includes(status)) {
      return withSecurityHeaders(
        NextResponse.json({ success: false, error: `status must be one of: ${validStatuses.join(', ')}` }, { status: 400 })
      );
    }

    const updateData: Record<string, unknown> = { status };
    if (metaTemplateId) updateData.metaTemplateId = metaTemplateId;

    const template = await db.whatsAppTemplate.update({
      where: { id },
      data: updateData,
    });

    return withSecurityHeaders(
      NextResponse.json({ success: true, data: template })
    );
  } catch (error) {
    return withSecurityHeaders(
      NextResponse.json({ success: false, error: 'Failed to update template' }, { status: 500 })
    );
  }
}

// DELETE: Remove a template
export async function DELETE(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return withSecurityHeaders(
        NextResponse.json({ success: false, error: 'id query parameter is required' }, { status: 400 })
      );
    }

    await db.whatsAppTemplate.delete({ where: { id } });

    return withSecurityHeaders(
      NextResponse.json({ success: true, message: 'Template deleted' })
    );
  } catch (error) {
    return withSecurityHeaders(
      NextResponse.json({ success: false, error: 'Failed to delete template' }, { status: 500 })
    );
  }
}
