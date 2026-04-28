/**
 * Haitian Law PDF/Text Parser
 *
 * Parses law text extracted from PDFs or HTML downloaded from
 * Haitian government sources. Uses `pdftotext` (poppler-utils) for
 * PDF extraction, then applies regex-based article parsing tuned
 * for Haitian civil law conventions.
 *
 * Haiti follows French civil law (Napoleonic Code tradition):
 *
 *   Article patterns:
 *     "Article N" / "ARTICLE N" / "Art. N"
 *     "Article N.-" / "Article N:"
 *     "Article Premier" / "ARTICLE UNIQUE"
 *
 *   Structural patterns:
 *     "TITRE I", "CHAPITRE I", "SECTION I"
 *     "LIVRE I", "SOUS-SECTION"
 *     "DISPOSITIONS TRANSITOIRES", "DISPOSITIONS FINALES"
 *     "DISPOSITIONS GENERALES"
 *
 *   Definition patterns:
 *     "on entend par ..." / "au sens de la presente loi ..."
 *     "est defini comme ..." / "designe ..."
 *
 * Haiti's legal system is based on French civil law.
 * Laws are published in Le Moniteur (official gazette).
 * Languages: French and Haitian Creole.
 *
 * SECURITY: Uses execFileSync (NOT exec/execSync). The pdfPath argument
 * is passed as an array element to execFileSync, which does NOT spawn a
 * shell. This prevents shell injection even if pdfPath contains malicious
 * characters like backticks, semicolons, or pipes.
 */

import { execFileSync } from 'child_process';

/* ---------- Shared Types ---------- */

export interface ActIndexEntry {
  id: string;
  title: string;
  titleEn: string;
  shortName: string;
  status: 'in_force' | 'amended' | 'repealed' | 'not_yet_in_force';
  issuedDate: string;
  inForceDate: string;
  url: string;
  description?: string;
}

export interface ParsedProvision {
  provision_ref: string;
  chapter?: string;
  section: string;
  title: string;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface ParsedDefinition {
  term: string;
  definition: string;
  source_provision?: string;
}

export interface ParsedAct {
  id: string;
  type: 'statute';
  title: string;
  title_en: string;
  short_name: string;
  status: string;
  issued_date: string;
  in_force_date: string;
  url: string;
  description?: string;
  provisions: ParsedProvision[];
  definitions: ParsedDefinition[];
}

/* ---------- PDF Text Extraction ---------- */

/**
 * Extract text from a PDF file using pdftotext (poppler-utils).
 *
 * SECURITY: execFileSync passes arguments as an array, bypassing
 * shell parsing entirely. No shell injection is possible.
 */
export function extractTextFromPdf(pdfPath: string): string {
  // SECURITY: execFileSync prevents command injection -- arguments passed as array, not shell string
  try {
    return execFileSync('pdftotext', ['-layout', pdfPath, '-'], {
      maxBuffer: 50 * 1024 * 1024,
      encoding: 'utf-8',
      timeout: 30000,
    });
  } catch {
    try {
      return execFileSync('pdftotext', [pdfPath, '-'], {
        maxBuffer: 50 * 1024 * 1024,
        encoding: 'utf-8',
        timeout: 30000,
      });
    } catch {
      return '';
    }
  }
}

/* ---------- Text Cleaning ---------- */

function decodeEntities(text: string): string {
  return text
    .replace(/&agrave;/g, '\u00e0').replace(/&egrave;/g, '\u00e8')
    .replace(/&igrave;/g, '\u00ec').replace(/&ograve;/g, '\u00f2')
    .replace(/&ugrave;/g, '\u00f9')
    .replace(/&aacute;/g, '\u00e1').replace(/&eacute;/g, '\u00e9')
    .replace(/&iacute;/g, '\u00ed').replace(/&oacute;/g, '\u00f3')
    .replace(/&uacute;/g, '\u00fa')
    .replace(/&acirc;/g, '\u00e2').replace(/&ecirc;/g, '\u00ea')
    .replace(/&icirc;/g, '\u00ee').replace(/&ocirc;/g, '\u00f4')
    .replace(/&ucirc;/g, '\u00fb')
    .replace(/&ccedil;/g, '\u00e7').replace(/&Ccedil;/g, '\u00c7')
    .replace(/&euml;/g, '\u00eb').replace(/&iuml;/g, '\u00ef')
    .replace(/&ouml;/g, '\u00f6').replace(/&uuml;/g, '\u00fc')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&laquo;/g, '\u00ab')
    .replace(/&raquo;/g, '\u00bb')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)));
}

