/**
 * list_sources — Return provenance metadata for all data sources.
 */

import type Database from '@ansvar/mcp-sqlite';
import { readDbMetadata } from '../capabilities.js';
import { generateResponseMetadata, type ToolResponse } from '../utils/metadata.js';

export interface SourceInfo {
  name: string;
  authority: string;
  url: string;
  license: string;
  coverage: string;
  languages: string[];
  status?: string;
}

export interface ListSourcesResult {
  sources: SourceInfo[];
  database: {
    tier: string;
    schema_version: string;
    built_at?: string;
    document_count: number;
    provision_count: number;
  };
}

function safeCount(db: InstanceType<typeof Database>, sql: string): number {
  try {
    const row = db.prepare(sql).get() as { count: number } | undefined;
    return row ? Number(row.count) : 0;
  } catch {
    return 0;
  }
}

export async function listSources(
  db: InstanceType<typeof Database>,
): Promise<ToolResponse<ListSourcesResult>> {
  const meta = readDbMetadata(db);

  return {
    results: {
      sources: [
        {
          name: 'Direction des Affaires Juridiques et du Droit International (DFRN)',
          authority: 'Ministry of Justice & Public Security, Haiti',
          url: 'https://www.dfrn.gouv.ht',
          license: 'Government Open Data',
          coverage:
            'Approximately 24 key Haitian legal instruments including the Constitution, Civil Code, and Penal Code. ' +
            'Many laws exist only in print in Le Moniteur gazette.',
          languages: ['fr', 'ht'],
        },
        {
          name: 'Le Moniteur — Journal Officiel de la République d\'Haïti',
          authority: 'Secretariat of State for Communication, Haiti',
          url: 'https://www.lemoniteurhaiti.com',
          license: 'Government Open Data',
          coverage:
            'All officially promulgated legislation since 1845. ' +
            'Digital archives incomplete; many documents are scanned PDFs without full-text search.',
          languages: ['fr'],
          status: 'PENDING ingestion',
        },
      ],
      database: {
        tier: meta.tier,
        schema_version: meta.schema_version,
        built_at: meta.built_at,
        document_count: safeCount(db, 'SELECT COUNT(*) as count FROM legal_documents'),
        provision_count: safeCount(db, 'SELECT COUNT(*) as count FROM legal_provisions'),
      },
    },
    _meta: generateResponseMetadata(db),
  };
}
