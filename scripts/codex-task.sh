#!/usr/bin/env bash
# Codex task runner — gpt-5.5 with high reasoning effort, workspace-write sandbox.
# Reads prompt from stdin, saves last message to .planning/codex-runs/<name>.md.
#
# Usage:
#   scripts/codex-task.sh <output-name> <<'EOF'
#   GOAL: ...
#   VERIFY BY: ...
#   CONSTRAINTS: ...
#   INPUTS: ...
#   OUTPUT: ...
#   IF BLOCKED: ...
#   EOF
#
# The output-name becomes the basename of the captured last-message file.

set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "usage: $0 <output-name>" >&2
  echo "  reads prompt from stdin, writes last message to .planning/codex-runs/<output-name>.md" >&2
  exit 1
fi

NAME="$1"
OUT_DIR=".planning/codex-runs"
mkdir -p "$OUT_DIR"
LAST="$OUT_DIR/${NAME}.md"

# `-` reads prompt from stdin.
# `-c model_reasoning_effort=high` = think-high
# `--sandbox workspace-write` lets codex write files in cwd
# `-o` captures the final assistant message to a file (for our review)
codex exec \
  -m gpt-5.5 \
  -c model_reasoning_effort=high \
  --sandbox workspace-write \
  --skip-git-repo-check \
  -o "$LAST" \
  -

echo ""
echo "→ Last message saved to: $LAST"
