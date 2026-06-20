# Contributing

Thanks for your interest in contributing to the SEO & GEO Skills Library! This guide covers how to add new skills, improve existing ones, and submit your changes.

## Requesting a Skill

If you have an idea for a skill but don't want to build it yourself, [open a Skill Request issue](https://github.com/aaron-he-zhu/seo-geo-claude-skills/issues/new?template=skill-request.yml).

## Adding a New Skill

### 1. Choose the correct category

| Category | Directory | Use when the skill... |
|----------|-----------|----------------------|
| Research | `research/` | Gathers market data before content creation (keywords, competitors, SERP, gaps) |
| Build | `build/` | Creates new content or markup (writing, meta tags, schema, GEO optimization) |
| Optimize | `optimize/` | Improves existing content or site health (audits, linking, refresh) |
| Monitor | `monitor/` | Tracks performance over time (rankings, backlinks, alerts, reports) |
| Cross-cutting | `cross-cutting/` | Spans multiple phases (quality frameworks, entity, memory) |

### 2. Create the skill directory

```bash
mkdir -p <category>/<skill-name>
```

The directory name must:
- Be 1-64 characters
- Use only lowercase letters, numbers, and hyphens
- Not start or end with a hyphen
- Not contain consecutive hyphens

### 3. Create `SKILL.md` with required frontmatter

Use this template:

```yaml
---
name: your-skill-name
version: "1.0.0"
description: 'Use when the user asks to "[trigger phrase 1]", "[trigger phrase 2]". [What it does in one sentence]. For [related task], see [other-skill].'
license: Apache-2.0
compatibility: "Claude Code ≥1.0, skills.sh marketplace, ClawHub marketplace, Vercel Labs skills ecosystem. No system packages required. Optional: MCP network access for SEO tool integrations."
# allowed-tools: WebFetch   # Uncomment if skill fetches live URLs
metadata:
  author: your-github-username
  version: "1.0.0"
  geo-relevance: "high|medium|low"
  tags:
    - seo
    - your-tags-here
  triggers:
    - "trigger phrase 1"
    - "trigger phrase 2"
---

# Your Skill Name

[Skill instructions here...]
```

**Critical**: The `name` field must match the directory name exactly.

### 4. Write effective instructions

A well-structured SKILL.md includes:

- **When to Use This Skill** — specific use cases
- **What This Skill Does** — numbered list of functions
- **How to Use** — invocation examples
- **Data Sources** — which `~~placeholders` it uses (see [CONNECTORS.md](./CONNECTORS.md))
- **Instructions** — step-by-step workflow with markdown templates for output
- **Validation Checkpoints** — input and output quality checks
- **Example** — concrete input/output example
- **Related Skills** — links to complementary skills

Keep the main SKILL.md under 350 lines. Put detailed references, templates, and rubrics in a `references/` subdirectory.

### 5. Validate the skill

```bash
# Run the built-in validator (from repo root)
./scripts/validate-skill.sh <category>/<skill-name>

# Example
./scripts/validate-skill.sh research/keyword-research
```

Fix any FAIL items before proceeding. Resolve WARN items where possible.

### 6. Update tracking files

After adding or updating a skill, **all 5 files must stay in sync**:

- [ ] `VERSIONS.md` — add or update the skill's version and date
- [ ] `.claude-plugin/plugin.json` — add the skill path to the `skills` array
- [ ] `marketplace.json` (repo root) — add the skill path to the `skills` array (must match plugin.json exactly)
- [ ] `README.md` — add the skill to the appropriate category table
- [ ] `CLAUDE.md` — add the skill to the phase/category table

> **Important**: `plugin.json` and `marketplace.json` must be updated together on every version bump. They must contain identical skills arrays. Keeping them out of sync breaks skills.sh marketplace discovery.

## Improving Existing Skills

- Keep changes focused on the specific improvement
- Bump the version in the skill's `metadata.version` field
- Update `VERSIONS.md` with the new version and date
- If adding reference documents, put them in the skill's `references/` subdirectory

## Quality Checklist

Before submitting a PR:

- [ ] `name` field matches directory name exactly (also satisfies ClawHub slug `^[a-z0-9][a-z0-9-]*$`)
- [ ] `description` includes trigger phrases AND scope boundaries (≤1024 chars, optimized for `npx skills find`)
- [ ] `compatibility` lists all three ecosystems: Claude Code, skills.sh, ClawHub marketplace, Vercel Labs skills ecosystem
- [ ] `metadata.openclaw` block present **only if** the skill has a hard `primaryEnv` dependency or required bins (omit entirely for tool-agnostic skills)
- [ ] SKILL.md body is under 350 lines (~4000 tokens); detailed rubrics/tables in `references/`
- [ ] Validator passes (all 3 specs checked): `./scripts/validate-skill.sh <category>/<skill-name>`
- [ ] Follows the [Agent Skills specification](https://agentskills.io/specification.md)
- [ ] Follows [ClawHub skill format](https://github.com/openclaw/clawhub/blob/main/docs/skill-format.md) (text-only files, openclaw metadata)
- [ ] Compatible with [Vercel Labs skills ecosystem](https://github.com/vercel-labs/skills/blob/main/skills/find-skills/SKILL.md) (description discoverable via `npx skills find`)
- [ ] Uses `~~placeholder` pattern for tool references (not specific tool names)
- [ ] `allowed-tools: WebFetch` added if skill fetches live URLs
- [ ] Includes validation checkpoints
- [ ] Includes at least one concrete example
- [ ] Related skills are linked correctly
- [ ] All 5 tracking files updated (VERSIONS.md, plugin.json, marketplace.json, README.md, CLAUDE.md)
- [ ] plugin.json and marketplace.json skills arrays are identical

## Submitting Your Contribution

### GitHub

1. Fork this repository
2. Create a feature branch: `feature/your-skill-name`
3. Make your changes following the guidelines above
4. Submit a pull request with a clear description

### ClawHub Marketplace

After your PR is merged, publish updated skills to ClawHub:

```bash
# Publish a single skill
cd <category>/<skill-name>
clawhub publish

# Or sync all skills from repo root
clawhub sync
```

See [ClawHub CLI docs](https://github.com/openclaw/clawhub) for authentication and setup.

## Code of Conduct

Be respectful, constructive, and focused on making the skills library better for everyone.
