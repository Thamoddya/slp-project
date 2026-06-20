#!/usr/bin/env bash
# validate-skill.sh — Validate a SKILL.md against the ClawHub, Agent Skills, and Vercel Labs skill specs
# Usage: ./scripts/validate-skill.sh <path-to-skill-directory>
# Example: ./scripts/validate-skill.sh research/keyword-research

SKILL_DIR="${1:-.}"
SKILL_FILE="$SKILL_DIR/SKILL.md"

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

PASS=0
FAIL=0
WARN=0

pass() { echo -e "${GREEN}  ✅ PASS${NC}: $1"; PASS=$((PASS + 1)); }
fail() { echo -e "${RED}  ❌ FAIL${NC}: $1"; FAIL=$((FAIL + 1)); }
warn() { echo -e "${YELLOW}  ⚠️  WARN${NC}: $1"; WARN=$((WARN + 1)); }

echo ""
echo "Validating: $SKILL_FILE"
echo "Specs: ClawHub · Agent Skills · Vercel Labs skills ecosystem"
echo "=============================================="

# Check file exists
if [ ! -f "$SKILL_FILE" ]; then
    echo -e "${RED}ERROR${NC}: SKILL.md not found at $SKILL_FILE"
    exit 1
fi

# Extract frontmatter (between first --- and second ---)
FRONTMATTER=$(awk '/^---/{if(++n==2)exit} n' "$SKILL_FILE")

# --- Required field: name ---
# Agent Skills: lowercase, hyphens, ≤64 chars, matches dir name
# ClawHub: slug pattern ^[a-z0-9][a-z0-9-]*$ (slightly more permissive — allows leading digit)
# Vercel Labs: same as Agent Skills
NAME=$(echo "$FRONTMATTER" | grep -E '^name:' | sed 's/name: *//' | tr -d '"'"'" | tr -d '\r')
if [ -z "$NAME" ]; then
    fail "Missing required field: name"
