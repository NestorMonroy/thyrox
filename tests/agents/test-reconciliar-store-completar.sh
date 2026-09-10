#!/usr/bin/env bash
# Pruebas de `reconcile_store.py::_completar` — el desenlace de reparar una
# fila, y lo que el pase PUBLICA cuando ese desenlace es «fallo».
#
# Qué protege
# -----------
# `_completar` devuelve tres sentinelas —«actualizada», «sin-cambios»,
# «fallo»— y su consumidor cuenta el tercero en un entero que el resumen
# imprime como «N fallidos». Hasta este arreglo, el `stderr` del subproceso y
# su código de salida se descartaban en el `return`, así que el resumen no
# distinguía un store bloqueado de una fila corrupta de un guion ausente.
#
# Es el sub-patrón D de `metrica-decide-la-conclusion.md` en su forma más
# barata: el contador es correcto y no informa. Un «3 fallidos» que se repite
# cada arranque no se puede diagnosticar sin re-ejecutar a mano el comando que
# el propio pase ya ejecutó.
#
# Y el segundo desenlace que no existía: `subprocess.run(..., timeout=30)` sin
# `try` deja escapar `TimeoutExpired`, que aborta el bucle entero a mitad de
# reparación. Un pase que muere en la fila 4 de 20 no publica nada de las 16
# restantes — ni siquiera que no se intentaron.
#
# Qué haría fallar a este control
# -------------------------------
# Que `_completar` vuelva a tragarse el `stderr`. Los casos 1 y 3 caen; el 2
# NO cae, porque mide el camino sano — ése es el par que discrimina.
set -uo pipefail
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
cd "$(thyrox_root)" || exit 1

SCRIPT=src/agents/reconcile_store.py
OK=0; FALLO=0

afirmar_contiene() {  # afirmar_contiene <nombre> <aguja> <pajar>
    if [[ "$3" == *"$2"* ]]; then
        printf '  ok    %s\n' "$1"; (( OK++ ))
    else
        printf '  FALLO %s\n        esperaba que contuviera=[%s]\n        obtenido=[%s]\n' \
            "$1" "$2" "$3"; (( FALLO++ ))
    fi
}
afirmar() {
    if [[ "$2" == "$3" ]]; then
        printf '  ok    %s\n' "$1"; (( OK++ ))
    else
        printf '  FALLO %s\n        esperado=[%s] obtenido=[%s]\n' "$1" "$2" "$3"; (( FALLO++ ))
    fi
}

# `_completar` se ejercita por import directo con `subprocess.run` sustituido:
# cargar el módulo entero arrastraría su store real, y este test no debe
# tocarlo. El sustituto es el ÚNICO efecto externo de la función.
correr() {  # correr <modo>   modo: falla | sana | timeout
    python3 - "$SCRIPT" "$1" <<'PY' 2>&1
import importlib.util, subprocess, sys, pathlib
spec = importlib.util.spec_from_file_location("_rs", sys.argv[1])
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

modo = sys.argv[2]
def falso(cmd, **kw):
    if modo == "timeout":
        raise subprocess.TimeoutExpired(cmd, kw.get("timeout", 30))
    if modo == "sana":
        return subprocess.CompletedProcess(cmd, 0, "fila actualizada\n", "")
    return subprocess.CompletedProcess(cmd, 3, "", "sqlite3.OperationalError: database is locked\n")
mod.subprocess.run = falso
mod._cierre = lambda t, a, s: ["comando-de-cierre", a]
mod._status = lambda t: "completed"

print("DESENLACE=" + mod._completar(pathlib.Path("/no/importa.jsonl"), "agente-XYZ"))
PY
}

echo "== _completar publica la causa del fallo =="

salida="$(correr falla)"
afirmar_contiene "el sentinela sigue siendo «fallo»" "DESENLACE=fallo" "$salida"
afirmar_contiene "nombra el agente" "agente-XYZ" "$salida"
afirmar_contiene "publica el codigo de salida" "3" "$salida"
afirmar_contiene "publica el stderr del subproceso" "database is locked" "$salida"

salida="$(correr sana)"
afirmar "el camino sano no publica ruido" "DESENLACE=actualizada" "$salida"

salida="$(correr timeout)"
afirmar_contiene "el timeout es un desenlace, no una excepcion" "DESENLACE=fallo" "$salida"
# La aserción NO busca la palabra «timeout»: el traceback que este arreglo
# elimina la contenía, así que con ella el caso pasaba ANTES del fix — un
# verde accidental de los que H-DOCS-224 registró. Busca la frase que sólo
# el mensaje deliberado produce.
afirmar_contiene "el timeout se nombra con su umbral" "excedió los 30 s" "$salida"

echo
echo "== $OK ok · $FALLO fallas =="
[[ "$FALLO" -eq 0 ]]
