#!/bin/sh
# PreToolUse hook for `git push`: main deploys production, so it only changes through a pull
# request, and nothing is force-pushed. Exit 2 blocks the command and tells Claude why.
input=$(cat)
cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // empty' 2>/dev/null) ||
  cmd=$(printf '%s' "$input" | /usr/bin/python3 -c 'import json,sys; print(json.load(sys.stdin)["tool_input"]["command"])' 2>/dev/null) ||
  cmd=$input
cwd=$(printf '%s' "$input" | jq -r '.cwd // empty' 2>/dev/null)
[ -n "$cwd" ] || cwd=${CLAUDE_PROJECT_DIR:-.}

case "$cmd" in
  *"git push"*) ;;
  *) exit 0 ;;
esac

deny() {
  echo "Blocked by .claude/hooks/guard-push.sh: $1 main deploys production. Push a branch and open a pull request instead." >&2
  exit 2
}

case "$cmd" in
  *" --force"*|*" -f"|*" -f "*|*" +"*) deny "force-pushes aren't allowed." ;;
esac
case "$cmd" in
  *" main"|*" main "*|*" main;"*|*":main"|*":main "*|*"/main"|*"/main "*) deny "this push targets main." ;;
esac

# A push without a branch name pushes the current branch.
branch=$(git -C "$cwd" rev-parse --abbrev-ref HEAD 2>/dev/null)
if [ "$branch" = "main" ]; then
  case "$cmd" in
    *"git push"|*"git push origin"|*"git push -u origin"|*"git push --set-upstream origin"|*"git push;"*|*"git push &&"*|*"git push origin &&"*) deny "you're on main." ;;
  esac
fi
exit 0
