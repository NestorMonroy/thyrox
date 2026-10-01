#!/usr/bin/env bash
# Controles de anulación de bootstrapInfrastructure: retira cada mitad de
# juicio, corre la suite y restaura. Cada una tiene que tumbar sólo su caso.
set -uo pipefail
cd /home/user/thyrox/src/packages/infrastructure
SUBJECT=infrastructureBootstrap.ts
BACKUP="$(mktemp)"
cp "$SUBJECT" "$BACKUP"
annul() {
  local label="$1" from="$2" to="$3"
  cp "$BACKUP" "$SUBJECT"
  OLD="$from" NEW="$to" bash /home/user/thyrox/bin/replace_literal "$SUBJECT" >/dev/null || { echo "$label: no se aplicó"; return; }
  echo "== $label"
  bun test 2>&1 | grep -E '^\(fail\)|^ *[0-9]+ (pass|fail)$'
}
annul ownership-refusal "  if (outcome.drift.includes('ownership-collision')) {" "  if (false && outcome.drift.includes('ownership-collision')) {"
annul missing-secret "    if (missing.length > 0) {" "    if (false && missing.length > 0) {"
cp "$BACKUP" "$SUBJECT"
rm -f -- "${BACKUP:?}"
git -C /home/user/thyrox diff --stat -- "src/packages/infrastructure/$SUBJECT" | tail -1
echo "== restaurado"
bun test 2>&1 | grep -E '^ *[0-9]+ (pass|fail)$'
