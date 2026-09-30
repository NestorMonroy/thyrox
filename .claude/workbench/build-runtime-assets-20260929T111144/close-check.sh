#!/usr/bin/env bash
# Comprueba que el código ejecutado desde dist/ resuelve sus recursos runtime
# por comportamiento, no por la posición espejo del fuente ni por el texto de
# un chunk. Corre en un contenedor Podman con el repositorio como capa
# superpuesta; el árbol del anfitrión no cambia.
#   5. el builder real no hereda salidas de un build anterior: tras un build
#      limpio se planta un chunk centinela en dist/ y se construye de nuevo;
#      el centinela tiene que desaparecer. La limpieza inicial sólo hace
#      determinista la medida; no sustituye esta comprobación.
#   1. con src/ de tools OCULTO, cada definición de tools/dist lee su prompt
#      por su getter real, y el conjunto leído es el de src por nombre;
#   2. agent/dist/models.jsonl existe junto a su lector, y con src/ de agent
#      oculto models.js carga desde dist (dos evidencias separadas);
#   3. ningún .js emitido lleva __dirname/__filename horneado como ruta
#      absoluta, y bridge.py está donde lo resuelve su lector.
# Encontrar un lector por el nombre literal es sólo detección. El 4 (control
# de anulación) se lee en la prueba del parche y el 6 es `git status --short`
# vacío tras el commit.
set -uo pipefail
R="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
podman run --rm -v "$R:/w:O" -w /w --rootfs /:O bash -c '
  set -uo pipefail
  rm -rf src/packages/*/dist
  bun install --frozen-lockfile >/dev/null 2>&1 || { echo "cierre: bun install falló"; exit 1; }
  build() { bash bin/typescript-build-javascript src/packages/* >/dev/null 2>&1; }
  build || { echo "cierre: build falló"; exit 1; }
  fails=0
  for p in agent tools computer-use-mcp; do echo "// centinela" > "src/packages/$p/dist/chunk-stale0000.js"; done
  build || { echo "cierre: segundo build falló"; exit 1; }
  left=$(ls src/packages/{agent,tools,computer-use-mcp}/dist/chunk-stale0000.js 2>/dev/null | wc -l)
  if (( left == 0 )); then echo "5 ok: el segundo build no hereda salidas del anterior"
  else echo "5 FALLA: $left de 3 centinela(s) sobreviven al segundo build"; fails=$((fails+1)); fi
  rm -f src/packages/*/dist/chunk-stale0000.js
  expected=$(cd src/packages/tools/src/definitions && ls *.prompt.md | sed "s/\.prompt\.md$//" | sort)
  mv src/packages/tools/src /tmp/tools-src-hidden
  read_ok=$(bun -e "
    const m = await import(\"./src/packages/tools/dist/definitions/index.js\")
    const ok = []
    for (const [k, d] of Object.entries(m)) {
      if (!d || typeof d !== \"object\" || !(\"prompt\" in d)) continue
      try { if (String(d.prompt).length > 0) ok.push(k) } catch {}
    }
    console.log(ok.sort().join(\"\\n\"))
  " </dev/null 2>/dev/null)
  mv /tmp/tools-src-hidden src/packages/tools/src
  n=$(printf "%s\n" "$expected" | grep -c .); got=$(printf "%s\n" "$read_ok" | grep -c .)
  if [[ "$expected" == "$read_ok" ]]; then echo "1 ok: $got de $n prompt(s) leídos desde dist sin src/, mismo conjunto por nombre"
  else echo "1 FALLA: $got de $n prompt(s) leídos desde dist sin src/"; fails=$((fails+1)); fi
  readers=$(grep -rl --include=*.js -F models.jsonl src/packages/agent/dist); miss=0; total=0
  for js in $readers; do total=$((total+1)); [[ -f "$(dirname "$js")/models.jsonl" ]] || miss=$((miss+1)); done
  if (( total > 0 && miss == 0 )); then echo "2a ok: models.jsonl junto a sus $total lector(es)"
  else echo "2a FALLA: models.jsonl falta junto a $miss de $total lector(es)"; fails=$((fails+1)); fi
  mv src/packages/agent/SessionMemory /tmp/agent-sm-hidden 2>/dev/null
  mkdir -p /tmp/agent-src-hidden; for f in src/packages/agent/*.ts src/packages/agent/*.jsonl; do mv "$f" /tmp/agent-src-hidden/; done
  if out=$(bun -e "const m = await import(\"./src/packages/agent/dist/models.js\"); console.log(m.MODEL_IDS.length)" </dev/null 2>&1); then echo "2b ok: models.js carga desde dist sin el fuente de agent ($out modelos)"
  else echo "2b FALLA: $(printf "%s" "$out" | grep -m1 -E "ENOENT|Error")"; fails=$((fails+1)); fi
  mv /tmp/agent-src-hidden/* src/packages/agent/; mv /tmp/agent-sm-hidden src/packages/agent/SessionMemory 2>/dev/null
  baked=$(grep -rlE --include=*.js "var __(dirname|filename) = \"/" src/packages/*/dist | wc -l)
  readers=$(grep -rl --include=*.js -F bridge.py src/packages/computer-use-mcp/dist); miss=0; total=0
  for js in $readers; do total=$((total+1)); [[ -f "$(dirname "$js")/bridge.py" ]] || miss=$((miss+1)); done
  if (( baked == 0 && total > 0 && miss == 0 )); then echo "3 ok: sin rutas del fuente horneadas; bridge.py junto a sus $total lector(es)"
  else echo "3 FALLA: $baked .js con __dirname/__filename absoluto; bridge.py falta junto a $miss de $total lector(es)"; fails=$((fails+1)); fi
  exit $fails
' </dev/null
rc=$?
# 3b. Invariancia respecto del path del árbol fuente: el mismo árbol, montado
# en dos rutas absolutas distintas, tiene que emitir dist/ idénticos byte a
# byte. Mide la propiedad general, no la forma de hoy del path horneado.
digest() {
  podman run --rm -v "$R:$1:O" -w "$1" --rootfs /:O bash -c '
    rm -rf src/packages/*/dist
    bun install --frozen-lockfile >/dev/null 2>&1 && bash bin/typescript-build-javascript src/packages/* >/dev/null 2>&1 || exit 1
    find src/packages/*/dist -type f -print0 | sort -z | xargs -0 sha256sum' </dev/null
}
a="$(digest /w)" && b="$(digest /v)" || { echo "3b FALLA: no se pudo construir en las dos rutas"; exit $((rc+1)); }
n=$(printf '%s\n' "$a" | wc -l)
d=$(diff <(printf '%s\n' "$a") <(printf '%s\n' "$b") | grep -c '^<')
if (( d == 0 )); then echo "3b ok: $n archivo(s) de dist idénticos construyendo en /w y en /v"
else echo "3b FALLA: $d de $n archivo(s) de dist cambian con la ruta del árbol fuente"; rc=$((rc+1)); fi
exit $rc
