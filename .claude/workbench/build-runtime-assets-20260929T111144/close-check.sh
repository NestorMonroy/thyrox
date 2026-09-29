#!/usr/bin/env bash
# Comprueba que el código ejecutado desde dist/ resuelve sus recursos runtime,
# resolviendo como el runtime y no por la posición espejo del fuente. Corre en
# un contenedor Podman con el repositorio como capa superpuesta: retira dist/,
# construye, y el árbol del anfitrión no cambia.
#   1. cada definición de tools/dist lee su prompt desde dist (lectura real
#      del getter), y el conjunto de prompts leídos es el de src por nombre;
#   2. agent/dist/models.jsonl existe junto a su lector y models.js carga desde
#      dist (dos evidencias separadas);
#   3. ningún .js emitido lleva __dirname/__filename horneado como ruta
#      absoluta, y bridge.py está donde lo resuelve su lector.
# Encontrar el lector por el nombre literal es sólo detección; lo que decide
# 1 y 2 es la lectura ejecutada. El 4 se lee en la prueba del parche y el 5 es
# `git status --short` vacío tras el commit.
set -uo pipefail
R="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
podman run --rm -v "$R:/w:O" -w /w --rootfs /:O bash -c '
  set -uo pipefail
  rm -rf src/packages/*/dist
  bun install --frozen-lockfile >/dev/null 2>&1 || { echo "cierre: bun install falló"; exit 1; }
  bash bin/typescript-build-javascript src/packages/* >/dev/null 2>&1 || { echo "cierre: build falló"; exit 1; }
  fails=0
  expected=$(cd src/packages/tools/src/definitions && ls *.prompt.md | sed "s/\.prompt\.md$//" | sort)
  read_ok=$(bun -e "
    const m = await import(\"./src/packages/tools/dist/definitions/index.js\")
    const ok = [], bad = []
    for (const [k, d] of Object.entries(m)) {
      if (!d || typeof d !== \"object\" || !(\"prompt\" in d)) continue
      try { if (String(d.prompt).length > 0) ok.push(k); else bad.push(k + \" vacío\") }
      catch (e) { bad.push(k + \": \" + (e.code ?? e.message)) }
    }
    for (const b of bad) console.error(\"  1: \" + b)
    console.log(ok.sort().join(\"\\n\"))
  " </dev/null 2>/tmp/prompts.err)
  cat /tmp/prompts.err
  n=$(printf "%s\n" "$expected" | grep -c .)
  got=$(printf "%s\n" "$read_ok" | grep -c .)
  if [[ "$(printf "%s\n" "$expected")" == "$(printf "%s\n" "$read_ok")" ]]; then echo "1 ok: $got de $n prompt(s) leídos desde dist, mismo conjunto que src"
  else echo "1 FALLA: $got de $n prompt(s) leídos desde dist"; fails=$((fails+1)); fi
  readers=$(grep -rl --include=*.js -F models.jsonl src/packages/agent/dist); miss=0; total=0
  for js in $readers; do total=$((total+1)); [[ -f "$(dirname "$js")/models.jsonl" ]] || miss=$((miss+1)); done
  if (( total > 0 && miss == 0 )); then echo "2a ok: models.jsonl junto a sus $total lector(es)"
  else echo "2a FALLA: models.jsonl falta junto a $miss de $total lector(es)"; fails=$((fails+1)); fi
  if out=$(bun -e "const m = await import(\"./src/packages/agent/dist/models.js\"); console.log(m.MODEL_IDS.length)" </dev/null 2>&1); then echo "2b ok: models.js carga desde dist ($out modelos)"
  else echo "2b FALLA: $(printf "%s" "$out" | grep -m1 -E "ENOENT|Error")"; fails=$((fails+1)); fi
  baked=$(grep -rlE --include=*.js "var __(dirname|filename) = \"/" src/packages/*/dist | wc -l)
  readers=$(grep -rl --include=*.js -F bridge.py src/packages/computer-use-mcp/dist); miss=0; total=0
  for js in $readers; do total=$((total+1)); [[ -f "$(dirname "$js")/bridge.py" ]] || miss=$((miss+1)); done
  if (( baked == 0 && total > 0 && miss == 0 )); then echo "3 ok: sin rutas absolutas horneadas; bridge.py junto a sus $total lector(es)"
  else echo "3 FALLA: $baked .js con __dirname/__filename absoluto; bridge.py falta junto a $miss de $total lector(es)"; fails=$((fails+1)); fi
  exit $fails
' </dev/null
