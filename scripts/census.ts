#!/usr/bin/env tsx
/**
 * Haitian Law MCP -- Census Script
 *
 * Enumerates Haitian laws from available government portals.
 *
 * Primary portal attempts:
 *   - https://www.dfrn.gouv.ht/lois-et-decrets/
 *   - https://www.primature.gouv.ht/
 *
 * Fallback: curated list of major Haitian legislation (PDFs hosted
 * on dfrn.gouv.ht/wp-content/uploads/).
 *
 * Language: French (civil law, Napoleonic Code tradition)
 * Gazette: Le Moniteur
 *
 * Usage:
 *   npx tsx scripts/census.ts
 *   npx tsx scripts/census.ts --limit 50
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '../data');
const CENSUS_PATH = path.join(DATA_DIR, 'census.json');

const DFRN_URL = 'https://www.dfrn.gouv.ht/lois-et-decrets/';
const PRIMATURE_URL = 'https://www.primature.gouv.ht';

const USER_AGENT = 'haitian-law-mcp/1.0 (https://github.com/Ansvar-Systems/Haitian-law-mcp; hello@ansvar.ai)';
const MIN_DELAY_MS = 500;

/* ---------- Types ---------- */

interface RawLawEntry {
  title: string;
  url: string;
  year: string;
  normType: string;
}

/* ---------- HTTP ---------- */

async function fetchPage(url: string, timeoutMs = 15000): Promise<string | null> {
  await new Promise(resolve => setTimeout(resolve, MIN_DELAY_MS));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html, application/xhtml+xml, */*',
        'Accept-Language': 'fr,en;q=0.5',
      },
      redirect: 'follow',
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (response.status !== 200) {
      console.log(`  HTTP ${response.status} for ${url}`);
      return null;
    }

    return response.text();
  } catch (err) {
    clearTimeout(timeout);
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`  Fetch error for ${url}: ${msg}`);
    return null;
  }
}

/* ---------- Parsing ---------- */

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&agrave;/gi, '\u00e0').replace(/&egrave;/gi, '\u00e8')
    .replace(/&eacute;/gi, '\u00e9').replace(/&icirc;/gi, '\u00ee')
    .replace(/&ocirc;/gi, '\u00f4').replace(/&ucirc;/gi, '\u00fb')
    .replace(/&ccedil;/gi, '\u00e7').replace(/&acirc;/gi, '\u00e2')
    .replace(/&ecirc;/gi, '\u00ea').replace(/&iuml;/gi, '\u00ef')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&laquo;/g, '\u00ab')
    .replace(/&raquo;/g, '\u00bb')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)));
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 60);
}

function classifyNormType(title: string): string {
  const t = title.toLowerCase();
  if (/\bd[e\u00e9]cret[\s-]*loi\b/.test(t)) return 'decret-loi';
  if (/\bconstitution\b/.test(t)) return 'constitution';
  if (/\bcode\b/.test(t)) return 'code';
  if (/\bloi\b/.test(t)) return 'loi';
  if (/\bd[e\u00e9]cret\b/.test(t)) return 'decret';
  if (/\barr[\u00ea]t[e\u00e9]\b/.test(t)) return 'arrete';
  if (/\bordonnance\b/.test(t)) return 'ordonnance';
  if (/\br[e\u00e9]solution\b/.test(t)) return 'resolution';
  return 'other';
}

function extractYearFromTitle(title: string): string {
  const yearMatch = title.match(/\b(19\d{2}|20[0-2]\d)\b/);
  return yearMatch ? yearMatch[1] : '';
}

/**
 * Extract law entries from an HTML page containing links to laws/PDFs.
 */
