import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';

// ── Validation ──────────────────────────────────────────────────

const importPdfSchema = z.object({
  category: z
    .enum(['flights', 'services', 'restaurants', 'shops', 'transport', 'general'])
    .default('general'),
  status: z.enum(['draft', 'validated', 'published']).default('draft'),
  chunkSize: z.number().int().min(200).max(5000).default(1000),
  chunkOverlap: z.number().int().min(0).max(500).default(100),
});

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// ── Semantic Chunking ───────────────────────────────────────────

function chunkText(text: string, chunkSize: number, chunkOverlap: number): string[] {
  if (text.length <= chunkSize) {
    return [text];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = Math.min(start + chunkSize, text.length);

    // Try to break at sentence or paragraph boundary
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

// ── Main Import Handler ─────────────────────────────────────────

export async function POST(request: NextRequest) {
  const traceId = crypto.randomUUID?.() || `trace_${Date.now()}`;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'Aucun fichier PDF fourni. Utilisez le champ "file" en multipart/form-data.' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Seuls les fichiers PDF sont acceptés' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Fichier trop volumineux (${(file.size / 1024 / 1024).toFixed(1)} Mo). Maximum: 50 Mo.` },
        { status: 413 }
      );
    }

    // Parse additional metadata from form
    const category = (formData.get('category') as string) || 'general';
    const status = (formData.get('status') as string) || 'draft';
    const chunkSize = Number(formData.get('chunkSize')) || 1000;
    const chunkOverlap = Number(formData.get('chunkOverlap')) || 100;

    console.log(JSON.stringify({
      level: 'info',
      traceId,
      event: 'pdf_import_start',
      fileName: file.name,
      fileSize: file.size,
      category,
    }));

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Dynamically import pdf-parse (Node.js only)
    let pdfData: { text: string; numpages: number; info?: Record<string, unknown> };
    try {
      const pdfParse = (await import('pdf-parse')) as unknown as { default: (buf: Buffer) => Promise<{ text: string; numpages: number; info?: Record<string, unknown> }> };
      pdfData = await pdfParse.default(buffer);
    } catch (pdfError) {
      console.error(JSON.stringify({
        level: 'error',
        traceId,
        event: 'pdf_parse_failed',
        error: pdfError instanceof Error ? pdfError.message : 'Unknown',
      }));
      return NextResponse.json(
        { error: 'Échec de l\'extraction PDF. Le fichier est peut-être corrompu ou protégé.' },
        { status: 422 }
      );
    }

    const { text: rawText, numpages, info } = pdfData;

    // Clean extracted text
    const cleanedText = rawText
      .replace(/\f/g, '\n\n')       // Form feed = page break
      .replace(/\r\n/g, '\n')        // Normalize line endings
      .replace(/\r/g, '\n')
      .replace(/[ \t]+/g, ' ')       // Collapse whitespace
      .replace(/\n{3,}/g, '\n\n')    // Max 2 consecutive newlines
      .trim();

    if (cleanedText.length < 50) {
      return NextResponse.json(
        { error: 'Le contenu extrait du PDF est trop court (< 50 caractères). Le PDF est peut-être vide ou image-only.' },
        { status: 422 }
      );
    }

    // Extract metadata
    const pdfTitle = (info?.Title as string) || file.name.replace(/\.pdf$/i, '');
    const pdfAuthor = (info?.Author as string) || '';
    const pdfSubject = (info?.Subject as string) || '';
    const pdfCreator = (info?.Creator as string) || '';
    const pdfCreationDate = (info?.CreationDate as string) || '';

    // Build structured content with metadata
    const fullContent = [
      pdfAuthor ? `Auteur: ${pdfAuthor}` : '',
      pdfSubject ? `Sujet: ${pdfSubject}` : '',
      pdfCreationDate ? `Date de création: ${pdfCreationDate}` : '',
      `Pages: ${numpages}`,
      '',
      cleanedText,
    ].filter(Boolean).join('\n\n');

    // Chunk the content
    const chunks = chunkText(fullContent, chunkSize, chunkOverlap);
    const chunkCount = chunks.length;

    console.log(JSON.stringify({
      level: 'info',
      traceId,
      event: 'pdf_import_chunked',
      fileName: file.name,
      pages: numpages,
      contentLength: fullContent.length,
      chunkCount,
    }));

    // Store in database
    const entry = await db.knowledgeBaseEntry.create({
      data: {
        title: pdfTitle.substring(0, 200),
        content: fullContent,
        source: `pdf://${file.name}`,
        category,
        status: status as 'draft' | 'validated' | 'published',
        chunkCount,
        publishedAt: status === 'published' ? new Date() : null,
      },
    });

    console.log(JSON.stringify({
      level: 'info',
      traceId,
      event: 'pdf_import_success',
      entryId: entry.id,
      title: entry.title,
      pages: numpages,
      chunkCount,
    }));

    return NextResponse.json({
      success: true,
      data: {
        id: entry.id,
        title: entry.title,
        source: `pdf://${file.name}`,
        category: entry.category,
        status: entry.status,
        pages: numpages,
        author: pdfAuthor,
        subject: pdfSubject,
        contentLength: fullContent.length,
        chunkCount,
        fileSizeKB: Math.round(file.size / 1024),
        version: entry.version,
        createdAt: entry.createdAt,
      },
      message: `PDF importé : ${numpages} pages, ${chunkCount} chunks extraits`,
    }, { status: 201 });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    console.error(JSON.stringify({
      level: 'error',
      traceId,
      event: 'pdf_import_error',
      error: message,
    }));

    return NextResponse.json(
      { error: 'Erreur interne lors de l\'import PDF', details: message },
      { status: 500 }
    );
  }
}
