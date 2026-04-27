/**
 * Haitian Law MCP — Open-Mirror Source Catalogue
 *
 * Haiti's sovereign legal portals (dfrn.gouv.ht, justice.gouv.ht,
 * parliament.ht, senat.gouv.ht, bnht.gouv.ht, moniteur.gouv.ht) were
 * verified DNS-dead on 2026-04-27 — gone, not geo-restricted, no VPN
 * unlock available. This MCP ships from open historical mirrors only.
 *
 * Tier policy (per docs/handover/2026-04-27-haiti-source-scout.md and
 * memory feedback_ocr_corpus_must_be_amber_tier.md):
 *
 *   - Blue: text-layered, structurally parseable, primary-source quality
 *   - Amber: OCR'd from historical print scans; treat as starting point,
 *     not authoritative. Per-provision metadata.confidence_tier surfaces
 *     this in the customer-visible _citation envelope.
 *
 * MCP-wide tier defaults to Amber because the bulk of the corpus is
 * OCR-derived (Codes Civil / Pénal / Procédure civile / Instruction
 * criminelle / Commerce / Travail). The 1987 Constitution (Constitute
 * Project + PDBA mirror) and OAS PDFs are Blue.
 *
 * WIPO Lex IP package: WIPO Lex was unreachable from the build host on
 * 2026-04-27 (www.wipo.int connection timeouts; wipolex-res.wipo.int
 * returned 500 Internal Server Error on direct PDF probes). Sources are
 * registered here but expected to fail at fetch time and land as
 * `inaccessible` per the No Silent Fallbacks rule.
 */

export type SourceTier = 'blue' | 'amber';

export type SourceType =
  | 'constitute-html' // Constitute Project structured HTML
  | 'pdf-text' // Text-layered PDF (pdftotext)
  | 'ia-djvu-txt' // Internet Archive pre-OCR'd DJVU TXT
  | 'wipo-pdf'; // WIPO Lex PDF (text-layer status confirmed at ingest)

export interface SourceEntry {
  /** Stable id used for census, source filename, seed filename, db doc id. */
  id: string;
  /** Original-language full title. */
  title: string;
  /** English translation for cross-lookup. */
  titleEn: string;
  /** Compact short name (e.g. for citation rendering). */
  shortName: string;
  /** Source URL to fetch. */
  url: string;
  /** How to retrieve and parse this source. */
  sourceType: SourceType;
  /** Quality tier feeding metadata.confidence_tier on every provision. */
  tier: SourceTier;
  /** Issue/promulgation year (YYYY-MM-DD or empty). */
  issuedDate: string;
  /** Order-of-magnitude expected article count for sanity-checking. */
  expectedArticles: number;
  /** Norm classification for breakdown reports. */
  normType: 'constitution' | 'code' | 'decret' | 'loi';
  /** Provenance / mirror description for sources.yml + README. */
  mirror: string;
}

