#!/usr/bin/env bash
# Cada guarda del envoltorio tumba EXACTAMENTE lo que depende de ella.
# NO BORRA: restaura el fuente y regenera bin/ al salir, pase lo que pase.
set -uo pipefail
cd "${THYROX_ROOT:-/home/user/thyrox}" || exit 2
SUT=src/verify/commit-msg-citation.sh
COPIA="$(mktemp)"; cp "$SUT" "$COPIA"
limpiar() { cp "$COPIA" "$SUT"; rm -f "$COPIA"; }
trap limpiar EXIT

corre() { bash tests/verify/test-commit-msg-citation.sh 2>&1 | tail -1; }

echo "== 0. SIN anular — la linea base =="; corre

echo; echo "== 1. el cubo 0|1 anulado: el aviso pasa a ser un 1 que aborta =="
# Es la forma de la GRADUACION, y aqui se mide como anulacion: con el 1 fuera
# del cubo, el hook del consumidor caeria por deuda heredada bajo set -e.
cp "$COPIA" "$SUT"
sed -i 's/^    0|1) exit 0 ;;.*/    0) exit 0 ;;/' "$SUT"
corre

echo; echo "== 2. la refusal del gate ausente anulada: devuelve 0 =="
cp "$COPIA" "$SUT"
python3 - "$SUT" <<'PY'
import re, sys, pathlib
p = pathlib.Path(sys.argv[1]); t = p.read_text(encoding="utf-8")
t = re.sub(r'if \[\[ ! -x "\$GATE" \]\]; then.*?\nfi\n', '', t, flags=re.S)
p.write_text(t, encoding="utf-8")
PY
corre

echo; echo "== 3. el guard del mensaje ausente anulado =="
cp "$COPIA" "$SUT"
python3 - "$SUT" <<'PY'
import re, sys, pathlib
p = pathlib.Path(sys.argv[1]); t = p.read_text(encoding="utf-8")
t = re.sub(r'if \[\[ -z "\$MENSAJE" \]\]; then.*?\nfi\n', '', t, flags=re.S)
p.write_text(t, encoding="utf-8")
PY
corre
