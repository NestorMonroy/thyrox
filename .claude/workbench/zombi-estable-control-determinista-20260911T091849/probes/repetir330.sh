#!/bin/bash
# La pregunta de #330 es la INTERMITENCIA. Una sola corrida no la responde:
# se repite la anulacion y se exige el MISMO conjunto de caidas cada vez.
set -uo pipefail
RAIZ=/home/user/thyrox
OBJETIVO="$RAIZ/src/session/wait-jobs.sh"
PRISTINO="$1/probes/wait-jobs.pristine.sh"
python3 - "$OBJETIVO" <<'PYMUT'
import pathlib, sys
p = pathlib.Path(sys.argv[1]); t = p.read_text()
viejo = """        case "$estado" in ''|Z*) continue ;; esac"""
p.write_text(t.replace(viejo, """        case "$estado" in '') continue ;; esac"""))
PYMUT
for i in 1 2 3; do
    printf 'rep%s  ' "$i"
    bash "$RAIZ/tests/session/test-process-group.sh" 2>&1 \
        | awk '/^  FALLA/ {sub(/ — esperado.*/,""); sub(/^  FALLA /,""); f=f"; "$0}
               /aserciones/ {print $0 "  CAEN:" (f==""?" ninguna":f)}'
done
cp "$PRISTINO" "$OBJETIVO"
cmp -s "$PRISTINO" "$OBJETIVO" && echo "restaurado: identico" || echo "restaurado: NO IDENTICO"
