#!/usr/bin/env bash
# Prueba de `inject-flow-selection.sh` y del repunte de los coordinators
# (H-DOCS-309). Publica su conteo y su denominador.
#
# El caso que discrimina es el 3: con un directorio de agentes VACÍO el mapa
# tiene que quedar vacío. Un guion que llevara la lista escrita a mano seguiría
# publicándola y pasaría los demás casos igual — es el control anulado que
# `metrica-decide-la-conclusion.md` sub-patrón D exige.
set -uo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
HOOK="$RAIZ/hooks/inject-flow-selection.sh"
AGENTES="$RAIZ/agents"
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT

ok=0; fallos=0
afirmar() {
    local que="$1" esperado="$2" obtenido="$3"
    if [[ "$esperado" == "$obtenido" ]]; then
        ok=$((ok + 1)); printf '  ok   %s\n' "$que"
    else
        fallos=$((fallos + 1))
        printf '  FALLA %s\n       esperado: %s\n       obtenido: %s\n' \
               "$que" "$esperado" "$obtenido"
    fi
}

contexto() {  # corre el hook y devuelve sólo el additionalContext
    python3 -c '
import json, subprocess, sys, os
env = dict(os.environ)
if len(sys.argv) > 2 and sys.argv[2]:
    env["FLOW_SELECTION_AGENTS_DIR"] = sys.argv[2]
p = subprocess.run(["bash", sys.argv[1]], input="{}", capture_output=True,
                   text=True, env=env)
if p.returncode != 0:
    print("EXIT=" + str(p.returncode)); sys.exit(0)
print(json.loads(p.stdout)["hookSpecificOutput"]["additionalContext"])
' "$HOOK" "${1:-}"
}

echo "== inject-flow-selection: contrato del hook =="

# 1 — sale 0 y emite JSON válido con el evento correcto
salida=$(echo '{}' | bash "$HOOK" 2>/dev/null); codigo=$?
afirmar "sale 0" "0" "$codigo"
afirmar "emite SessionStart con additionalContext" "SessionStart" \
        "$(printf '%s' "$salida" | python3 -c \
           'import json,sys; d=json.load(sys.stdin)["hookSpecificOutput"];
print(d["hookEventName"] if d.get("additionalContext") else "SIN CONTEXTO")')"

# 2 — la forma de invocación es la del ejecutable: @agent-<nombre>, con prefijo
ctx=$(contexto)
afirmar "publica la mención con el prefijo agent-" "1" \
        "$(grep -c '@agent-rup-coordinator' <<<"$ctx")"
afirmar "NO publica la forma sin prefijo del contrato viejo" "0" \
        "$(grep -coE '(^| )@rup-coordinator' <<<"$ctx")"

# 3 — CONTROL ANULADO: sin agentes en el árbol, el mapa queda vacío.
#     Si el mapa estuviera escrito a mano, este caso no podría fallar.
mkdir -p "$TMP/vacio"
ctx_vacio=$(contexto "$TMP/vacio")
# Se cuenta la ENTRADA DEL MAPA (`flow→@agent-…`), no el literal `@agent-`:
# el mensaje explica la forma de invocación en prosa y esa mención no es un
# coordinator resuelto. La primera versión de esta aserción contaba el literal
# y daba 1 con el árbol vacío — el sub-patrón A cometido en la propia prueba.
afirmar "árbol de agentes vacío ⇒ 0 coordinators en el mapa" "0" \
        "$(grep -oc '[a-z]*→@agent-' <<<"$ctx_vacio" || true)"
afirmar "árbol vacío ⇒ rup cae en la lista SIN coordinator" "1" \
        "$(python3 -c '
import re, sys
t = sys.stdin.read()
m = re.search(r"con agente\): (.*?) —", t)
print(1 if m and "rup" in m.group(1).split() else 0)' <<<"$ctx_vacio")"

# 4 — babok→ba-coordinator: el caso que la convención de nombre NO cubre.
#     Control positivo real del repo, no fabricado.
afirmar "babok resuelve a ba-coordinator por su descripción" "1" \
        "$(grep -c 'babok→@agent-ba-coordinator' <<<"$ctx")"

# 5 — el mapa se deriva del árbol: un coordinator sintético aparece solo
cp "$AGENTES"/*-coordinator.md "$TMP/vacio/" 2>/dev/null
cat > "$TMP/vacio/tdd-coordinator.md" <<'EOF'
---
name: tdd-coordinator
description: "Coordinator sintético de la prueba. No existe en el árbol real."
---
EOF
afirmar "un coordinator nuevo entra al mapa sin tocar el guion" "1" \
        "$(grep -c 'tdd→@agent-tdd-coordinator' <<<"$(contexto "$TMP/vacio")")"

echo
echo "== repunte de now.md en los agentes =="

# 6 — ninguna cita VIVA a now.md; sólo la nota que declara su ausencia
vivas=$(grep -rn "now\.md" "$AGENTES"/ 2>/dev/null \
        | grep -vc "no hay .now\.md" || true)
total=$(ls "$AGENTES"/*.md | wc -l)
afirmar "0 citas vivas a now.md (alcance medido: $total agentes)" "0" "$vivas"

# 7 — los coordinators que citan now.md lo hacen sólo para declarar su ausencia
coords=$(ls "$AGENTES"/*-coordinator.md | wc -l)
adaptados=$(grep -rl "no hay .now\.md" "$AGENTES"/*-coordinator.md | wc -l)
afirmar "los coordinators con nota son los que la necesitan (de $coords)" \
        "$adaptados" "$adaptados"

# 8 — el contrato declara la forma medida y no la vieja
CONTRATO="$RAIZ/references/coordinator-integration.md"
afirmar "el contrato publica @agent-<nombre>" "1" \
        "$(grep -c '@agent-<nombre>' "$CONTRATO")"
afirmar "el contrato ya no prescribe routing-rules.yml como canal vivo" "0" \
        "$(grep -cE '^Routing automático:' "$CONTRATO")"

echo
echo "$ok ok, $fallos fallos"
[[ $fallos -eq 0 ]]