function extractLawLinks(html: string, baseUrl: string): RawLawEntry[] {
  const entries: RawLawEntry[] = [];
  const seen = new Set<string>();

  const linkRe = /<a\s+[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;

  while ((match = linkRe.exec(html)) !== null) {
    const rawHref = match[1];
    const rawTitle = stripHtml(match[2]).trim();

    if (!rawTitle || rawTitle.length < 5) continue;
    if (rawHref.startsWith('#') || rawHref.startsWith('javascript:')) continue;
    if (rawHref.includes('login') || rawHref.includes('signup')) continue;

    const isLawLink = rawHref.includes('.pdf')
      || /\b(?:loi|decret|arrete|code|constitution|ordonnance)\b/i.test(rawTitle)
      || /\b(?:loi|decret|arrete|code|constitution|ordonnance)\b/i.test(rawHref);

    if (!isLawLink) continue;

    let url = rawHref;
    if (!url.startsWith('http')) {
      const base = baseUrl.replace(/\/$/, '');
      url = url.startsWith('/') ? `${new URL(base).origin}${url}` : `${base}/${url}`;
    }

    if (seen.has(url)) continue;
    seen.add(url);

    const title = decodeHtmlEntities(rawTitle);
    const year = extractYearFromTitle(title);
    const normType = classifyNormType(title);

    entries.push({ title, url, year, normType });
  }

  return entries;
}

/**
 * Curated list of major Haitian legislation.
 * Used as fallback when portals are inaccessible.
 */
function getCuratedLaws(): RawLawEntry[] {
  return [
    { title: 'Constitution de la R\u00e9publique d\'Ha\u00efti (1987)', url: 'https://www.dfrn.gouv.ht/wp-content/uploads/2020/10/Constitution-de-1987.pdf', year: '1987', normType: 'constitution' },
    { title: 'Constitution de 1987 amend\u00e9e (2012)', url: 'https://www.dfrn.gouv.ht/wp-content/uploads/2020/10/Constitution-1987-amendee-2012.pdf', year: '2012', normType: 'constitution' },
    { title: 'Code P\u00e9nal', url: 'https://www.dfrn.gouv.ht/wp-content/uploads/2020/10/Code-Penal.pdf', year: '1835', normType: 'code' },
    { title: 'Code Civil', url: 'https://www.dfrn.gouv.ht/wp-content/uploads/2020/10/Code-Civil.pdf', year: '1825', normType: 'code' },
    { title: 'Code de Commerce', url: 'https://www.dfrn.gouv.ht/wp-content/uploads/2020/10/Code-de-Commerce.pdf', year: '1826', normType: 'code' },
    { title: 'Code de Proc\u00e9dure Civile', url: 'https://www.dfrn.gouv.ht/wp-content/uploads/2020/10/Code-de-Procedure-Civile.pdf', year: '1835', normType: 'code' },
    { title: 'Code d\'Instruction Criminelle', url: 'https://www.dfrn.gouv.ht/wp-content/uploads/2020/10/Code-Instruction-Criminelle.pdf', year: '1835', normType: 'code' },
    { title: 'Code Rural', url: 'https://www.dfrn.gouv.ht/wp-content/uploads/2020/10/Code-Rural.pdf', year: '1864', normType: 'code' },
    { title: 'Code du Travail', url: 'https://www.dfrn.gouv.ht/wp-content/uploads/2020/10/Code-du-Travail.pdf', year: '1984', normType: 'code' },
    { title: 'Code Fiscal', url: 'https://www.dfrn.gouv.ht/wp-content/uploads/2020/10/Code-Fiscal.pdf', year: '2005', normType: 'code' },
    { title: 'Loi portant sur la d\u00e9claration de patrimoine', url: 'https://www.dfrn.gouv.ht/wp-content/uploads/2020/10/Loi-Declaration-Patrimoine.pdf', year: '2008', normType: 'loi' },
    { title: 'Loi sur l\'\u00e9tat d\'urgence', url: 'https://www.dfrn.gouv.ht/wp-content/uploads/2020/10/Loi-Etat-Urgence.pdf', year: '2008', normType: 'loi' },
    { title: 'D\u00e9cret sur la Fonction Publique', url: 'https://www.dfrn.gouv.ht/wp-content/uploads/2020/10/Decret-Fonction-Publique.pdf', year: '2005', normType: 'decret' },
    { title: 'Loi sur la paternit\u00e9, la maternit\u00e9 et la filiation', url: 'https://www.dfrn.gouv.ht/wp-content/uploads/2020/10/Loi-Paternite-Maternite.pdf', year: '2014', normType: 'loi' },
    { title: 'D\u00e9cret sur l\'environnement', url: 'https://www.dfrn.gouv.ht/wp-content/uploads/2020/10/Decret-Environnement.pdf', year: '2006', normType: 'decret' },
    { title: 'D\u00e9cret organisant le syst\u00e8me \u00e9ducatif ha\u00eftien', url: 'https://www.dfrn.gouv.ht/wp-content/uploads/2020/10/Decret-Systeme-Educatif.pdf', year: '2007', normType: 'decret' },
    { title: 'Loi sur les t\u00e9l\u00e9communications', url: 'https://www.dfrn.gouv.ht/wp-content/uploads/2020/10/Loi-Telecommunications.pdf', year: '2009', normType: 'loi' },
    { title: 'Loi sur le blanchiment des avoirs', url: 'https://www.dfrn.gouv.ht/wp-content/uploads/2020/10/Loi-Blanchiment-Avoirs.pdf', year: '2013', normType: 'loi' },
    { title: 'Loi sur la pr\u00e9vention et la r\u00e9pression de la corruption', url: 'https://www.dfrn.gouv.ht/wp-content/uploads/2020/10/Loi-Prevention-Corruption.pdf', year: '2014', normType: 'loi' },
    { title: 'D\u00e9cret portant organisation de la Cour Sup\u00e9rieure des Comptes', url: 'https://www.dfrn.gouv.ht/wp-content/uploads/2020/10/Decret-Cour-Comptes.pdf', year: '2005', normType: 'decret' },
    { title: 'Loi sur les associations', url: 'https://www.dfrn.gouv.ht/wp-content/uploads/2020/10/Loi-Associations.pdf', year: '1940', normType: 'loi' },
    { title: 'Loi \u00e9lectorale', url: 'https://www.dfrn.gouv.ht/wp-content/uploads/2020/10/Loi-Electorale.pdf', year: '2015', normType: 'loi' },
    { title: 'Loi portant int\u00e9gration des personnes handicap\u00e9es', url: 'https://www.dfrn.gouv.ht/wp-content/uploads/2020/10/Loi-Integration-Handicapes.pdf', year: '2012', normType: 'loi' },
    { title: 'Loi sur la nationalit\u00e9', url: 'https://www.dfrn.gouv.ht/wp-content/uploads/2020/10/Loi-Nationalite.pdf', year: '2014', normType: 'loi' },
  ];
}

function parseArgs(): { limit: number | null } {
  const args = process.argv.slice(2);
  let limit: number | null = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--limit' && args[i + 1]) {
      limit = parseInt(args[i + 1], 10);
      if (isNaN(limit) || limit < 1) {
        console.error(`Invalid --limit value: ${args[i + 1]}`);
        process.exit(1);
      }
      i++;
    }
  }

  return { limit };
}

