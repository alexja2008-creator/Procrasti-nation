#!/bin/sh
# PreToolUse hook for `git commit`: runs @pn/core's tests (about a second) before Claude commits.
# CI runs everything else on the pull request.
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
if ! command -v node >/dev/null 2>&1 && [ -d "$HOME/.nvm/versions/node" ]; then
  PATH="$HOME/.nvm/versions/node/$(ls "$HOME/.nvm/versions/node" | tail -1)/bin:$PATH"
fi
if ! command -v node >/dev/null 2>&1; then
  echo "check-before-commit: node not found, so @pn/core's tests were skipped." >&2
  exit 0
fi
if ! out=$(node --test packages/core/test/*.test.ts 2>&1); then
  printf '%s\n' "$out" | tail -40 >&2
  echo "Blocked by .claude/hooks/check-before-commit.sh: @pn/core's tests fail. Fix them before committing." >&2
  exit 2
fi
exit 0
