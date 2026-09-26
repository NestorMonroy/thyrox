set -uo pipefail
# Arranque — DOS entradas, ambas de entorno (DEC-04): el VALOR de la raiz
# y la RUTA a su declaracion. Los dos literales que el ultimo recurso
# necesita van tras constantes que el entorno tambien fija: cablearlos le
# quitaria al consumidor la decision de donde van las cosas.
_thyrox_root="${THYROX_ROOT:-}"
if [[ -z "$_thyrox_root" && -n "${THYROX_ENV_FILE:-}" && -f "${THYROX_ENV_FILE}" ]]; then
    _thyrox_root="$(sed -n 's/^[[:space:]]*THYROX_ROOT[[:space:]]*=[[:space:]]*//p' \
        "$THYROX_ENV_FILE" | tail -1 | tr -d '"'"'"'')"
fi
if [[ -z "$_thyrox_root" ]]; then
    _thyrox_root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    while [[ "$_thyrox_root" != "/" && ! -f "$_thyrox_root/${THYROX_LOCATOR:-src/paths/reach.py}" ]]; do
        _thyrox_root="$(dirname "$_thyrox_root")"
    done
fi
source "$_thyrox_root/${THYROX_LIB_REACH:-src/lib/reach.sh}"
source "$_thyrox_root/src/lib/fixture.sh"
cd "$(thyrox_root)" || exit 1

# La sonda de stdin, sin que nadie tenga que acordarse de correrla. Episodio:
# el paso 160 corrió minutos y nadie miró sus procesos hasta que el ejecutor
# preguntó; y antes, un `rg` sin archivo leyó un socket 1 h 19 min. Mientras
# un trabajo sigue vivo, `wait` sondea su árbol con `bin/stdin_probe`
# (repartido con GNU Parallel) y avisa de quien lee stdin de un canal.
#
# Qué lo haría fallar: retirar la sonda del latido cae el caso del latido;
# retirar el aviso de canal caen los tres casos que lo leen; ni uno más.

GUION=src/session/wait-jobs.sh
OK=0; FALLO=0
afirmar() {  # afirmar <descripción> <esperado> <obtenido>
    if [[ "$2" == "$3" ]]; then OK=$((OK+1)); echo "  ok    $1"
    else FALLO=$((FALLO+1)); echo "  FALLA $1 — esperado '$2', obtenido '$3'"; fi
}
contiene_texto() { printf '%s\n' "$1" | grep -Eq -- "$2" && echo si || echo no; }

THYROX_JOBS_DIR=$(fixture_dir); export THYROX_JOBS_DIR
L1=$(fixture_file); L2=$(fixture_file)
# `canal`: su nieto `cat` lee stdin de una tubería que nadie cierra.
nohup bash -c "sleep 30 | cat" </dev/null >"$L1" 2>&1 & P1=$!; disown $P1
# `limpio`: todo su árbol con stdin en /dev/null.
nohup bash -c "sleep 30" </dev/null >"$L2" 2>&1 & P2=$!; disown $P2
sleep 1
bash "$GUION" register canal "$L1" "$P1" >/dev/null
bash "$GUION" register limpio "$L2" "$P2" >/dev/null

OUT=$(bash "$GUION" probe 2>&1)
afirmar "probe: sondea el árbol del trabajo y ve el canal del nieto" "si" \
    "$(contiene_texto "$OUT" '^sonda canal: [0-9]+ cat stdin=channel')"
afirmar "probe: avisa de quien lee stdin de un canal, nombrando el trabajo" "si" \
    "$(contiene_texto "$OUT" '^  AVISO canal: pid [0-9]+ \(cat\) lee stdin de un canal')"
afirmar "probe: el trabajo limpio se sondea y no se avisa" "si no" \
    "$(contiene_texto "$OUT" '^sonda limpio: [0-9]+ sleep stdin=devnull') $(contiene_texto "$OUT" 'AVISO limpio')"

OUT=$(WAIT_JOBS_PARALLEL=/no/existe bash "$GUION" probe 2>&1)
afirmar "probe sin GNU Parallel: sondea en serie y lo dice" "si si" \
    "$(contiene_texto "$OUT" 'AVISO canal') $(contiene_texto "$OUT" 'sin GNU Parallel')"

ERR=$(fixture_file)
WAIT_JOBS_INTERVAL=1 bash "$GUION" wait --only canal --timeout 3 --heartbeat 1 >/dev/null 2>"$ERR"
afirmar "wait: el latido sondea al vivo sin que se lo pidan" "si" \
    "$(contiene_texto "$(cat "$ERR")" '^  AVISO canal: pid [0-9]+ \(cat\)')"

pkill -P "$P1" 2>/dev/null; kill "$P1" "$P2" 2>/dev/null; pkill -P "$P2" 2>/dev/null
echo
printf '%d ok, %d fallos\n' "$OK" "$FALLO"
exit $(( FALLO > 0 ))
