#!/usr/bin/env bash
# Verify del ítem, con cwd en el worktree: construye todos los paquetes y
# EJECUTA desde dist/ los módulos que leen datos junto a sí mismos. Cargar por
# la condición `@thyrox/source` o importar el .ts no cuenta: el artefacto que
# se mide es el .js emitido.
set -uo pipefail
bun install --frozen-lockfile >/dev/null || { echo "verify: bun install falló"; exit 1; }
bun test tests/typescript/buildJavascript.test.ts || exit 1
bash bin/typescript-build-javascript src/packages/* || exit 1
fails=0
run() {  # $1 etiqueta, $2 código a evaluar desde la raíz del worktree
  if out="$(timeout 60 bun -e "$2" </dev/null 2>&1)"; then echo "dist: $1 ok ($out)"
  else echo "dist: $1 FALLA — $(printf '%s' "$out" | grep -m1 -E 'ENOENT|Error')"; fails=$((fails+1)); fi
}
run agent/models "const m = await import('./src/packages/agent/dist/models.js'); console.log(m.MODEL_IDS.length)"
run tools/definitions "const m = await import('./src/packages/tools/dist/definitions/index.js'); console.log(Object.keys(m).length)"
run tools/rupCoordinator "const m = await import('./src/packages/tools/dist/definitions/rupCoordinator.js'); console.log(m.rupCoordinator.prompt.length)"
n="$(find src/packages/tools/dist/definitions -name '*.prompt.md' | wc -l)"
echo "dist: $n prompt(s) emitido(s) en tools"
[[ "$n" -eq 31 ]] || fails=$((fails+1))
git checkout -q -- 'src/packages/*/package.json'
exit $fails
