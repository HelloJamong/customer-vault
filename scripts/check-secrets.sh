#!/usr/bin/env bash
set -Eeuo pipefail

# 테스트 코드에 Base32 OTP 시크릿이나 키/비밀번호 상수값을 직접 추가하지 않도록
# CI와 로컬에서 실행하는 저장소 정적 검사입니다. 테스트 벡터는 런타임 조합을 사용합니다.
status=0
repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

base32_matches=$(git grep -nIE "['\"][A-Z2-7]{16,}['\"]" -- \
  'backend/test' 'frontend' 'scripts' 2>/dev/null || true)
base32_matches=$(printf '%s\n' "$base32_matches" | grep -vF 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567' || true)
if [ -n "$base32_matches" ]; then
  printf '%s\n' 'Potential hard-coded Base32 secret found:' >&2
  printf '%s\n' "$base32_matches" >&2
  status=1
fi

assignment_pattern="(PASSWORD|SECRET|TOKEN|API[_-]?KEY|PRIVATE[_-]?KEY)[[:space:]]*[:=][[:space:]]*[\"'][^$\"']{8,}[\"']"
assignment_matches=$(git grep -nIE "$assignment_pattern" -- \
  ':!*.lock' ':!*.map' ':!CHANGELOG.md' 2>/dev/null || true)
if [ -n "$assignment_matches" ]; then
  printf '%s\n' 'Potential hard-coded credential assignment found:' >&2
  printf '%s\n' "$assignment_matches" >&2
  status=1
fi

if [ "$status" -ne 0 ]; then
  printf '%s\n' 'Secret scan failed. Use generated test data or environment-provided secrets.' >&2
fi

exit "$status"