function cleanText(text: string): string {
  return decodeEntities(text)
    // Strip HTML comments first — Constitute Project pages embed
    // <!--Section: section/N, type: body--> markers inline with text.
    // Must come before tag-strip because comments don't match the tag regex.
    .replace(/<!--[\s\S]*?-->/g, '')
    // Only strip recognisable HTML tags; loose `<[^>]*>` corrupts OCR text
    // that contains stray `<` glyphs (greedy match eats real prose). Cf.
    // Code Civil OCR artefacts where '<' appears as a misread char.
    .replace(/<\/?[a-zA-Z][^<>]{0,200}>/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\f/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/* ---------- Article/Section Parsing ---------- */

// Haitian article patterns (French civil law)
const ARTICLE_PATTERNS = [
  // "Article 1.-", "Article 1:", "Article 1."
  /(?:^|\n)\s*(?:Article|ARTICLE|Art\.?)\s+((?:\d+[\s.]*(?:bis|ter|quater)?|\d+[A-Za-z]?(?:\.\d+)?|Premier|PREMIER|Unique|UNIQUE))\s*[.\u00b0\u00ba]*[-.:;\u2013]?\s*([^\n]*)/gimu,
];

// Structural patterns: TITRE, CHAPITRE, SECTION, LIVRE
const CHAPTER_RE = /(?:^|\n)\s*((?:TITRE|CHAPITRE|SECTION|SOUS-SECTION|LIVRE|DISPOSITIONS?\s+(?:TRANSITOIRES?|FINALES?|G[E\u00c9]N[E\u00c9]RALES?|PR[E\u00c9]LIMINAIRES?|COMMUNES?))\s*[IVXLC0-9]*[^\n]*)/gimu;

// Definition patterns for French legal drafting
const DEFINITION_PATTERNS = [
  // "on entend par X: ..."
  /on\s+entend\s+par\s+[\u00ab"\u201C]?([^\u00bb"\u201D.:,]{3,80})[\u00bb"\u201D]?\s*[,:]\s*([^.;]+[.;])/gi,

  // "au sens de la presente loi"
  /au\s+sens\s+(?:de\s+)?(?:la\s+pr[e\u00e9]sente|du\s+pr[e\u00e9]sent)\s+(?:loi|d[e\u00e9]cret|code)[^:]*:\s*\n?\s*(?:\d+[.)]\s*)?[\u00ab"\u201C]?([^\u00bb"\u201D:;\u2013-]{3,80})[\u00bb"\u201D]?\s*[:;\u2013-]\s*([^.;]+[.;])/gim,

  // "est defini comme ..."
  /[\u00ab"\u201C]([^\u00bb"\u201D]{2,60})[\u00bb"\u201D]\s+(?:est\s+d[e\u00e9]fini(?:e)?\s+comme|d[e\u00e9]signe|signifie)\s+([^.;]+[.;])/gi,

  // Quoted term definitions: <<X>> : ...
  /[\u00ab"\u201C]([^\u00bb"\u201D]{2,60})[\u00bb"\u201D]\s*[:;\u2013-]\s*([^.;]+[.;])/gi,
];

/* ---------- Law Text Boundary Detection ---------- */

/**
 * Find where the actual law text begins, skipping gazette headers
 * and preamble.
 */
function findLawTextStart(text: string): number {
  const startPatterns = [
    /\bVU\s+(?:la\s+Constitution|le\s+D[e\u00e9]cret|la\s+Loi)\b/i,
    /\bCONSID[E\u00c9]RANT\b/i,
    /\bD[E\u00c9]CR[\u00c8E]TE\s*:/i,
    /\bA\s+ARR[\u00caE]T[\u00c9E]\s*:/i,
    /\bEST\s+ORDONN[\u00c9E]\s*:/i,
    /\bSUR\s+LE\s+RAPPORT\s+DU\s+MINISTRE\b/i,

    // First article
    /(?:^|\n)\s*(?:ARTICLE|Article)\s+(?:1|Premier|PREMIER|Unique|UNIQUE)\s*[.\u00b0\u00ba]*[-.:;\u2013]/im,

    // TITRE I / CHAPITRE I
    /(?:^|\n)\s*TITRE\s+(?:I|1|PREMIER)\b/im,

    // Dispositions Generales
    /\bDISPOSITIONS\s+G[E\u00c9]N[E\u00c9]RALES\b/i,
  ];

  let earliestPos = text.length;
  for (const pattern of startPatterns) {
    const match = pattern.exec(text);
    if (match && match.index < earliestPos) {
      earliestPos = match.index;
    }
  }

  return earliestPos === text.length ? 0 : earliestPos;
}

/* ---------- Main Parse Functions ---------- */

export interface ParseOptions {
  /** Confidence tier — stamped on every emitted provision's metadata.confidence_tier. */
  tier?: 'blue' | 'amber';
  /** Free-form provenance string, surfaced in metadata.source_format. */
  sourceFormat?: string;
}

function provisionMetadata(opts: ParseOptions | undefined): Record<string, unknown> | undefined {
  if (!opts || (!opts.tier && !opts.sourceFormat)) return undefined;
  const md: Record<string, unknown> = {};
  if (opts.tier) md.confidence_tier = opts.tier;
  if (opts.sourceFormat) md.source_format = opts.sourceFormat;
  return md;
}

export function parseHTLawText(text: string, act: ActIndexEntry, opts?: ParseOptions): ParsedAct {
  const cleaned = cleanText(text);
  const startIdx = findLawTextStart(cleaned);
  const lawText = cleaned.substring(startIdx);

  const provisions: ParsedProvision[] = [];
  const definitions: ParsedDefinition[] = [];

  interface Heading {
    ref: string;
    title: string;
    position: number;
  }

  const headings: Heading[] = [];

  for (const pattern of ARTICLE_PATTERNS) {
    const re = new RegExp(pattern.source, pattern.flags);
    let match: RegExpExecArray | null;

    while ((match = re.exec(lawText)) !== null) {
      const rawNum = match[1].replace(/\s+/g, '').replace(/\.$/, '');
      const num = rawNum.toLowerCase() === 'premier' ? '1'
        : rawNum.toLowerCase() === 'unique' ? 'unique'
        : rawNum;
      const title = (match[2] ?? '').trim();
      const ref = `art${num.toLowerCase()}`;

      if (!headings.some(h => h.ref === ref && Math.abs(h.position - match!.index) < 20)) {
        headings.push({
          ref,
          title: title || `Article ${num}`,
          position: match.index,
        });
      }
    }
  }

  headings.sort((a, b) => a.position - b.position);

  const chapterRe = new RegExp(CHAPTER_RE.source, CHAPTER_RE.flags);
  const chapterPositions: { chapter: string; position: number }[] = [];
  let match: RegExpExecArray | null;
  while ((match = chapterRe.exec(lawText)) !== null) {
    chapterPositions.push({
      chapter: match[1].trim(),
      position: match.index,
    });
  }

  let currentChapter = '';
  for (let i = 0; i < headings.length; i++) {
    const heading = headings[i];
    const nextHeading = headings[i + 1];
    const endPos = nextHeading ? nextHeading.position : lawText.length;
    const content = lawText.substring(heading.position, endPos).trim();

    for (const cp of chapterPositions) {
      if (cp.position <= heading.position) {
        currentChapter = cp.chapter;
      }
    }

    const cleanedContent = content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n');

    if (cleanedContent.length > 10) {
      const metadata = provisionMetadata(opts);
      provisions.push({
        provision_ref: heading.ref,
        chapter: currentChapter || undefined,
        section: currentChapter || act.title,
        title: heading.title,
        content: cleanedContent,
        ...(metadata ? { metadata } : {}),
      });
    }
  }

  for (const pattern of DEFINITION_PATTERNS) {
    const defRe = new RegExp(pattern.source, pattern.flags);
    while ((match = defRe.exec(lawText)) !== null) {
      const term = (match[1] ?? '').trim();
      const definition = (match[2] ?? '').trim();

      if (term.length > 2 && term.length < 100 && definition.length > 10) {
        let sourceProvision: string | undefined;
        for (let i = headings.length - 1; i >= 0; i--) {
          if (headings[i].position <= match.index) {
            sourceProvision = headings[i].ref;
            break;
          }
        }

        definitions.push({
          term,
          definition,
          source_provision: sourceProvision,
        });
      }
    }
  }

  if (provisions.length === 0 && lawText.length > 50) {
    const metadata = provisionMetadata(opts);
    provisions.push({
      provision_ref: 'full-text',
      section: act.title,
      title: act.title,
      content: lawText.substring(0, 50000),
      ...(metadata ? { metadata } : {}),
    });
  }

  return {
    id: act.id,
    type: 'statute',
    title: act.title,
    title_en: act.titleEn,
    short_name: act.shortName,
    status: act.status,
    issued_date: act.issuedDate,
    in_force_date: act.inForceDate,
    url: act.url,
    provisions,
    definitions,
  };
}

export function parseHTLawPdf(pdfPath: string, act: ActIndexEntry, opts?: ParseOptions): ParsedAct {
  const text = extractTextFromPdf(pdfPath);

  if (!text || text.trim().length < 50) {
    return {
      id: act.id,
      type: 'statute',
      title: act.title,
      title_en: act.titleEn,
      short_name: act.shortName,
      status: act.status,
      issued_date: act.issuedDate,
      in_force_date: act.inForceDate,
      url: act.url,
      provisions: [],
      definitions: [],
    };
  }

  return parseHTLawText(text, act, opts);
}

export function parseHtml(html: string, act: ActIndexEntry, opts?: ParseOptions): ParsedAct {
  return parseHTLawText(html, act, opts);
}

/* ---------- Constitute Project HTML parser ----------
 *
 * Constitute Project structures Haitian Constitution as:
 *   <h3 class="depth-2">Article N</h3>
 *   <div class="section ..."><p class="content">body</p></div>
 *   <h3 class="depth-1">CHAPTER ...</h3>
 *   <h3 class="depth-0">TITLE ...</h3>
 *
 * We strip nav/script, then walk <h3> markers with intervening body.
 */
export function parseHTLawConstituteHtml(html: string, act: ActIndexEntry, opts?: ParseOptions): ParsedAct {
  let scoped = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '');

  const provisions: ParsedProvision[] = [];
  const definitions: ParsedDefinition[] = [];
  const md = provisionMetadata(opts);

  const tokens: { kind: 'heading' | 'body'; text: string }[] = [];
  const headingRe = /<h([23])[^>]*>([\s\S]*?)<\/h\1>/gi;
  let lastIdx = 0;
  let m: RegExpExecArray | null;
  while ((m = headingRe.exec(scoped)) !== null) {
    if (m.index > lastIdx) {
      tokens.push({ kind: 'body', text: scoped.slice(lastIdx, m.index) });
    }
    tokens.push({ kind: 'heading', text: cleanText(m[2]).replace(/\s+/g, ' ').trim() });
    lastIdx = m.index + m[0].length;
  }
  if (lastIdx < scoped.length) {
    tokens.push({ kind: 'body', text: scoped.slice(lastIdx) });
  }

  let currentTitle = '';
  let currentChapter = '';
  let pendingArticle: { ref: string; title: string } | null = null;
  let pendingBody = '';

  const flushPending = () => {
    if (!pendingArticle) return;
    const text = cleanText(pendingBody)
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0)
      .join('\n')
      .trim();
    if (text.length > 5) {
      provisions.push({
        provision_ref: pendingArticle.ref,
        chapter: currentChapter || undefined,
        section: currentTitle || currentChapter || act.title,
        title: `Article ${pendingArticle.title}`,
        content: text,
        ...(md ? { metadata: md } : {}),
      });
    }
    pendingArticle = null;
    pendingBody = '';
  };

  // Match: "Article N", "First Article", "First Article N", "Article 4-1"
  const articleHeadingRe = /^(?:First\s+Article(?:\s+(\d+(?:-\d+)?))?|Article\s+(\d+(?:-\d+)?))\b/i;

  for (const tok of tokens) {
    if (tok.kind === 'heading') {
      if (/^TITLE\b|^TITRE\b/i.test(tok.text)) {
        flushPending();
        currentTitle = tok.text;
        continue;
      }
      if (/^CHAPTER\b|^CHAPITRE\b|^SECTION\b/i.test(tok.text)) {
        flushPending();
        currentChapter = tok.text;
        continue;
      }
      const am = articleHeadingRe.exec(tok.text);
      if (am) {
        flushPending();
        const numRaw = am[2] ?? am[1] ?? '1';
        const num = numRaw || '1';
        pendingArticle = { ref: `art${num.toLowerCase()}`, title: num };
        continue;
      }
      flushPending();
      continue;
    }
    if (pendingArticle) {
      pendingBody += '\n' + tok.text;
    }
  }
  flushPending();

  const plain = cleanText(scoped);
  for (const pattern of DEFINITION_PATTERNS) {
    const re = new RegExp(pattern.source, pattern.flags);
    let dm: RegExpExecArray | null;
    while ((dm = re.exec(plain)) !== null) {
      const term = (dm[1] ?? '').trim();
      const definition = (dm[2] ?? '').trim();
      if (term.length > 2 && term.length < 100 && definition.length > 10) {
        definitions.push({ term, definition });
      }
    }
  }

  return {
    id: act.id,
    type: 'statute',
    title: act.title,
    title_en: act.titleEn,
    short_name: act.shortName,
    status: act.status,
    issued_date: act.issuedDate,
    in_force_date: act.inForceDate,
    url: act.url,
    provisions,
    definitions,
  };
}

