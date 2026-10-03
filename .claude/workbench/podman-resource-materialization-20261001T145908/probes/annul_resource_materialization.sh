#!/usr/bin/env bash
# Controles de anulación de ensureResource: retira cada mitad de juicio, corre
# la suite y restaura. Cada anulación tiene que tumbar exactamente sus casos.
set -uo pipefail
cd /home/user/thyrox/src/packages/podman-execution
SUBJECT=resourceMaterialization.ts
BACKUP="$(mktemp)"
cp "$SUBJECT" "$BACKUP"
annul() {
  local label="$1" from="$2" to="$3"
  cp "$BACKUP" "$SUBJECT"
  OLD="$from" NEW="$to" bash /home/user/thyrox/bin/replace_literal "$SUBJECT" >/dev/null || { echo "$label: no se aplicó"; return; }
  echo "== $label"
  bun test __tests__/resourceMaterialization.test.ts 2>&1 | grep -E '^\(fail\)|^ *[0-9]+ (pass|fail)$'
}
annul ownership "  if (kind === desired.owner.kind && id === desired.owner.id) return 'owned'" "  return 'owned'"
annul redaction "  let redacted = text" "  return text
  let redacted = text"
annul volume-drift "  return JSON.stringify(mounted) !== JSON.stringify(declared)" "  return false && JSON.stringify(mounted) !== JSON.stringify(declared)"
cp "$BACKUP" "$SUBJECT"
rm -f -- "${BACKUP:?}"
git -C /home/user/thyrox diff --stat -- "src/packages/podman-execution/$SUBJECT" | tail -1
echo "== restaurado"
bun test __tests__/resourceMaterialization.test.ts 2>&1 | grep -E '^ *[0-9]+ (pass|fail)$'
