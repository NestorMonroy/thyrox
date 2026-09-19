#!/usr/bin/env bash
# =============================================================================
# test-bg-name-flag.sh — `start` rehusa un nombre que empieza por guion
# =============================================================================
# El defecto NO era que `--label` estuviera mal escrito: era que `start` lo
# ACEPTA. `cmd_start` toma `$1` como nombre ANTES del bucle de banderas, sin
# comprobar que no empiece por `-`, asi que:
#
#   bash bin/thyrox-bg start --label X -- bunx tsc --noEmit
#
# crea un run llamado `--label-<ISO>` y corre `X -- bunx tsc --noEmit` como
# comando, que muere con «command not found». Medido por conducta dos veces
# —2026-09-18 y 2026-09-19— y los dos runs huerfanos quedaron versionados.
#
# Un nombre que empieza por `--` es ademas hostil aguas abajo: todo consumidor
# que lo pase a un comando lo lee como bandera, no como nombre.
#
# El control que DISCRIMINA es el caso 4: un nombre legitimo tiene que seguir
# pasando. Una guarda que rehusara todo nombre dejaria el caso 1 en verde y el
# mecanismo inservible — un test que solo mirara el rechazo no los separa.
# =============================================================================
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.."
BG=src/session/bg.sh
ok=0; fallo=0
_es() { if [[ "$2" == "$3" ]]; then echo "  ok    $1"; ok=$((ok+1));
        else echo "  FALLA $1 — esperado [$3] obtenido [$2]"; fallo=$((fallo+1)); fi; }
_contiene() { if [[ "$2" == *"$3"* ]]; then echo "  ok    $1"; ok=$((ok+1));
        else echo "  FALLA $1 — [$2] no contiene [$3]"; fallo=$((fallo+1)); fi; }

TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
export THYROX_JOBS_DIR="$TMP/jobs"

echo "== 1. el caso real del episodio: --label como nombre =="
salida="$(bash "$BG" start --label etiqueta-x -- true 2>&1)"; codigo=$?
_es "rehusa con exit 2" "$codigo" "2"
_contiene "nombra la bandera ofensora" "$salida" "--label"

echo "== 2. un guion simple tambien se rehusa =="
salida2="$(bash "$BG" start -n -- true 2>&1)"; codigo2=$?
_es "rehusa con exit 2" "$codigo2" "2"

echo "== 3. el mensaje ENUMERA las banderas que start si admite =="
# Sin esto el aviso dice que algo esta mal y no como arreglarlo; el episodio
# ocurrio precisamente por no saber que `--label` no existe aqui.
_contiene "nombra --grace" "$salida" "--grace"
_contiene "nombra --dir" "$salida" "--dir"

echo "== 4. CONTROL: un nombre legitimo sigue arrancando =="
salida4="$(bash "$BG" start trabajo-legitimo --grace 0 -- true 2>&1)"; codigo4=$?
_es "arranca con exit 0" "$codigo4" "0"
_contiene "publica su RUN" "$salida4" "RUN="
# Y el run NO lleva guiones al principio: es lo que lo hace citable aguas abajo.
run4="$(sed -n 's/^RUN=//p' <<<"$salida4")"
base4="$(basename "$run4")"
if [[ "$base4" == -* ]]; then
  echo "  FALLA el run empieza por guion — [$base4]"; fallo=$((fallo+1))
else
  echo "  ok    el run no empieza por guion"; ok=$((ok+1))
fi

echo
echo "resumen: $ok ok, $fallo fallo"
[[ $fallo -eq 0 ]]
