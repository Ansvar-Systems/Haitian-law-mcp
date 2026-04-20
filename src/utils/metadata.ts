/**
 * Response metadata utilities for Haiti Law MCP.
 * Provides ResponseMeta, ToolResponse<T>, and generateResponseMetadata().
 */

import type Database from '@ansvar/mcp-sqlite';
import { readDbMetadata } from '../capabilities.js';
import type { CitationMetadata } from './citation.js';

export const RESEARCH_ONLY_DISCLAIMER =
  'Research tool only. Not legal advice. Verify all citations against official sources before relying on them.';

export interface ResponseMeta {
  disclaimer: string;
  data_age: string;
  copyright: string;
  note?: string;
  query_strategy?: string;
  [key: string]: unknown;
}

export interface ToolResponse<T> {
  results: T;
  _meta: ResponseMeta;
  _citation?: CitationMetadata;
  _error_type?: string;
}

export function generateResponseMetadata(db: InstanceType<typeof Database>): ResponseMeta {
  const meta = readDbMetadata(db);
  return {
    disclaimer: RESEARCH_ONLY_DISCLAIMER,
    data_age: meta.built_at ? meta.built_at.substring(0, 10) : 'unknown',
    copyright: "République d'Haïti — données officielles",
  };
}