else
    # Agent Skills + Vercel Labs: must start with letter
    if echo "$NAME" | grep -qE '^[a-z][a-z0-9-]*[a-z0-9]$' || echo "$NAME" | grep -qE '^[a-z]$'; then
        if echo "$NAME" | grep -q '\-\-'; then
            fail "name contains consecutive hyphens: $NAME"
        elif [ ${#NAME} -gt 64 ]; then
            fail "name exceeds 64 chars: ${#NAME} chars"
        else
            pass "name is valid (Agent Skills + Vercel Labs): $NAME"
        fi
    else
        fail "name must be lowercase letters, numbers, hyphens only (got: $NAME)"
    fi

    # ClawHub slug check: ^[a-z0-9][a-z0-9-]*$ (no consecutive hyphens implied)
    if echo "$NAME" | grep -qE '^[a-z0-9][a-z0-9-]*$' && ! echo "$NAME" | grep -q '\-\-'; then
        pass "name passes ClawHub slug pattern"
    else
        fail "name fails ClawHub slug pattern ^[a-z0-9][a-z0-9-]*$: $NAME"
    fi

    # Check name matches directory
    DIR_NAME=$(basename "$SKILL_DIR")
    if [ "$NAME" != "$DIR_NAME" ]; then
        fail "name '$NAME' does not match directory '$DIR_NAME'"
    else
        pass "name matches directory name"
    fi
fi

# --- Required field: description ---
DESCRIPTION=$(echo "$FRONTMATTER" | grep -E '^description:' | sed "s/description: *//")
if [ -z "$DESCRIPTION" ]; then
    fail "Missing required field: description"
else
    DESC_LEN=${#DESCRIPTION}
    if [ "$DESC_LEN" -gt 1024 ]; then
        fail "description exceeds 1024 chars: $DESC_LEN chars"
    elif [ "$DESC_LEN" -lt 10 ]; then
        fail "description too short: $DESC_LEN chars"
    else
        pass "description is valid ($DESC_LEN chars)"
    fi

    # Check for trigger phrases pattern
    if echo "$DESCRIPTION" | grep -qiE '"[^"]+"|Use when'; then
        pass "description contains trigger phrases"
    else
        warn "description should include trigger phrases (e.g., 'Use when the user asks to \"...\"')"
    fi
fi

# --- Optional but recommended: license ---
if echo "$FRONTMATTER" | grep -qE '^license:'; then
    LICENSE=$(echo "$FRONTMATTER" | grep -E '^license:' | sed 's/license: *//')
    pass "license present: $LICENSE"
else
    warn "Missing recommended field: license"
fi

# --- Optional but recommended: compatibility ---
if echo "$FRONTMATTER" | grep -qE '^compatibility:'; then
    pass "compatibility field present"
else
    warn "Missing recommended field: compatibility"
fi

# --- Optional but recommended: metadata ---
if echo "$FRONTMATTER" | grep -qE '^metadata:'; then
    pass "metadata block present"
    if echo "$FRONTMATTER" | grep -qE '  author:'; then
        pass "metadata.author present"
    else
        warn "metadata.author not found"
    fi
    if echo "$FRONTMATTER" | grep -qE '  version:'; then
        pass "metadata.version present"
    else
        warn "metadata.version not found"
    fi
    # ClawHub: metadata.openclaw (or metadata.clawdbot / metadata.clawdis)
    # Tool-agnostic skills (no hard dependencies) should omit the openclaw block entirely.
    # If present, check for inconsistencies (primaryEnv declared but requires.env empty).
    if echo "$FRONTMATTER" | grep -qE '  openclaw:|  clawdbot:|  clawdis:'; then
        # Check for primaryEnv + empty requires.env inconsistency
        HAS_PRIMARY_ENV=$(echo "$FRONTMATTER" | grep -qE '    primaryEnv:' && echo "yes" || echo "no")
        HAS_EMPTY_REQ_ENV=$(echo "$FRONTMATTER" | grep -qE '      env: \[\]' && echo "yes" || echo "no")
        if [ "$HAS_PRIMARY_ENV" = "yes" ] && [ "$HAS_EMPTY_REQ_ENV" = "yes" ]; then
            fail "ClawHub: metadata.openclaw declares primaryEnv but requires.env is empty — inconsistent (either add the key to requires.env or remove the openclaw block for tool-agnostic skills)"
        else
            pass "ClawHub: metadata.openclaw runtime declaration present and consistent"
        fi
    else
        pass "ClawHub: no metadata.openclaw block (tool-agnostic skill — OK per AGENTS.md)"
    fi
else
    warn "Missing recommended field: metadata"
fi

# --- Body length check ---
BODY_LINES=$(awk 'BEGIN{n=0} /^---/{n++; next} n>=2{print}' "$SKILL_FILE" | wc -l | tr -d ' ')
if [ "$BODY_LINES" -gt 400 ]; then
    warn "Skill body is $BODY_LINES lines (recommended: <350 lines / ~4000 tokens). Move reference data to references/ subdirectory."
else
    pass "Skill body length OK: $BODY_LINES lines"
fi

# --- Check for references/ directory if body is large ---
if [ "$BODY_LINES" -gt 250 ] && [ ! -d "$SKILL_DIR/references" ]; then
    warn "Skill body is $BODY_LINES lines but no references/ directory found. Consider extracting detailed tables/rubrics."
fi

# --- ClawHub: file type check (text only, no binaries) ---
NON_TEXT=$(find "$SKILL_DIR" -type f ! -name "*.md" ! -name "*.txt" ! -name "*.json" ! -name "*.yaml" ! -name "*.yml" ! -name "*.sh" ! -name "*.csv" ! -name ".clawhubignore" ! -name ".gitignore" 2>/dev/null | grep -v '/\.' | head -5)
if [ -n "$NON_TEXT" ]; then
    warn "ClawHub: non-text files found (ClawHub only supports text-based files): $NON_TEXT"
else
    pass "ClawHub: all files are text-based"
fi

# --- Vercel Labs: description optimized for 'npx skills find' discovery ---
if echo "$FRONTMATTER" | grep -qE '^description:'; then
    VERCEL_DESC=$(echo "$FRONTMATTER" | grep -E '^description:' | sed "s/description: *//")
    VERCEL_LEN=${#VERCEL_DESC}
    if [ "$VERCEL_LEN" -gt 50 ]; then
        pass "Vercel Labs: description suitable for 'npx skills find' discovery ($VERCEL_LEN chars)"
    else
        warn "Vercel Labs: description may be too short for effective 'npx skills find' discovery"
    fi
fi

# --- Summary ---
echo ""
echo "=============================================="
echo -e "Results: ${GREEN}$PASS passed${NC}, ${YELLOW}$WARN warnings${NC}, ${RED}$FAIL failed${NC}"

if [ "$FAIL" -gt 0 ]; then
    echo -e "${RED}Validation FAILED — fix errors above before publishing${NC}"
    exit 1
elif [ "$WARN" -gt 0 ]; then
    echo -e "${YELLOW}Validation PASSED with warnings — review recommendations above${NC}"
    exit 0
else
    echo -e "${GREEN}Validation PASSED — skill is spec-compliant${NC}"
    exit 0
fi
