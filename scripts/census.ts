#!/usr/bin/env tsx
/**
 * Haitian Law MCP — Census Script
 *
 * Haiti's sovereign legal portals (dfrn.gouv.ht, justice.gouv.ht,
 * parliament.ht, senat.gouv.ht, bnht.gouv.ht, moniteur.gouv.ht) are
 * DNS-dead as of 2026-04-27. This census seeds from the typed open-mirror
 * source list at scripts/lib/sources.ts (Constitute Project, OAS juridico,
 * Internet Archive, WIPO Lex, haiti-now mirror). No DFRN crawl.
 *
 * Per the Haiti scout report (docs/handover/2026-04-27-haiti-source-scout.md)
 * and memory feedback_ocr_corpus_must_be_amber_tier.md, the bulk of the
 * corpus is OCR-derived and lands at confidence_tier=amber. The 1987
 * Constitution + OAS package are blue.
 *
 * Usage:
 *   npx tsx scripts/census.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { SOURCES } from './lib/sources.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '../data');
const CENSUS_PATH = path.join(DATA_DIR, 'census.json');

async function main(): Promise<void> {
  console.log('Haitian Law MCP — Census (open-mirror)');
  console.log('======================================\n');
  console.log('  Jurisdiction: Haiti (HT)');
  console.log('  Legal system: French civil law (Napoleonic Code)');
  console.log('  Languages: French');
  console.log('  Source posture: open historical mirrors only — sovereign portals DNS-dead 2026-04-27');
  console.log('');

  fs.mkdirSync(DATA_DIR, { recursive: true });

  const laws = SOURCES.map(src => ({
    id: src.id,
    title: src.title,
    title_en: src.titleEn,
    identifier: src.shortName,
    url: src.url,
    status: 'in_force' as const,
    category: 'act' as const,
    classification: 'ingestable' as const,
    ingested: false,
    provision_count: 0,
    ingestion_date: null as string | null,
    issued_date: src.issuedDate,
    norm_type: src.normType,
    source_type: src.sourceType,
    confidence_tier: src.tier,
    expected_articles: src.expectedArticles,
    mirror: src.mirror,
  }));

  const normTypeCounts: Record<string, number> = {};
  const tierCounts: Record<string, number> = {};
  const sourceTypeCounts: Record<string, number> = {};
  for (const law of laws) {
    normTypeCounts[law.norm_type] = (normTypeCounts[law.norm_type] || 0) + 1;
    tierCounts[law.confidence_tier] = (tierCounts[law.confidence_tier] || 0) + 1;
    sourceTypeCounts[law.source_type] = (sourceTypeCounts[law.source_type] || 0) + 1;
  }

  const census = {
    schema_version: '2.1',
    jurisdiction: 'HT',
    jurisdiction_name: 'Haiti',
    portal: 'open-mirror-aggregate',
    portal_note:
      'Sovereign Haitian legal portals (dfrn.gouv.ht, justice.gouv.ht, parliament.ht, senat.gouv.ht, bnht.gouv.ht, moniteur.gouv.ht) verified DNS-dead 2026-04-27. Census seeded from open historical mirrors only.',
    census_date: new Date().toISOString().split('T')[0],
    agent: 'haitian-law-mcp/census.ts',
    summary: {
      total_laws: laws.length,
      ingestable: laws.length,
      ocr_needed: 0,
      inaccessible: 0,
      excluded: 0,
    },
    breakdown: {
      by_norm_type: normTypeCounts,
      by_confidence_tier: tierCounts,
      by_source_type: sourceTypeCounts,
    },
    laws,
  };

  fs.writeFileSync(CENSUS_PATH, JSON.stringify(census, null, 2));

  console.log('==================================================');
  console.log('CENSUS COMPLETE');
  console.log('==================================================');
  console.log(`  Total laws:        ${laws.length}`);
  console.log(`  All ingestable:    ${laws.length}`);
  console.log('');
  console.log('  By norm type:');
  for (const [type, count] of Object.entries(normTypeCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${type}: ${count}`);
  }
  console.log('  By confidence tier:');
  for (const [tier, count] of Object.entries(tierCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${tier}: ${count}`);
  }
  console.log('  By source type:');
  for (const [t, count] of Object.entries(sourceTypeCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${t}: ${count}`);
  }
  console.log(`\n  Output: ${CENSUS_PATH}`);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
