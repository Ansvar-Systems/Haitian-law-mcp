/**
 * Response metadata utilities for Haitian Law MCP.
 */

import type Database from '@ansvar/mcp-sqlite';

export interface ResponseMetadata {
  data_source: string;
  jurisdiction: string;
  disclaimer: string;
  freshness?: string;
  note?: string;
  query_strategy?: string;
}

export interface ToolResponse<T> {
  results: T;
  _metadata: ResponseMetadata;
}

export function generateResponseMetadata(
  db: InstanceType<typeof Database>,
): ResponseMetadata {
  let freshness: string | undefined;
  try {
    const row = db.prepare(
      "SELECT value FROM db_metadata WHERE key = 'built_at'"
    ).get() as { value: string } | undefined;
    if (row) freshness = row.value;
  } catch {
    // Ignore
  }

  return {
    data_source: 'Haitian Law (lfrh.gouv.ht) — Le Fil de la Recherche en Haiti',
    jurisdiction: 'HT',
    disclaimer:
      'This data is sourced from Haitian legal publications under public access principles. ' +
      'The authoritative versions are in French. Haitian Creole translations may be available for some documents. ' +
      'Always verify with the official Journal Officiel de la Republique d\'Haiti.',
    freshness,
  };
}