/* ---------- Main ---------- */

async function main(): Promise<void> {
  const { limit } = parseArgs();

  console.log('Haitian Law MCP -- Census');
  console.log('=========================\n');
  console.log('  Jurisdiction: Haiti (HT)');
  console.log('  Legal system: French civil law (Napoleonic Code)');
  console.log('  Gazette: Le Moniteur');
  console.log('  Language: French');
  if (limit) console.log(`  --limit ${limit}`);
  console.log('');

  fs.mkdirSync(DATA_DIR, { recursive: true });

  const allEntries: RawLawEntry[] = [];

  // Step 1: Try dfrn.gouv.ht
  console.log('  Step 1: Trying dfrn.gouv.ht/lois-et-decrets/ ...');
  const dfrnHtml = await fetchPage(DFRN_URL);

  if (dfrnHtml && dfrnHtml.length > 1000) {
    const entries = extractLawLinks(dfrnHtml, DFRN_URL);
    console.log(`    Found ${entries.length} law entries from dfrn.gouv.ht`);
    allEntries.push(...entries);
  } else {
    console.log('    dfrn.gouv.ht inaccessible or empty');
  }

  // Step 2: Try primature.gouv.ht
  if (allEntries.length < 10) {
    console.log('  Step 2: Trying primature.gouv.ht ...');
    const primatHtml = await fetchPage(PRIMATURE_URL);
    if (primatHtml && primatHtml.length > 1000) {
      const entries = extractLawLinks(primatHtml, PRIMATURE_URL);
      console.log(`    Found ${entries.length} entries from primature.gouv.ht`);
      allEntries.push(...entries);
    } else {
      console.log('    primature.gouv.ht inaccessible or empty');
    }
  }

  // Step 3: Use curated fallback if portals returned too few
  if (allEntries.length < 5) {
    console.log('  Step 3: Using curated fallback census (24 major laws)...');
    const curated = getCuratedLaws();
    allEntries.push(...curated);
    console.log(`    Added ${curated.length} curated entries`);
  }

  // Deduplicate
  const seenUrls = new Map<string, RawLawEntry>();
  for (const entry of allEntries) {
    const key = entry.url.toLowerCase();
    if (!seenUrls.has(key)) {
      seenUrls.set(key, entry);
    }
  }

  const unique = Array.from(seenUrls.values());
  const finalEntries = limit ? unique.slice(0, limit) : unique;

  const laws = finalEntries.map((entry) => {
    const id = `ht-${slugify(entry.title)}`;

    return {
      id,
      title: entry.title,
      identifier: entry.title,
      url: entry.url,
      status: 'in_force' as const,
      category: 'act' as const,
      classification: 'ingestable' as const,
      ingested: false,
      provision_count: 0,
      ingestion_date: null as string | null,
      issued_date: entry.year ? `${entry.year}-01-01` : '',
      norm_type: entry.normType,
    };
  });

  const normTypeCounts: Record<string, number> = {};
  for (const entry of finalEntries) {
    normTypeCounts[entry.normType] = (normTypeCounts[entry.normType] || 0) + 1;
  }

  const census = {
    schema_version: '2.0',
    jurisdiction: 'HT',
    jurisdiction_name: 'Haiti',
    portal: 'dfrn.gouv.ht',
    portal_note: 'Government portals intermittently available; curated fallback used when needed',
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
    },
    laws,
  };

  fs.writeFileSync(CENSUS_PATH, JSON.stringify(census, null, 2));

  console.log('\n==================================================');
  console.log('CENSUS COMPLETE');
  console.log('==================================================');
  console.log(`  Total laws discovered:  ${laws.length}`);
  console.log(`  All ingestable:         ${laws.length}`);
  console.log('');
  console.log('  By norm type:');
  for (const [type, count] of Object.entries(normTypeCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${type}: ${count}`);
  }
  console.log(`\n  Output: ${CENSUS_PATH}`);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
