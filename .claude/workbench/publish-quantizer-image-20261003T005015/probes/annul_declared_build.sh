#!/usr/bin/env bash
# Anulación de la frontera de construcción declarada: cada mutante retira una
# mitad de juicio sobre una copia de seguridad del archivo, corre las dos
# suites y restaura. Uso: annul_declared_build.sh <worktree> <directorio-de-salida>
set -uo pipefail
worktree="${1:?worktree}"; out="${2:?salida}"
cd "$worktree" || exit 2
catalog=src/packages/image-registry/declaredImages.ts
command=src/packages/image-registry/declaredImageBuildCommand.ts
entries=src/session/control_plane_entries.tsv

run_suites() {
  local name="$1"
  (cd src/packages/image-registry && bun test __tests__/declaredImageBuildCommand.test.ts) > "$out/annul-$name-unit.txt" 2>&1
  bash tests/session/test-declared-image-build-entry.sh > "$out/annul-$name-policy.txt" 2>&1
  printf '%s\tunit-fail=%s\tpolicy-fail=%s\n' "$name" \
    "$(grep -c '^(fail)' "$out/annul-$name-unit.txt")" "$(grep -c 'FALLA' "$out/annul-$name-policy.txt")"
  grep '^(fail)' "$out/annul-$name-unit.txt" | sed "s/^/  $name unit /"
  grep 'FALLA' "$out/annul-$name-policy.txt" | sed "s/^/  $name policy /"
}

mutate() {
  local name="$1" file="$2" old="$3" new="$4"
  cp "$file" "$out/backup"
  OLD="$old" NEW="$new" bash bin/replace_literal "$file" >/dev/null || { echo "$name: el mutante no aplicó"; cp "$out/backup" "$file"; return; }
  run_suites "$name"
  cp "$out/backup" "$file"
}

run_suites baseline
# 1. Sin validar la identidad: cualquier nombre resuelve a la primera imagen declarada.
mutate identity "$catalog" 'if (image === undefined) throw new UndeclaredImageError(id)' 'if (image === undefined) return DECLARED_IMAGES[0]!'
# 2. Con el contexto del llamador readmitido.
mutate caller-context "$command" "options: { task: { type: 'string' }, work: { type: 'string' } }" "options: { task: { type: 'string' }, work: { type: 'string' }, context: { type: 'string' } }"
# 3. Sin la fila de la entrada declarada.
cp "$entries" "$out/backup"; grep -v '^image-registry-build-declared-image' "$out/backup" > "$entries"; run_suites entry-row; cp "$out/backup" "$entries"
rm -f "$out/backup"
git status --short -- "$catalog" "$command" "$entries"