export const SOURCES: SourceEntry[] = [
  // === Blue tier ===
  {
    id: 'constitution-1987',
    title: "Constitution de la République d'Haïti (1987, amendée 2012)",
    titleEn: 'Constitution of the Republic of Haiti (1987, amended 2012)',
    shortName: 'Constitution 1987',
    url: 'https://www.constituteproject.org/constitution/Haiti_2012?lang=en',
    sourceType: 'constitute-html',
    tier: 'blue',
    issuedDate: '1987-03-29',
    expectedArticles: 298,
    normType: 'constitution',
    mirror: 'Constitute Project (CC-BY-NC-SA)',
  },
  {
    id: 'constitution-1987-fr-pdba',
    title: "Constitution de la République d'Haïti (1987, version française)",
    titleEn: 'Constitution of Haiti (1987, French original)',
    shortName: 'Constitution 1987 FR',
    url: 'https://pdba.georgetown.edu/Constitutions/Haiti/constitution1987fr.pdf',
    sourceType: 'pdf-text',
    tier: 'blue',
    issuedDate: '1987-03-29',
    expectedArticles: 298,
    normType: 'constitution',
    mirror: 'PDBA Georgetown (Political Database of the Americas, public mirror)',
  },
  {
    id: 'constitution-1987-amend-oas',
    title: "Amendement constitutionnel — Journal Officiel (Le Moniteur)",
    titleEn: 'Constitutional amendment journal',
    shortName: 'Amendement constitutionnel',
    url: 'http://www.oas.org/juridico/pdfs/mesicic4_hti_amend.pdf',
    sourceType: 'pdf-text',
    tier: 'blue',
    issuedDate: '2012-06-19',
    expectedArticles: 60,
    normType: 'loi',
    mirror: 'OAS juridico (Organization of American States, public documents)',
  },
  {
    id: 'decret-2004-anti-corruption',
    title: 'Décret du 8 septembre 2004 sur la prévention et la répression de la corruption',
    titleEn: 'Decree of 8 September 2004 on the prevention and repression of corruption',
    shortName: 'Décret 2004 anti-corruption',
    url: 'https://www.oas.org/juridico/PDFs/mesicic4_hti_dec04.pdf',
    sourceType: 'pdf-text',
    tier: 'blue',
    issuedDate: '2004-09-08',
    expectedArticles: 50,
    normType: 'decret',
    mirror: 'OAS juridico (MESICIC anti-corruption mechanism)',
  },

  // === WIPO IP package — Blue if text-layer confirmed at ingest, Amber if OCR-only ===
  // WIPO Lex was unreachable on 2026-04-27 build; entries kept so failure is
  // surfaced and not silently dropped.
  {
    id: 'wipo-patents-1922',
    title: "Loi de 1922 sur les brevets d'invention et les dessins industriels",
    titleEn: 'Patents on Inventions and Industrial Designs (1922)',
    shortName: 'Loi sur les brevets 1922',
    url: 'https://www.wipo.int/wipolex/en/legislation/details/2179',
    sourceType: 'wipo-pdf',
    tier: 'blue',
    issuedDate: '1922-01-01',
    expectedArticles: 30,
    normType: 'loi',
    mirror: 'WIPO Lex (WIPO Public Information)',
  },
  {
    id: 'wipo-trademarks-1954',
    title: 'Loi du 17 juillet 1954 sur les marques de fabrique et de commerce',
    titleEn: 'Trademarks Law (1954)',
    shortName: 'Loi sur les marques 1954',
    url: 'https://www.wipo.int/wipolex/en/legislation/details/2180',
    sourceType: 'wipo-pdf',
    tier: 'blue',
    issuedDate: '1954-07-17',
    expectedArticles: 40,
    normType: 'loi',
    mirror: 'WIPO Lex (WIPO Public Information)',
  },
  {
    id: 'wipo-trademarks-decree-1960',
    title: 'Décret du 12 février 1960 modifiant la loi sur les marques',
    titleEn: 'Trademarks Decree (1960 amendment)',
    shortName: 'Décret marques 1960',
    url: 'https://www.wipo.int/wipolex/en/legislation/details/2182',
    sourceType: 'wipo-pdf',
    tier: 'blue',
    issuedDate: '1960-02-12',
    expectedArticles: 15,
    normType: 'decret',
    mirror: 'WIPO Lex (WIPO Public Information)',
  },
  {
    id: 'wipo-copyright-2005',
    title: "Décret du 9 janvier 2006 sur le droit d'auteur",
    titleEn: 'Copyright Decree (2005)',
    shortName: "Décret droit d'auteur 2005",
    url: 'https://www.wipo.int/wipolex/en/legislation/details/5091',
    sourceType: 'wipo-pdf',
    tier: 'blue',
    issuedDate: '2006-01-09',
    expectedArticles: 80,
    normType: 'decret',
    mirror: 'WIPO Lex (WIPO Public Information)',
  },

  // === Amber tier — Internet Archive pre-OCR'd historical codes ===
  {
    id: 'code-civil-1986',
    title: "Code Civil annoté d'Haïti (édition Borno, 1986 reprint)",
    titleEn: 'Haitian Civil Code (annotated, 1986 ed.)',
    shortName: 'Code Civil',
    url: 'https://archive.org/download/codecivildhaitia01hait/codecivildhaitia01hait_djvu.txt',
    sourceType: 'ia-djvu-txt',
    tier: 'amber',
    issuedDate: '1825-03-27',
    expectedArticles: 2000,
    normType: 'code',
    mirror: 'Internet Archive (Public Domain) — annotated Borno reprint',
  },
  {
    id: 'code-penal-modern',
    title: 'Code Pénal annoté de la République d\'Haïti',
    titleEn: 'Haitian Penal Code (annotated)',
    shortName: 'Code Pénal',
    url: 'https://archive.org/download/haiti_penal_code/code_penal_haiti_djvu.txt',
    sourceType: 'ia-djvu-txt',
    tier: 'amber',
    issuedDate: '1835-08-11',
    expectedArticles: 400,
    normType: 'code',
    mirror: 'Internet Archive (Public Domain)',
  },
  {
    id: 'code-procedure-civile-1963',
    title: "Code de procédure civile d'Haïti (édition 1963)",
    titleEn: 'Haitian Code of Civil Procedure (1963 ed.)',
    shortName: 'Code de procédure civile',
    url: 'https://archive.org/download/codedeprocdure00hait/codedeprocdure00hait_djvu.txt',
    sourceType: 'ia-djvu-txt',
    tier: 'amber',
    issuedDate: '1963-01-01',
    expectedArticles: 1000,
    normType: 'code',
    mirror: 'Internet Archive (Public Domain)',
  },
  {
    id: 'code-instruction-criminelle',
    title: "Code d'instruction criminelle d'Haïti",
    titleEn: 'Haitian Code of Criminal Procedure',
    shortName: "Code d'instruction criminelle",
    url: 'https://archive.org/download/codedinstruction00hait/codedinstruction00hait_djvu.txt',
    sourceType: 'ia-djvu-txt',
    tier: 'amber',
    issuedDate: '1835-08-11',
    expectedArticles: 600,
    normType: 'code',
    mirror: 'Internet Archive (Public Domain)',
  },
  {
    id: 'code-de-commerce',
    title: "Code de commerce d'Haïti",
    titleEn: 'Haitian Commercial Code',
    shortName: 'Code de commerce',
    url: 'https://archive.org/download/codedecommercedh05785hait/codedecommercedh05785hait_djvu.txt',
    sourceType: 'ia-djvu-txt',
    tier: 'amber',
    issuedDate: '1826-04-01',
    expectedArticles: 600,
    normType: 'code',
    mirror: 'Internet Archive (Public Domain)',
  },
  {
    id: 'code-travail-1961',
    title: 'Code du Travail (Duvalier, 1961)',
    titleEn: 'Labour Code (Duvalier 1961)',
    shortName: 'Code du Travail',
    url: 'https://www.haiti-now.org/wp-content/uploads/2017/05/Code-du-travail-Fran%C3%A7ois-Duvalier-1961.pdf',
    sourceType: 'pdf-text',
    tier: 'amber',
    issuedDate: '1961-09-12',
    expectedArticles: 500,
    normType: 'code',
    mirror: 'haiti-now.org (Public Mirror)',
  },
  {
    id: 'constitutions-historiques',
    title: "Les constitutions d'Haïti (1801-1885)",
    titleEn: 'Historical Constitutions of Haiti (1801-1885)',
    shortName: 'Constitutions historiques',
    url: 'https://archive.org/download/lesconstitutions00hait/lesconstitutions00hait_djvu.txt',
    sourceType: 'ia-djvu-txt',
    tier: 'amber',
    issuedDate: '1885-01-01',
    expectedArticles: 200,
    normType: 'constitution',
    mirror: 'Internet Archive (Public Domain) — historical reference only',
  },
];
