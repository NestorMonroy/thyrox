#!/usr/bin/env bash
# Pruebas de `bridge_hooks.py` — el puente de hooks a la fuente viva de
# settings del harness remoto (tarea #107, :ref:`h-docs-1010`).
#
# Qué protege
# -----------
# El puente toca el archivo que decide qué hooks dispara el cliente. Cuatro
# propiedades suyas no se ven en el camino feliz, y las cuatro tienen coste:
#
# 1. **Preserva las claves ajenas.** La fuente viva también lleva
#    `advisorModel`; un puente que reescriba el archivo entero lo borraría.
# 2. **No toca el archivo si el contenido no cambia.** El mtime dispara la
#    recarga de settings, y esa recarga cuesta la caché de prompt — medido:
#    0 leídos, 778 297 escritos (:ref:`h-docs-1012`).
# 3. **No deduplica por nombre.** Tres guiones existen en dos clones con el
#    mismo nombre y CUERPO distinto; elegir uno silenciaría al otro.
# 4. **Deja `Stop` fuera por defecto.** Su cadena bloquea el fin del turno y
#    su conducta está sin decidir (tarea #95).
#
# El caso 5 es el que hace verificable la suite
# ---------------------------------------------
# El dry-run es el default, así que un verde de los casos 1-4 no distingue
# «el guion respeta el default» de «el test nunca pidió escribir». El caso 5
# invierte el control: exige que SIN `--apply` el archivo quede byte a byte
# igual aunque el contenido propuesto difiera.
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../../.." || exit 1

BRIDGE=.claude/scripts/bridge_hooks.py
OK=0; FALLO=0

afirmar() {  # afirmar <descripción> <esperado> <obtenido>
    if [[ "$2" == "$3" ]]; then
        printf '  ok    %s\n' "$1"; (( OK++ ))
    else
        printf '  FALLO %s\n        esperado=[%s] obtenido=[%s]\n' "$1" "$2" "$3"; (( FALLO++ ))
    fi
}

cleanup() { [[ -n "${TMP:-}" ]] && rm -rf "$TMP"; }
trap cleanup EXIT
TMP=$(mktemp -d)
T="$TMP/settings.local.json"

comandos() {  # cuántos comandos declara el archivo
    python3 -c "
import json,sys
try: d=json.load(open(sys.argv[1]))
except FileNotFoundError: print(0); raise SystemExit
print(sum(len(g['hooks']) for gs in d.get('hooks',{}).values() for g in gs))" "$T"
}

echo "== bridge_hooks =="

# --- Caso 1: preserva las claves ajenas ------------------------------------
printf '{"advisorModel":"claude-fable-5-1"}\n' > "$T"
KX_BRIDGE_SETTINGS="$T" python3 "$BRIDGE" --apply >/dev/null
afirmar "preserva advisorModel al escribir" "claude-fable-5-1" \
    "$(python3 -c "import json;print(json.load(open('$T')).get('advisorModel'))")"
afirmar "declara la clave hooks" "True" \
    "$(python3 -c "import json;print('hooks' in json.load(open('$T')))")"

# --- Caso 2: idempotente y sin tocar el mtime ------------------------------
ANTES=$(stat -c %Y "$T"); sleep 1
SALIDA=$(KX_BRIDGE_SETTINGS="$T" python3 "$BRIDGE" --apply)
afirmar "re-aplicar es no-op" "1" \
    "$(grep -c 'sin cambios' <<<"$SALIDA")"
afirmar "no-op deja el mtime intacto" "$ANTES" "$(stat -c %Y "$T")"

# --- Caso 3: no deduplica por nombre de archivo ----------------------------
# save-agent-result.mjs existe en api y docs con cuerpo distinto: las DOS
# rutas absolutas tienen que aparecer.
RUTAS=$(python3 -c "
import json
d=json.load(open('$T'))
print(sum(1 for gs in d['hooks'].values() for g in gs for h in g['hooks']
          if h['command'].endswith('save-agent-result.mjs')))")
afirmar "las dos copias divergentes se puentean" "2" "$RUTAS"

# --- Caso 4: Stop queda fuera por defecto, y entra con la bandera ----------
afirmar "Stop NO se puentea por defecto" "False" \
    "$(python3 -c "import json;print('Stop' in json.load(open('$T'))['hooks'])")"
SIN_STOP=$(comandos)
KX_BRIDGE_SETTINGS="$T" python3 "$BRIDGE" --include-stop --apply >/dev/null
CON_STOP=$(comandos)
afirmar "Stop entra con --include-stop" "True" \
    "$(python3 -c "import json;print('Stop' in json.load(open('$T'))['hooks'])")"
afirmar "--include-stop suma comandos" "1" "$(( CON_STOP > SIN_STOP ))"

# --- Caso 5 (el control): sin --apply NO se escribe, aunque difiera --------
# Se parte de un archivo cuyo contenido NO es el propuesto: si el dry-run
# escribiera, el sha cambiaría. Un verde aquí sólo puede venir de que el
# guion respete el default.
printf '{"advisorModel":"x","hooks":{}}\n' > "$T"
SHA_ANTES=$(sha256sum "$T" | cut -d' ' -f1)
SALIDA=$(KX_BRIDGE_SETTINGS="$T" python3 "$BRIDGE")
afirmar "dry-run no escribe (control)" "$SHA_ANTES" "$(sha256sum "$T" | cut -d' ' -f1)"
afirmar "dry-run anuncia que no escribió" "1" \
    "$(grep -c 'NO se escribió nada' <<<"$SALIDA")"
afirmar "dry-run muestra el diff" "1" \
    "$(grep -cE '^\+\s+\"command\"' <<<"$SALIDA" | awk '{print ($1>0)?1:0}')"

echo
echo "aserciones: $((OK + FALLO))  ok: $OK  fallo: $FALLO"
[[ $FALLO -eq 0 ]]