/* ---------- IA DJVU TXT parser ----------
 *
 * Internet Archive's pre-OCR DJVU TXT files are plain-text dumps of the
 * scan with form-feed page breaks, page numbers, running headers/footers,
 * and the usual OCR noise.
 *
 * Strategy:
 *   1. Drop pages with no article markers, no structural markers, and
 *      no real letter density (kills front-matter title pages).
 *   2. Strip page-number-only and pure-noise lines.
 *   3. Hand off to parseHTLawText for the standard French-civil-law pass.
 */
export function parseHTLawDjvuTxt(text: string, act: ActIndexEntry, opts?: ParseOptions): ParsedAct {
  const pages = text.replace(/\r\n/g, '\n').split(/\f/);

  const cleanedPages: string[] = [];
  for (const page of pages) {
    const stripped = page.trim();
    if (stripped.length === 0) continue;
    const hasArticle = /\b(?:Art(?:icle|\.)?)\s*\d/i.test(stripped);
    const hasStructure = /\b(?:TITRE|CHAPITRE|LIVRE|SECTION|CODE\s+(?:CIVIL|P[EÉ]NAL|DE\s+COMMERCE|DE\s+PROC[EÉ]DURE|D'INSTRUCTION|DU\s+TRAVAIL))\b/i.test(stripped);
    const letterCount = stripped.replace(/[^a-zA-ZÀ-ſ]/g, '').length;
    if (hasArticle || hasStructure || letterCount > 80) {
      cleanedPages.push(page);
    }
  }

  const denoise = (page: string): string =>
    page
      .split('\n')
      .map(l => l.trim())
      .filter(l => {
        if (l.length === 0) return false;
        if (/^[—\-\s]*\d{1,4}[—\-\s]*$/.test(l)) return false;
        if (/^[—\-]+$/.test(l)) return false;
        const letters = l.replace(/[^a-zA-ZÀ-ſ]/g, '').length;
        if (letters < 3 && l.length < 30) return false;
        if (/^(?:CODE\s+(?:CIVIL|P[EÉ]NAL|DE\s+COMMERCE|DE\s+PROC[EÉ]DURE\s+CIVILE|D'INSTRUCTION\s+CRIMINELLE|DU\s+TRAVAIL))\s*$/i.test(l)) return false;
        return true;
      })
      .join('\n');

  const denoisedText = cleanedPages.map(denoise).join('\n\n');
  return parseHTLawText(denoisedText, act, opts);
}
