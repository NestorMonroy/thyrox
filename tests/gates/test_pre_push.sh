#!/usr/bin/env bash
# Control de `src/gates/pre-push.sh` — la composición de los dos gates que un
# repo consumidor corre antes de publicar.
#
# Qué haría fallar a este control (sub-patrón D): que con los gates AUSENTES el
# guion siga saliendo 0. Ése es el defecto que lo origina — al mudarse los dos
# gates de `kaupamex-docs/.claude/scripts/gates/` a `thyrox/src/gates/`, el
# `pre-push` del consumidor quedó saltándolos: el de IDs en silencio (`if [ -f
# ... ]` falso) y el de artefactos con un «skip» y `exit 0`. Un push con los dos
# gates ausentes se veía igual que uno correcto.
#
# El consumidor es sintético: el control no toca ningún clon real.
set -uo pipefail

AQUI="$(cd "$(dirname "$0")" && pwd)"
THYROX="$(cd "$AQUI/../.." && pwd)"
PRE_PUSH="$THYROX/src/gates/pre-push.sh"

ok=0; fallo=0
afirmar() {
    local nombre="$1" esperado="$2" real="$3"
    if [ "$esperado" = "$real" ]; then
        ok=$((ok + 1)); printf '  ok   %s\n' "$nombre"
    else
        fallo=$((fallo + 1))
        printf '  FALLO %s\n       esperado: %s\n       obtenido: %s\n' "$nombre" "$esperado" "$real"
    fi
}

[ -f "$PRE_PUSH" ] || {
    echo "ERROR — no existe $PRE_PUSH. NO se emite un conteo." >&2
    exit 2
}

CONSUMIDOR="$(mktemp -d)"
trap 'rm -rf "$CONSUMIDOR"' EXIT

# --- Caso 1: los gates NO existen -> REHÚSA ---------------------------------
# Es el caso que hoy sale 0. Un gate que no puede medir no autoriza el push.
VACIO="$(mktemp -d)"; mkdir -p "$VACIO/src/gates"
salida="$(THYROX_ROOT="$VACIO" bash "$PRE_PUSH" "$CONSUMIDOR" </dev/null 2>&1)"; estado=$?
afirmar 'con los gates ausentes rehúsa con 2, no con 1' '2' "$estado"
afirmar 'y nombra el gate que falta' 'si' \
    "$(printf '%s' "$salida" | grep -q 'check-ids-duplicados' && echo si || echo no)"
afirmar 'y NO dice que lo saltó' 'no' \
    "$(printf '%s' "$salida" | grep -qi 'skip' && echo si || echo no)"

# --- Caso 2: los gates existen y pasan -> autoriza --------------------------
# Control POSITIVO: sin él, un guion que rehusara SIEMPRE pasaría el caso 1.
VERDE="$(mktemp -d)"; mkdir -p "$VERDE/src/gates"
for g in check-ids-duplicados.sh check-artefactos-minimos.sh; do
    printf '#!/usr/bin/env bash\nexit 0\n' > "$VERDE/src/gates/$g"; chmod +x "$VERDE/src/gates/$g"
done
THYROX_ROOT="$VERDE" bash "$PRE_PUSH" "$CONSUMIDOR" </dev/null >/dev/null 2>&1
afirmar 'con los gates verdes autoriza' '0' "$?"

# --- Caso 3: un gate rojo -> bloquea ----------------------------------------
ROJO="$(mktemp -d)"; mkdir -p "$ROJO/src/gates"
printf '#!/usr/bin/env bash\nexit 1\n' > "$ROJO/src/gates/check-ids-duplicados.sh"
printf '#!/usr/bin/env bash\nexit 0\n' > "$ROJO/src/gates/check-artefactos-minimos.sh"
chmod +x "$ROJO/src/gates/"*.sh
THYROX_ROOT="$ROJO" bash "$PRE_PUSH" "$CONSUMIDOR" </dev/null >/dev/null 2>&1
afirmar 'con el gate de IDs rojo bloquea' '1' "$?"

# --- Caso 4: universo vacío (exit 2) NO es rojo -----------------------------
# El gate salió 2 porque no midió nada; no afirma nada (H-API-336). Tratarlo
# como rojo detendría el push por una ausencia de sujeto, no por un defecto.
DOS="$(mktemp -d)"; mkdir -p "$DOS/src/gates"
printf '#!/usr/bin/env bash\nexit 2\n' > "$DOS/src/gates/check-ids-duplicados.sh"
printf '#!/usr/bin/env bash\nexit 0\n' > "$DOS/src/gates/check-artefactos-minimos.sh"
chmod +x "$DOS/src/gates/"*.sh
THYROX_ROOT="$DOS" bash "$PRE_PUSH" "$CONSUMIDOR" </dev/null >/dev/null 2>&1
afirmar 'un universo vacío (exit 2) no bloquea' '0' "$?"

rm -rf "$VACIO" "$VERDE" "$ROJO" "$DOS"
printf '\npre-push: %d ok, %d fallo(s) (alcance medido: %s)\n' "$ok" "$fallo" "$PRE_PUSH"
[ "$fallo" -eq 0 ]
