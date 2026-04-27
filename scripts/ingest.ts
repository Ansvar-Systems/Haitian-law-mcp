#!/usr/bin/env tsx
/**
 * Haitian Law MCP — Ingestion Pipeline (open-mirror, multi-source)
 *
 * Reads scripts/lib/sources.ts via the census, downloads each source,
 * dispatches to the right parser, writes data/seed/<id>.json with
 * provision-level metadata.confidence_tier so the customer-visible
 * _citation envelope can surface OCR provenance.
 *
 * Source types:
 *   - constitute-html : Constitute Project structured HTML (Constitution)
 *   - pdf-text        : text-layered PDF (pdftotext)
 *   - ia-djvu-txt     : Internet Archive pre-OCR'd DJVU TXT (no OCR needed)
 *   - wipo-pdf        : WIPO Lex PDF (text-layer status confirmed at ingest)
 *
 * Failure policy (per CLAUDE.md No Silent Fallbacks rule): any source
 * whose fetch or parse fails lands as classification=inaccessible in the
 * census; we never substitute a different source silently.
 *
 * Usage:
 *   npm run ingest
 *   npm run ingest -- --limit 5
 *   npm run ingest -- --source-id constitution-1987
 *   npm run ingest -- --skip-fetch       # reuse cached
 *   npm run ingest -- --force            # re-ingest all
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import {
  parseHTLawPdf,
  parseHTLawConstituteHtml,
  parseHTLawDjvuTxt,
  type ActIndexEntry,
  type ParsedAct,
  type ParseOptions,
} from './lib/parser.js';
import { SOURCES, type SourceEntry } from './lib/sources.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SOURCE_DIR = path.resolve(__dirname, '../data/source');
const SEED_DIR = path.resolve(__dirname, '../data/seed');
const CENSUS_PATH = path.resolve(__dirname, '../data/census.json');

const USER_AGENT = 'haitian-law-mcp/1.1 (https://github.com/Ansvar-Systems/Haitian-law-mcp; hello@ansvar.eu)';
const MIN_DELAY_MS = 500;
const FETCH_TIMEOUT_MS = 60000;
const WIPO_FETCH_TIMEOUT_MS = 25000; // shorter — WIPO is flaky

interface CensusLawEntry {
  id: string;
  title: string;
  title_en?: string;
  identifier: string;
  url: string;
  status: string;
  category: string;
  classification: 'ingestable' | 'excluded' | 'inaccessible';
  ingested: boolean;
  provision_count: number;
  ingestion_date: string | null;
  issued_date?: string;
  norm_type?: string;
  source_type?: string;
  confidence_tier?: string;
  expected_articles?: number;
  mirror?: string;
}

interface CensusFile {
  schema_version: string;
  jurisdiction: string;
  jurisdiction_name: string;
  portal: string;
  portal_note?: string;
  census_date: string;
  agent: string;
  summary: {
    total_laws: number;
    ingestable: number;
    ocr_needed: number;
    inaccessible: number;
    excluded: number;
  };
  breakdown?: Record<string, Record<string, number>>;
  laws: CensusLawEntry[];
}

function parseArgs(): { limit: number | null; sourceId: string | null; skipFetch: boolean; force: boolean } {
  const args = process.argv.slice(2);
  let limit: number | null = null;
  let sourceId: string | null = null;
  let skipFetch = false;
  let force = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--limit' && args[i + 1]) {
      limit = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--source-id' && args[i + 1]) {
      sourceId = args[i + 1];
      i++;
    } else if (args[i] === '--skip-fetch') {
      skipFetch = true;
    } else if (args[i] === '--force') {
      force = true;
    }
  }

  return { limit, sourceId, skipFetch, force };
}

function sourceToActEntry(src: SourceEntry): ActIndexEntry {
  return {
    id: src.id,
    title: src.title,
    titleEn: src.titleEn,
    shortName: src.shortName,
    status: 'in_force',
    issuedDate: src.issuedDate,
    inForceDate: src.issuedDate,
    url: src.url,
  };
}

function fileExtFor(src: SourceEntry): string {
  switch (src.sourceType) {
    case 'constitute-html':
      return 'html';
    case 'ia-djvu-txt':
      return 'txt';
    case 'pdf-text':
    case 'wipo-pdf':
    default:
      return 'pdf';
  }
}

async function rateLimit(): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, MIN_DELAY_MS));
}

async function fetchAsBytes(url: string, timeoutMs: number): Promise<Buffer | null> {
  await rateLimit();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: '*/*',
        'Accept-Language': 'fr,en;q=0.5',
      },
      redirect: 'follow',
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (resp.status !== 200) {
      console.log(` HTTP ${resp.status}`);
      return null;
    }
    const buf = Buffer.from(await resp.arrayBuffer());
    if (buf.length < 100) {
      console.log(' Body too small');
      return null;
    }
    return buf;
  } catch (err) {
    clearTimeout(timer);
    console.log(` Fetch error: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

async function downloadSource(src: SourceEntry, outputPath: string): Promise<boolean> {
  const timeout = src.sourceType === 'wipo-pdf' ? WIPO_FETCH_TIMEOUT_MS : FETCH_TIMEOUT_MS;
  process.stdout.write(`Downloading ${src.id} (${src.sourceType})...`);
  const buf = await fetchAsBytes(src.url, timeout);
  if (!buf) return false;

  // PDF magic-byte check for PDF sources
  if (src.sourceType === 'pdf-text' || src.sourceType === 'wipo-pdf') {
    if (!buf.subarray(0, 5).toString().startsWith('%PDF')) {
      console.log(' Not a PDF (probably error page)');
      return false;
    }
  }
  // Constitute HTML must contain article markers somewhere in the body
  if (src.sourceType === 'constitute-html') {
    const full = buf.toString('utf-8');
    if (!/<h[23][^>]*>\s*(?:Article|First Article)/i.test(full)) {
      console.log(' Not parseable HTML (no article headings)');
      return false;
    }
  }

  fs.writeFileSync(outputPath, buf);
  console.log(` OK (${(buf.length / 1024).toFixed(0)} KB)`);
  return true;
}

function parseSource(src: SourceEntry, sourceFile: string): ParsedAct {
  const act = sourceToActEntry(src);
  const opts: ParseOptions = { tier: src.tier, sourceFormat: src.sourceType };

  switch (src.sourceType) {
    case 'constitute-html': {
      const html = fs.readFileSync(sourceFile, 'utf-8');
      return parseHTLawConstituteHtml(html, act, opts);
    }
    case 'ia-djvu-txt': {
      const txt = fs.readFileSync(sourceFile, 'utf-8');
      return parseHTLawDjvuTxt(txt, act, opts);
    }
    case 'pdf-text':
    case 'wipo-pdf':
    default:
      return parseHTLawPdf(sourceFile, act, opts);
  }
}

function writeCensus(census: CensusFile, censusMap: Map<string, CensusLawEntry>): void {
  census.laws = Array.from(censusMap.values()).sort((a, b) => a.id.localeCompare(b.id));
  census.summary.total_laws = census.laws.length;
  census.summary.ingestable = census.laws.filter(l => l.classification === 'ingestable').length;
  census.summary.inaccessible = census.laws.filter(l => l.classification === 'inaccessible').length;
  census.summary.excluded = census.laws.filter(l => l.classification === 'excluded').length;
  fs.writeFileSync(CENSUS_PATH, JSON.stringify(census, null, 2));
}

async function main(): Promise<void> {
  const { limit, sourceId, skipFetch, force } = parseArgs();

  console.log('Haitian Law MCP — Open-Mirror Ingestion');
  console.log('========================================\n');
  console.log('  Sources: Constitute Project / OAS juridico / Internet Archive / WIPO Lex / haiti-now');
  console.log('  Posture: sovereign portals DNS-dead 2026-04-27 — open mirrors only');

  if (limit) console.log(`  --limit ${limit}`);
  if (sourceId) console.log(`  --source-id ${sourceId}`);
  if (skipFetch) console.log('  --skip-fetch');
  if (force) console.log('  --force');

  if (!fs.existsSync(CENSUS_PATH)) {
    console.error(`\nERROR: Census file not found at ${CENSUS_PATH}`);
    console.error('Run "npm run census" first.');
    process.exit(1);
  }

  const census: CensusFile = JSON.parse(fs.readFileSync(CENSUS_PATH, 'utf-8'));
  const censusMap = new Map<string, CensusLawEntry>();
  for (const law of census.laws) censusMap.set(law.id, law);

  let queue: SourceEntry[] = SOURCES;
  if (sourceId) queue = queue.filter(s => s.id === sourceId);
  if (limit) queue = queue.slice(0, limit);

  console.log(`\n  Census: ${census.summary.total_laws} total entries`);
  console.log(`  Processing: ${queue.length} sources\n`);

  fs.mkdirSync(SOURCE_DIR, { recursive: true });
  fs.mkdirSync(SEED_DIR, { recursive: true });

  const today = new Date().toISOString().split('T')[0];

  let processed = 0;
  let ingested = 0;
  let resumed = 0;
  let failed = 0;
  let totalProvisions = 0;
  let totalDefinitions = 0;
  const failureReasons: { id: string; reason: string }[] = [];

  for (const src of queue) {
    processed++;
    const sourceFile = path.join(SOURCE_DIR, `${src.id}.${fileExtFor(src)}`);
    const seedFile = path.join(SEED_DIR, `${src.id}.json`);

    // Resume support
    if (!force && fs.existsSync(seedFile)) {
      try {
        const existing = JSON.parse(fs.readFileSync(seedFile, 'utf-8')) as ParsedAct;
        const provCount = existing.provisions?.length ?? 0;
        const defCount = existing.definitions?.length ?? 0;
        totalProvisions += provCount;
        totalDefinitions += defCount;
        const entry = censusMap.get(src.id);
        if (entry) {
          entry.ingested = true;
          entry.provision_count = provCount;
          entry.ingestion_date = entry.ingestion_date ?? today;
        }
        resumed++;
        console.log(`  [${processed}/${queue.length}] ${src.id}: resumed (${provCount} provisions)`);
        continue;
      } catch {
        // corrupt seed, re-ingest
      }
    }

    process.stdout.write(`  [${processed}/${queue.length}] ${src.id}: `);

    // Fetch
    if (!fs.existsSync(sourceFile) || force) {
      if (skipFetch) {
        console.log('no cached source, skipping');
        failed++;
        const entry = censusMap.get(src.id);
        if (entry) entry.classification = 'inaccessible';
        failureReasons.push({ id: src.id, reason: 'no_cached_source_with_skip_fetch' });
        continue;
      }
      const ok = await downloadSource(src, sourceFile);
      if (!ok) {
        const entry = censusMap.get(src.id);
        if (entry) entry.classification = 'inaccessible';
        failed++;
        failureReasons.push({ id: src.id, reason: 'fetch_failed' });
        continue;
      }
    } else {
      const size = fs.statSync(sourceFile).size;
      console.log(`using cached (${(size / 1024).toFixed(0)} KB)`);
    }

    // Parse
    try {
      const parsed = parseSource(src, sourceFile);
      fs.writeFileSync(seedFile, JSON.stringify(parsed, null, 2));
      totalProvisions += parsed.provisions.length;
      totalDefinitions += parsed.definitions.length;
      console.log(`    -> ${parsed.provisions.length} provisions, ${parsed.definitions.length} definitions [${src.tier}]`);
      const entry = censusMap.get(src.id);
      if (entry) {
        entry.ingested = true;
        entry.provision_count = parsed.provisions.length;
        entry.ingestion_date = today;
      }
      if (parsed.provisions.length === 0) {
        // Surface zero-provision parse as a concern even though file fetched
        failureReasons.push({ id: src.id, reason: 'parsed_zero_provisions' });
      }
      ingested++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`    ERROR parsing: ${msg}`);
      const entry = censusMap.get(src.id);
      if (entry) entry.classification = 'inaccessible';
      failed++;
      failureReasons.push({ id: src.id, reason: `parse_error: ${msg}` });
    }
  }

  writeCensus(census, censusMap);

  console.log(`\n${'='.repeat(70)}`);
  console.log('Ingestion Report');
  console.log('='.repeat(70));
  console.log(`  Processed:         ${processed}`);
  console.log(`  Newly ingested:    ${ingested}`);
  console.log(`  Resumed:           ${resumed}`);
  console.log(`  Failed:            ${failed}`);
  console.log(`  Total provisions:  ${totalProvisions}`);
  console.log(`  Total definitions: ${totalDefinitions}`);
  if (failureReasons.length > 0) {
    console.log('\n  Concerns / failures:');
    for (const f of failureReasons) {
      console.log(`    - ${f.id}: ${f.reason}`);
    }
  }
  console.log('');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
