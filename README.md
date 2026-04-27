# Haitian Law MCP Server

**L'alternative à dfrn.gouv.ht pour l'ère de l'IA.**

[![npm version](https://badge.fury.io/js/@ansvar%2Fhaitian-law-mcp.svg)](https://www.npmjs.com/package/@ansvar/haitian-law-mcp)
[![MCP Registry](https://img.shields.io/badge/MCP-Registry-blue)](https://registry.modelcontextprotocol.io)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![GitHub stars](https://img.shields.io/github/stars/Ansvar-Systems/Haitian-law-mcp?style=social)](https://github.com/Ansvar-Systems/Haitian-law-mcp)
[![CI](https://github.com/Ansvar-Systems/Haitian-law-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/Ansvar-Systems/Haitian-law-mcp/actions/workflows/ci.yml)
[![Status](https://img.shields.io/badge/status-early--access-orange)]()

Connect to Haitian law research infrastructure -- structured, AI-readable access to Haitian statutes -- directly from Claude, Cursor, or any MCP-compatible client.

If you're building legal tech, compliance tools, or doing Haitian legal research, this is the foundation for your verified reference database.

Built by [Ansvar Systems](https://ansvar.eu) -- Stockholm, Sweden

---

## Why This Exists

Haitian legal research is among the most challenging in the Caribbean. The Direction de la Formation et de la Recherche Normative (DFRN) at the Ministry of Justice maintains the official legal database at dfrn.gouv.ht, but access is intermittent, full-text search is limited, and many texts are only available as scanned PDFs. Whether you're:

- A **lawyer** validating citations before Haitian courts or in cross-border matters involving Haitian law
- A **compliance officer** assessing obligations under Haitian trade, labor, or commercial regulations
- A **legal tech developer** building tools for researchers or practitioners working with Haitian and Caribbean law
- A **researcher** studying Haitian constitutional, civil, or criminal law -- a mixed French civil law and customary tradition

...access to machine-readable, searchable Haitian law has been a persistent gap. This MCP server is the beginning of closing it.

This MCP server makes Haitian law **searchable, cross-referenceable, and AI-readable**.

---

## Quick Start

### Use via the Ansvar Gateway (B2B, OAuth)

> The public MCP server (`mcp.ansvar.eu`) was decommissioned 2026-04-23. External access is now via the Ansvar MCP Gateway (`gateway.ansvar.eu`, OAuth 2.1) for paid tiers, or via npm for local stdio.

| Client | How to Connect |
|--------|---------------|
| **Claude.ai** | Settings > Connectors > Add Integration > `https://gateway.ansvar.eu` |
| **Claude Code** | `claude mcp add ansvar-gateway --transport http https://gateway.ansvar.eu` |
| **GitHub Copilot** | Add gateway URL to VS Code `settings.json` |

### Use Locally (npm)

```bash
npx @ansvar/haitian-law-mcp
```

**Claude Desktop** -- add to `claude_desktop_config.json`:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "haitian-law": {
      "command": "npx",
      "args": ["-y", "@ansvar/haitian-law-mcp"]
    }
  }
}
```

**Cursor / VS Code:**

```json
{
  "mcp.servers": {
    "haitian-law": {
      "command": "npx",
      "args": ["-y", "@ansvar/haitian-law-mcp"]
    }
  }
}
```

---

## Example Queries

Once connected, just ask naturally (French examples):

- *"Quelles sont les dispositions du Code Civil haïtien sur les contrats et obligations?"*
- *"Que dit le Code Pénal haïtien sur les infractions économiques?"*
- *"Rechercher des dispositions sur le droit du travail dans la législation haïtienne"*
- *"Quelles sont les protections constitutionnelles prévues par la Constitution de 1987?"*
- *"Quels sont les droits et obligations des parties dans un contrat de bail en Haïti?"*
- *"Valider la citation 'Décret du 12 octobre 2005, Code du Travail haïtien'"*
- *"Quels traités internationaux Haïti a-t-il ratifiés concernant les droits de l'homme?"*
- *"Construire un argumentaire juridique sur la responsabilité civile extracontractuelle en Haïti"*

Haitian Creole (Kreyòl ayisyen) examples:

- *"Kisa Konstitisyon 1987 la di sou dwa fondamantal sitwayen ayisyen yo?"*
- *"Ki pwoteksyon travay ki nan Kòd Travay Ayiti a?"*

---

## Coverage (open-mirror partial corpus)

| Category | Count | Details |
|----------|-------|---------|
| **Statutes ingested** | 11 | 1987 Constitution (EN + FR), 6 historical codes, Code du Travail 1961, anti-corruption décret 2004, constitutional amendment journal 2012, historical constitutions compendium |
| **Provisions** | ~3,800 | After dedup; full-text search via SQLite FTS5 |
| **Definitions** | 12 | Auto-extracted from French civil-law definition patterns |
| **Database size** | ~7 MB | data/database.db |
| **Confidence tier (overall)** | **Amber** | Bulk of corpus is OCR-derived from historical print scans |

### Source posture (mandatory disclosure)

> Haiti's sovereign legal portals (`dfrn.gouv.ht`, `justice.gouv.ht`, `parliament.ht`, `senat.gouv.ht`, `bnht.gouv.ht`, `moniteur.gouv.ht`) are **DNS-dead as of 2026-04-27** — gone, not geo-restricted. This MCP ships from open historical mirrors only:
>
> - **WIPO Lex** — IP statutes (patents 1922, trademarks 1954/1960, copyright 2005). *Currently registered as `inaccessible` — WIPO Lex was unreachable from the 2026-04-27 build host; will retry next cycle.*
> - **Internet Archive** — historical codes (Civil, Pénal, Procédure civile, Instruction criminelle, Commerce, Constitutions historiques 1801-1885). Pre-OCR'd DJVU TXT.
> - **OAS juridico** — 1987 Constitution amendment journal (2012), Décret du 8 septembre 2004 sur la prévention et la répression de la corruption.
> - **Constitute Project + PDBA Georgetown mirror** — 1987 Constitution (English structured + French canonical text).
> - **haiti-now.org** — Code du Travail (Duvalier, 1961).
>
> **NOT covered:** post-2010 statutes (no public mirror found), the current Code de procédure civile if revised after the 1963 IA holding, gazette (Le Moniteur) issues newer than the OAS amendment archive, official jurisprudence, sectoral regulators (BRH banking, ULCC current acts beyond the 2004 décret), departmental and local legislation, and any Creole-language official text (all confirmed source material is French).
>
> **OCR disclosure:** The Code Civil, Code Pénal, Code de procédure civile, Code d'instruction criminelle, Code de commerce, and Code du Travail are derived from OCR'd scans of historical print editions. The MCP marks each provision `confidence_tier: amber` and surfaces it in the citation envelope. **OCR character-error rates have not been independently validated; treat citations as starting points for primary-source confirmation, not as authoritative renderings.** The 1987 Constitution (via Constitute Project + PDBA mirror) and the 2004 anti-corruption décret ship `confidence_tier: blue` because the underlying text is text-layered.

**Verified data only** — all ingested content comes from the open historical mirrors named above. Zero LLM-generated content. Per-provision provenance is exposed via `metadata.confidence_tier` and `metadata.source_format`.

---

## See It In Action

### Why This Works

**Verbatim Source Text (No LLM Processing):**
- All statute text is ingested from [dfrn.gouv.ht](https://dfrn.gouv.ht) and official Haitian government sources
- Provisions are returned **unchanged** from SQLite FTS5 database rows
- Zero LLM summarization or paraphrasing -- the database contains regulation text, not AI interpretations

**Smart Context Management:**
- Search returns ranked provisions with BM25 scoring (safe for context)
- Provision retrieval gives exact text by statute identifier + chapter/article
- Cross-references help navigate without loading everything at once

**Technical Architecture:**
```
dfrn.gouv.ht --> Parse --> SQLite --> FTS5 snippet() --> MCP response
                   ^                        ^
            Provision parser         Verbatim database query
```

### Traditional Research vs. This MCP

| Traditional Approach | This MCP Server |
|---------------------|-----------------|
| Navigate dfrn.gouv.ht (intermittent access) | Search by plain French: *"responsabilité civile contrat"* |
| Download scanned PDFs and OCR manually | Get the exact provision with context |
| Manual cross-referencing between codes | `build_legal_stance` aggregates across sources |
| "Ce texte est-il toujours en vigueur?" → vérifier manuellement | `check_currency` tool → réponse en secondes |
| Find international basis → dig through OAS/IACHR | `get_eu_basis` → linked international instruments |
| No API, no integration | MCP protocol → AI-native |

**Traditional:** Navigate DFRN portal → Find PDF → OCR if scanned → Cross-reference with Code Civil → Repeat

**This MCP:** *"Quelles sont les conditions de validité d'un contrat selon le Code Civil haïtien?"* → Done.

---

## Available Tools (13)

### Core Legal Research Tools (8)

| Tool | Description |
|------|-------------|
| `search_legislation` | FTS5 full-text search across indexed Haitian provisions with BM25 ranking |
| `get_provision` | Retrieve specific provision by statute identifier + article/section number |
| `check_currency` | Check if a statute is in force, amended, or repealed |
| `validate_citation` | Validate citation against database -- zero-hallucination check |
| `build_legal_stance` | Aggregate citations from multiple statutes for a legal topic |
| `format_citation` | Format citations per Haitian legal conventions |
| `list_sources` | List all available statutes with metadata and coverage scope |
| `about` | Server info, capabilities, dataset statistics, and coverage summary |

### International Law Integration Tools (5)

| Tool | Description |
|------|-------------|
| `get_eu_basis` | Get international instruments (OAS, IACHR, ILO, UN treaties) that a Haitian statute aligns with |
| `get_haitian_implementations` | Find Haitian laws aligning with a specific international instrument |
| `search_eu_implementations` | Search international documents with Haitian implementation counts |
| `get_provision_eu_basis` | Get international law references for a specific provision |
| `validate_eu_compliance` | Check alignment status of Haitian statutes against international standards |

---

## International Law Alignment

Haiti is not an EU member state, but Haitian law intersects with several international frameworks -- and Haiti's legal tradition is deeply shaped by French civil law:

- **French civil law tradition** -- Haiti's legal system derives substantially from the Napoleonic Code; the Code Civil haïtien (1826) and many subsequent codes follow French models, making French legal scholarship a key comparative reference
- **IACHR (Inter-American Court of Human Rights)** -- Haiti is subject to the American Convention on Human Rights; IACHR jurisprudence is relevant to constitutional and human rights matters
- **ILO Conventions** -- Haiti has ratified core ILO conventions; the Code du Travail reflects labor rights obligations
- **OAS frameworks** -- Haiti participates in OAS conventions on anti-corruption and regional cooperation
- **CARICOM** -- Haiti is a CARICOM member; trade and regional integration frameworks apply
- **UN Frameworks** -- Haiti is a party to core UN human rights treaties, the UN Convention Against Corruption, and humanitarian law conventions

The international alignment tools allow you to explore these relationships -- checking which Haitian provisions correspond to treaty obligations or French legal tradition, and vice versa.

> **Note:** International cross-references reflect alignment and treaty relationships. Haitian law has its own distinct development within the civil law tradition, and the tools help identify where Haitian and international frameworks address similar domains.

---

## Data Sources & Freshness

All content is sourced from open historical mirrors, since Haiti's sovereign legal portals are DNS-dead (verified 2026-04-27):

- **Constitute Project** — 1987 Constitution (English structured rendering, CC-BY-NC-SA)
- **PDBA Georgetown** — 1987 Constitution (French canonical text, public mirror)
- **OAS juridico** — Constitutional amendment journal 2012, anti-corruption décret 2004
- **WIPO Lex** — IP statutes package (currently inaccessible from build host)
- **Internet Archive** — historical codes via pre-OCR'd DJVU TXT (Code Civil, Pénal, Procédure civile, Instruction criminelle, Commerce, Constitutions historiques)
- **haiti-now.org** — Code du Travail (Duvalier 1961, public mirror)

See `sources.yml` for full per-source license, scope, and limitation entries.

### Data Provenance

| Field | Value |
|-------|-------|
| **Posture** | Open-mirror partial corpus; sovereign portals DNS-dead 2026-04-27 |
| **Retrieval method** | Direct HTTP fetch of HTML / text-layered PDF / IA pre-OCR'd DJVU TXT |
| **Languages** | French (all confirmed source material is French; English available for the Constitute rendering of the 1987 Constitution) |
| **Coverage** | 11 instruments, ~3,800 provisions (Tier D — partial historical corpus) |
| **Database size** | ~7 MB |
| **Confidence tier** | Amber (MCP-wide) — bulk OCR-derived; per-provision `metadata.confidence_tier` distinguishes blue/amber |

**Verified data only** — all ingested content comes from the open mirrors named above. Zero LLM-generated content.

---

## Security

This project uses multiple layers of automated security scanning:

| Scanner | What It Does | Schedule |
|---------|-------------|----------|
| **CodeQL** | Static analysis for security vulnerabilities | Weekly + PRs |
| **Semgrep** | SAST scanning (OWASP top 10, secrets, TypeScript) | Every push |
| **Gitleaks** | Secret detection across git history | Every push |
| **Trivy** | CVE scanning on filesystem and npm dependencies | Daily |
| **Docker Security** | Container image scanning + SBOM generation | Daily |
| **Socket.dev** | Supply chain attack detection | PRs |
| **OSSF Scorecard** | OpenSSF best practices scoring | Weekly |
| **Dependabot** | Automated dependency updates | Weekly |

See [SECURITY.md](SECURITY.md) for the full policy and vulnerability reporting.

---

## Important Disclaimers

### Legal Advice

> **THIS TOOL IS NOT LEGAL ADVICE**
>
> Statute text is sourced from official Haitian government sources (dfrn.gouv.ht). However:
> - This is a **research tool**, not a substitute for professional legal counsel
> - **Coverage is limited** -- this is an early access build; not all Haitian statutes are yet indexed
> - **Court case coverage is not included** -- do not rely solely on this for case law research
> - **Verify critical citations** against Le Moniteur or primary government sources for formal proceedings
> - **International cross-references** reflect alignment relationships, not formal transposition
> - **Departmental and local legislation is not included** -- this covers national statutes only
> - **Some texts exist only as PDF scans** -- OCR quality may vary for older statutes

**Before using professionally, read:** [DISCLAIMER.md](DISCLAIMER.md) | [SECURITY.md](SECURITY.md)

### Client Confidentiality

Queries go through the Claude API. For privileged or confidential matters, use on-premise deployment.

### Professional Responsibility

Members of the **Ordre des Avocats d'Haïti** should ensure any AI-assisted research complies with professional ethics rules on competence and verification of sources before relying on output in client matters or formal proceedings.

---

## Development

### Setup

```bash
git clone https://github.com/Ansvar-Systems/Haitian-law-mcp
cd Haitian-law-mcp
npm install
npm run build
npm test
```

### Running Locally

```bash
npm run dev                                       # Start MCP server
npx @anthropic/mcp-inspector node dist/index.js   # Test with MCP Inspector
```

### Data Management

```bash
npm run ingest           # Ingest statutes from dfrn.gouv.ht
npm run build:db         # Rebuild SQLite database
npm run drift:detect     # Run drift detection against anchors
npm run check-updates    # Check for source updates
npm run census           # Generate coverage census
```

### Performance

- **Search Speed:** <100ms for most FTS5 queries
- **Database Size:** Grows with ingestion
- **Source Challenge:** dfrn.gouv.ht access can be intermittent; ingestion uses retry logic

---

## Related Projects: Complete Compliance Suite

This server is part of **Ansvar's Compliance Suite** -- MCP servers that work together for end-to-end compliance coverage:

### [@ansvar/eu-regulations-mcp](https://github.com/Ansvar-Systems/EU_compliance_MCP)
**Query 49 EU regulations directly from Claude** -- GDPR, AI Act, DORA, NIS2, MiFID II, eIDAS, and more. Full regulatory text with article-level search. `npx @ansvar/eu-regulations-mcp`

### [@ansvar/guyanese-law-mcp](https://github.com/Ansvar-Systems/Guyanese-law-mcp)
**Query Guyanese law directly from Claude** -- Caribbean legal research companion. `npx @ansvar/guyanese-law-mcp`

### [@ansvar/us-regulations-mcp](https://github.com/Ansvar-Systems/US_Compliance_MCP)
**Query US federal and state compliance laws** -- HIPAA, CCPA, SOX, GLBA, FERPA, and more. `npx @ansvar/us-regulations-mcp`

### [@ansvar/security-controls-mcp](https://github.com/Ansvar-Systems/security-controls-mcp)
**Query 261 security frameworks** -- ISO 27001, NIST CSF, SOC 2, CIS Controls, SCF, and more. `npx @ansvar/security-controls-mcp`

**70+ national law MCPs** covering Brazil, Canada, Colombia, Cuba, Denmark, France, Germany, Guyana, Honduras, Ireland, Netherlands, Nicaragua, Norway, Panama, El Salvador, Sweden, UK, Venezuela, and more.

---

## Contributing

Contributions welcome -- especially for this repository where the ingestion challenge is real. See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

Priority areas:
- Statute ingestion from dfrn.gouv.ht (access and OCR pipeline)
- Provision-level parsing from PDF sources
- Court case law coverage (Cour de Cassation decisions)
- Le Moniteur amendment tracking
- Haitian Creole (Kreyòl) text versions where available

---

## Roadmap

- [x] MCP server infrastructure and tool framework
- [x] International law alignment tools
- [x] Vercel Streamable HTTP deployment
- [x] npm package publication
- [ ] Core statute ingestion from dfrn.gouv.ht
- [ ] PDF OCR pipeline for older texts
- [ ] Court case law coverage
- [ ] Le Moniteur automated tracking
- [ ] Haitian Creole text versions
- [ ] Historical statute versions (1804-present)

---

## Citation

If you use this MCP server in academic research:

```bibtex
@software{haitian_law_mcp_2026,
  author = {Ansvar Systems AB},
  title = {Haitian Law MCP Server: AI-Powered Legal Research Tool},
  year = {2026},
  url = {https://github.com/Ansvar-Systems/Haitian-law-mcp},
  note = {Early access: Haitian law research infrastructure with international alignment tools}
}
```

---

## License

Apache License 2.0. See [LICENSE](./LICENSE) for details.

### Data Licenses

- **Statutes & Legislation:** Haitian Government -- DFRN/Le Moniteur (public domain via official sources)
- **International Metadata:** OAS/ILO/UN public domain

---

## About Ansvar Systems

We build AI-accelerated compliance and legal research tools for the global market. Haiti's legal system -- rooted in French civil law since 1804 -- deserves the same accessible AI tooling as any other jurisdiction. This MCP server is the starting point for that coverage.

**[ansvar.eu](https://ansvar.eu)** -- Stockholm, Sweden

---

<p align="center">
  <sub>Built with care in Stockholm, Sweden</sub>
</p>
