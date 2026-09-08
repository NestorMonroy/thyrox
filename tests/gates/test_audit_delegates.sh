#!/usr/bin/env bash
# El audit deja de enumerar sus gates a mano: los corre el registro (#253).
#
# QUE CIERRA. `registry.py` nacio como FUENTE UNICA —su propia cabecera lo
# dice: «Antes esto vivia disperso en 1126 lineas de thyrox-audit.sh, con cada
# gate en su propio bloque `if [[ -f … ]]`»— y `doctor.py` la consume. Pero el
# audit siguio con su enumeracion, asi que hubo DOS fuentes durante todo ese
# tiempo y la del audit se quedo atras.
#
# MEDIDO antes de cortar, y es lo que hace decidible el corte:
#
#   registry declara ........ 47 gates
#   el audit invocaba ....... 35 guiones
#   solo en el audit ......... 0    <- delegar no pierde NADA
#   solo en el registro ..... 12    <- delegar GANA doce que nunca corrian
#
# Los 37 bloques puros de gate se sustituyen por una delegacion; los 10 que
# miden algo que ningun gate registrado cubre —gitlink, anatomia del skill,
# coherencia del SMD, lenguaje muerto, subagentes sin fila— se quedan. La
# clasificacion es mecanica: un bloque es puro si su unica invocacion es un
# guion que el registro declara.
#
# CONTROL DE ANULACION: se le devuelve al audit UN bloque de gate enumerado y
# debe caer el caso 1, y solo ese. Los demas sobreviven: miden la delegacion y
# la supervivencia de lo unico, no cuantos bloques hay.
set -uo pipefail

AQUI="$(cd "$(dirname "$0")" && pwd)"
THYROX="$(cd "$AQUI/../.." && pwd)"
AUDIT="$THYROX/src/gates/thyrox-audit.sh"

[ -f "$AUDIT" ] || { echo "ERROR — no existe $AUDIT. NO se emite un conteo." >&2; exit 2; }

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

# --- 1. cero gates registrados invocados a mano -----------------------------
# Metrica: guiones `src/gates/check*` que el audit nombra Y que el registro
# declara.
# Ciega a: un gate que el audit invocara por una ruta compuesta en una
# variable, y a uno que el registro no declare — ese seria otro defecto, el de
# un gate fuera del registro, y lo mide `tests/gates/test_doctor.py`.
ENUMERADOS="$(cd "$THYROX" && python3 - <<'PY'
import re, pathlib, sys
sys.path.insert(0, 'src')
from gates import registry
declarados = {c.script for c in registry.CHECKS}
texto = pathlib.Path('src/gates/thyrox-audit.sh').read_text()
invocados = set(re.findall(r'src/gates/(check[-_][a-z0-9_-]+\.(?:sh|py))', texto))
print(len(invocados & declarados))
PY
)"
afirmar "el audit no enumera ningun gate registrado" 0 "$ENUMERADOS"

# --- 2. delega en el registro -----------------------------------------------
if grep -q 'gates/doctor.py\|gates\.doctor\|-m gates\.doctor' "$AUDIT"; then VISTO=delega; else VISTO=no-delega; fi
afirmar "el audit invoca al corredor del registro" delega "$VISTO"

# --- 3. lo unico sobrevive --------------------------------------------------
# Los cinco que ningun gate registrado cubre. Si el corte se lleva uno por
# delante, este caso lo nombra: es la mitad del control que impide que
# «delegar» degenere en «borrar».
FALTAN=0
for marca in 'gitlink' 'Anatomía oficial del skill' 'SMD' 'Lenguaje muerto' 'Subagentes en disco'; do
    grep -qF "$marca" "$AUDIT" || { FALTAN=$((FALTAN+1)); echo "       perdido: $marca" >&2; }
done
afirmar "los bloques que ningun gate cubre siguen en el audit" 0 "$FALTAN"

# --- 4. el alcance sube de 35 a los 47 del registro -------------------------
DECLARADOS="$(cd "$THYROX" && python3 -c "
import sys; sys.path.insert(0,'src')
from gates import registry; print(len(registry.CHECKS))")"
SAL="$(cd "$THYROX" && python3 src/gates/doctor.py --list 2>/dev/null | wc -l)"
afirmar "el corredor alcanza los gates que el registro declara" "$DECLARADOS" "$SAL"

printf '\ntest-audit-delegates: %d ok, %d falla\n' "$ok" "$fallo"
[[ "$fallo" -eq 0 ]]
