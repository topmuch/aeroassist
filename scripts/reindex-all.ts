#!/usr/bin/env bun
/**
 * AeroAssist — CLI Knowledge Base Reindexer
 *
 * Usage:
 *   bun run scripts/reindex-all.ts                    # Full reindex (default)
 *   bun run scripts/reindex-all.ts --mode=incremental  # Only unindexed articles
 *   bun run scripts/reindex-all.ts --mode=single --article-id=abc123
 */

import {
  indexAllArticles,
  indexNewArticles,
  indexArticle,
  getIndexStats,
} from '../src/lib/knowledge-indexer';
import { db } from '../src/lib/db';

// ── Parse CLI Args ─────────────────────────────────────────────

const args = process.argv.slice(2);
const mode = parseArg(args, '--mode') ?? 'full';
const articleId = parseArg(args, '--article-id');

if (!['full', 'incremental', 'single'].includes(mode)) {
  console.error(`❌  Invalid mode: "${mode}". Must be full|incremental|single`);
  process.exit(1);
}

if (mode === 'single' && !articleId) {
  console.error('❌  --article-id is required when mode=single');
  process.exit(1);
}

// ── Helpers ────────────────────────────────────────────────────

function parseArg(argv: string[], flag: string): string | undefined {
  const prefix = flag + '=';
  const exact = argv.find((a) => a.startsWith(prefix));
  return exact ? exact.slice(prefix.length) : undefined;
}

function fmtMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function divider(): void {
  console.log('─'.repeat(50));
}

// ── Main ───────────────────────────────────────────────────────

async function main() {
  divider();
  console.log(`🛩️  AeroAssist Knowledge Reindexer`);
  console.log(`   Mode : ${mode}${articleId ? ` (article: ${articleId})` : ''}`);
  console.log(`   Time : ${new Date().toISOString()}`);
  divider();

  // Connect to DB (equivalent to ensuring Prisma schema is pushed / client is ready)
  console.log('📡  Connecting to database…');
  try {
    await db.$connect();
    console.log('   ✅ Connected');
  } catch (err) {
    console.error('   ❌ Failed to connect to database');
    console.error(`   ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }

  // Show pre-index stats
  console.log('\n📊  Current index stats:');
  const beforeStats = await getIndexStats();
  console.log(`   Articles (published) : ${beforeStats.totalArticles}`);
  console.log(`   Already indexed      : ${beforeStats.indexedArticles}`);
  console.log(`   Unindexed            : ${beforeStats.unindexedArticles}`);
  console.log(`   Storage method       : ${beforeStats.method}`);
  if (beforeStats.indexSizeKb != null) {
    console.log(`   Index file size      : ${beforeStats.indexSizeKb} KB`);
  }

  console.log();

  const start = Date.now();

  try {
    if (mode === 'single') {
      console.log(`🔎  Indexing single article: ${articleId}`);
      console.log();

      const t = Date.now();
      await indexArticle(articleId!);
      console.log(`   ✅ Indexed in ${fmtMs(Date.now() - t)}`);
    } else if (mode === 'incremental') {
      console.log('🔄  Running incremental reindex (unindexed articles only)…');
      console.log();

      const t = Date.now();
      const result = await indexNewArticles();
      console.log();
      printResult(result, fmtMs(Date.now() - t));
    } else {
      console.log('🔄  Running FULL reindex (all published articles)…');
      console.log();

      const t = Date.now();
      const result = await indexAllArticles();
      console.log();
      printResult(result, fmtMs(Date.now() - t));
    }
  } catch (err) {
    console.error(`\n❌  Fatal error during indexing:`);
    console.error(`   ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }

  // Post-index stats
  console.log('\n📊  Stats after reindex:');
  const afterStats = await getIndexStats();
  console.log(`   Articles (published) : ${afterStats.totalArticles}`);
  console.log(`   Already indexed      : ${afterStats.indexedArticles}`);
  console.log(`   Unindexed            : ${afterStats.unindexedArticles}`);

  divider();
  console.log(`✅  Done in ${fmtMs(Date.now() - start)}`);
  divider();
}

function printResult(result: {
  totalProcessed: number;
  successCount: number;
  errorCount: number;
  errors: Array<{ id: string; error: string }>;
  timeMs: number;
}, elapsed: string): void {
  if (result.totalProcessed === 0) {
    console.log('   ⏭️  Nothing to index — all articles already up to date.');
    return;
  }

  console.log(`   ✅ Success : ${result.successCount} / ${result.totalProcessed}`);
  if (result.errorCount > 0) {
    console.log(`   ❌ Errors  : ${result.errorCount}`);
    console.log();
    for (const e of result.errors) {
      console.log(`      • ${e.id}: ${e.error}`);
    }
  }
  console.log();
  console.log(`   ⏱️  Elapsed : ${elapsed}`);
}

main();
