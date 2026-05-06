import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import * as cheerio from 'cheerio';
import { db } from '@/lib/db';

// ── Validation ──────────────────────────────────────────────────

const importUrlSchema = z.object({
  url: z.string().url('URL invalide'),
  category: z
    .enum(['flights', 'services', 'restaurants', 'shops', 'transport', 'general'])
    .default('general'),
  status: z.enum(['draft', 'validated', 'published']).default('draft'),
  chunkSize: z.number().int().min(200).max(5000).default(1000),
  chunkOverlap: z.number().int().min(0).max(500).default(100),
});

// ── Text Cleaning Utilities ─────────────────────────────────────

function cleanText(text: string): string {
  return text
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/\t/g, ' ')
    .replace(/[ \x00-\x1F\x7F]+/g, ' ')
    .trim();
}

// ── Semantic Chunking ───────────────────────────────────────────

function chunkText(text: string, chunkSize: number, chunkOverlap: number): string[] {
  if (text.length <= chunkSize) {
    return [text];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = Math.min(start + chunkSize, text.length);

    // Try to break at sentence boundary
    if (end < text.length) {
      const lastPeriod = text.lastIndexOf('.', end);
      const lastNewline = text.lastIndexOf('\n', end);
      const bestBreak = Math.max(lastPeriod, lastNewline);

      if (bestBreak > start + chunkSize * 0.4) {
        end = bestBreak + 1;
      }
    }

    const chunk = text.slice(start, end).trim();
    if (chunk.length > 50) {
      chunks.push(chunk);
    }

    start = end - chunkOverlap;
    if (start >= text.length - 50) break;
  }

  return chunks.length > 0 ? chunks : [text];
}

// ── URL Fetching with Retry ─────────────────────────────────────

async function fetchWithRetry(url: string, retries = 3): Promise<Response> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'AeroAssist-Bot/1.0 (Knowledge Base Import; +https://aeroassist.fr)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
        },
        redirect: 'follow',
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      const isLast = attempt === retries - 1;
      if (isLast) throw error;
      // Exponential backoff: 1s, 2s, 4s
      await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
    }
  }
  throw new Error('Max retries exceeded');
}

// ── Main Import Handler ─────────────────────────────────────────

export async function POST(request: NextRequest) {
  const traceId = crypto.randomUUID?.() || `trace_${Date.now()}`;

  try {
    const body = await request.json();
    const parsed = importUrlSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { url, category, status, chunkSize, chunkOverlap } = parsed.data;

    console.log(JSON.stringify({
      level: 'info',
      traceId,
      event: 'url_import_start',
      url,
      category,
    }));

    // Validate URL scheme
    const parsedUrl = new URL(url);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return NextResponse.json(
        { error: 'Seules les URLs HTTP/HTTPS sont supportées' },
        { status: 400 }
      );
    }

    // Fetch the page
    const response = await fetchWithRetry(url);

    if (!response.ok) {
      console.error(JSON.stringify({
        level: 'error',
        traceId,
        event: 'url_import_fetch_failed',
        status: response.status,
        url,
      }));
      return NextResponse.json(
        { error: `Impossible de récupérer l'URL (HTTP ${response.status})` },
        { status: 422 }
      );
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('text/plain') && !contentType.includes('application/xhtml')) {
      return NextResponse.json(
        { error: `Type de contenu non supporté: ${contentType}. Utilisez text/html.` },
        { status: 415 }
      );
    }

    const html = await response.text();

    // Parse HTML with cheerio
    const $ = cheerio.load(html);

    // Remove unwanted elements
    $('script, style, nav, footer, header, iframe, aside, .ad, .ads, .advertisement, .cookie-banner, .popup, .modal, form, button, input, select, textarea').remove();

    // Extract meaningful text
    const title = $('title').first().text().trim() ||
                  $('meta[property="og:title"]').attr('content') ||
                  $('h1').first().text().trim() ||
                  parsedUrl.hostname;

    const metaDescription = $('meta[name="description"]').attr('content') || '';
    const metaKeywords = $('meta[name="keywords"]').attr('content') || '';

    // Extract body text
    const bodyText = $('body').text() || $('article').text() || $('main').text() || '';
    const cleanedText = cleanText(bodyText);

    if (cleanedText.length < 50) {
      return NextResponse.json(
        { error: 'Le contenu extrait est trop court (< 50 caractères). La page ne contient pas assez de texte exploitable.' },
        { status: 422 }
      );
    }

    // Build full content with metadata
    const fullContent = [
      metaDescription ? `Description: ${metaDescription}` : '',
      metaKeywords ? `Mots-clés: ${metaKeywords}` : '',
      '',
      cleanedText,
    ].filter(Boolean).join('\n\n');

    // Chunk the content
    const chunks = chunkText(fullContent, chunkSize, chunkOverlap);
    const chunkCount = chunks.length;

    console.log(JSON.stringify({
      level: 'info',
      traceId,
      event: 'url_import_chunked',
      url,
      title,
      contentLength: fullContent.length,
      chunkCount,
    }));

    // Store in database
    const entry = await db.knowledgeBaseEntry.create({
      data: {
        title: title.substring(0, 200),
        content: fullContent,
        source: url,
        category,
        status,
        chunkCount,
        publishedAt: status === 'published' ? new Date() : null,
      },
    });

    console.log(JSON.stringify({
      level: 'info',
      traceId,
      event: 'url_import_success',
      entryId: entry.id,
      title: entry.title,
      chunkCount,
    }));

    return NextResponse.json({
      success: true,
      data: {
        id: entry.id,
        title: entry.title,
        source: url,
        category: entry.category,
        status: entry.status,
        contentLength: fullContent.length,
        chunkCount,
        version: entry.version,
        createdAt: entry.createdAt,
      },
      message: `Import réussi : ${chunkCount} chunks extraits depuis ${parsedUrl.hostname}`,
    }, { status: 201 });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    console.error(JSON.stringify({
      level: 'error',
      traceId,
      event: 'url_import_error',
      error: message,
    }));

    if (message.includes('abort') || message.includes('timeout')) {
      return NextResponse.json(
        { error: 'Délai dépassé lors de la récupération de l\'URL (15s). Réessayez.' },
        { status: 408 }
      );
    }

    if (message.includes('ENOTFOUND') || message.includes('fetch failed')) {
      return NextResponse.json(
        { error: 'Impossible de joindre le serveur. Vérifiez l\'URL.' },
        { status: 422 }
      );
    }

    return NextResponse.json(
      { error: 'Erreur interne lors de l\'import URL', details: message },
      { status: 500 }
    );
  }
}
