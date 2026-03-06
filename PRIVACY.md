# Privacy & Client Confidentiality / Confidentialité et Secret Professionnel

**IMPORTANT READING FOR LEGAL PROFESSIONALS**
**LECTURE IMPORTANTE POUR LES PROFESSIONNELS DU DROIT**

This document addresses privacy and confidentiality considerations when using this Tool, with particular attention to professional obligations under Haitian bar association rules.

---

## Executive Summary

**Key Risks:**
- Queries through Claude API flow via Anthropic cloud infrastructure
- Query content may reveal client matters and privileged information
- Haitian bar rules (Barreau de Port-au-Prince) require strict confidentiality (secret professionnel)

**Safe Use Options:**
1. **General Legal Research**: Use Tool for non-client-specific queries
2. **Local npm Package**: Install `@ansvar/haitian-law-mcp` locally — database queries stay on your machine
3. **Remote Endpoint**: Vercel Streamable HTTP endpoint — queries transit Vercel infrastructure
4. **On-Premise Deployment**: Self-host with local LLM for privileged matters

---

## Data Flows and Infrastructure

### MCP (Model Context Protocol) Architecture

This Tool uses the **Model Context Protocol (MCP)** to communicate with AI clients:

```
User Query -> MCP Client (Claude Desktop/Cursor/API) -> Anthropic Cloud -> MCP Server -> Database
```

### Deployment Options

#### 1. Local npm Package (Most Private)

```bash
npx @ansvar/haitian-law-mcp
```

- Database is local SQLite file on your machine
- No data transmitted to external servers (except to AI client for LLM processing)
- Full control over data at rest

#### 2. Remote Endpoint (Vercel)

```
Endpoint: https://haitian-law-mcp.vercel.app/mcp
```

- Queries transit Vercel infrastructure
- Tool responses return through the same path
- Subject to Vercel's privacy policy

### What Gets Transmitted

When you use this Tool through an AI client:

- **Query Text**: Your search queries and tool parameters
- **Tool Responses**: Statute text (texte de loi), provision content, search results
- **Metadata**: Timestamps, request identifiers

**What Does NOT Get Transmitted:**
- Files on your computer
- Your full conversation history (depends on AI client configuration)

---

## Professional Obligations (Haiti)

### Bar Association Rules (Barreau de Port-au-Prince)

Haitian lawyers (avocats et avocates) are bound by confidentiality rules under the rules of the Barreau de Port-au-Prince.

#### Secret Professionnel (Duty of Confidentiality)

- All client communications are privileged
- Client identity may be confidential in sensitive matters
- Case strategy and legal analysis are protected
- Information that could identify clients or matters must be safeguarded
- Breach of confidentiality may result in disciplinary proceedings (poursuites disciplinaires)

### Haitian Data Protection Framework

Haiti does not have a comprehensive data protection law equivalent to GDPR. However:

- Constitutional provisions (Constitution of 1987) protect personal privacy
- Professional confidentiality rules under Barreau regulations impose separate obligations
- When transmitting client-related queries to cloud services, consider your professional ethics obligations independently

---

## Risk Assessment by Use Case

### LOW RISK: General Legal Research

**Safe to use through any deployment:**

```
Example: "What does the Code Civil haïtien say about property rights?"
```

- No client identity involved
- No case-specific facts
- Publicly available legal information

### MEDIUM RISK: Anonymized Queries

**Use with caution:**

```
Example: "What are the penalties for fraud under the Code Pénal haïtien?"
```

- Query pattern may reveal you are working on a specific matter
- Anthropic/Vercel logs may link queries to your API key

### HIGH RISK: Client-Specific Queries

**DO NOT USE through cloud AI services:**

- Remove ALL identifying details
- Use the local npm package with a self-hosted LLM
- Or consult the Barreau de Port-au-Prince official resources directly

---

## Data Collection by This Tool

### What This Tool Collects

**Nothing.** This Tool:

- Does NOT log queries
- Does NOT store user data
- Does NOT track usage
- Does NOT use analytics
- Does NOT set cookies

The database is read-only. No user data is written to disk.

### What Third Parties May Collect

- **Anthropic** (if using Claude): Subject to [Anthropic Privacy Policy](https://www.anthropic.com/legal/privacy)
- **Vercel** (if using remote endpoint): Subject to [Vercel Privacy Policy](https://vercel.com/legal/privacy-policy)

---

## Recommendations

### For Solo Practitioners / Small Firms (Avocats Indépendants / Petits Cabinets)

1. Use local npm package for maximum privacy
2. General research: Cloud AI is acceptable for non-client queries
3. Client matters: Use official Haitian legal sources (Le Moniteur) and Barreau resources directly

### For Large Firms / Corporate Legal (Grands Cabinets / Départements Juridiques)

1. Evaluate data processing implications before integrating cloud AI tools
2. Consider on-premise deployment with self-hosted LLM
3. Train staff on safe vs. unsafe query patterns

### For Government / Public Sector (Secteur Public)

1. Use self-hosted deployment, no external APIs
2. Air-gapped option available for classified matters

---

## Questions and Support

- **Privacy Questions**: Open issue on [GitHub](https://github.com/Ansvar-Systems/Haitian-law-mcp/issues)
- **Anthropic Privacy**: Contact privacy@anthropic.com
- **Barreau Guidance**: Consult the Barreau de Port-au-Prince for professional ethics guidance on AI tool use

---

**Last Updated**: 2026-03-06
**Tool Version**: 1.0.0
