#!/bin/bash
# Anulacion de la rama `Z*` de job_alive. Retira la causa y mide que aserciones
# caen. Restaura y comprueba identidad byte a byte contra el pristino.
set -uo pipefail
RAIZ=/home/user/thyrox
OBJETIVO="$RAIZ/src/session/wait-jobs.sh"
RUN="$1"
PRISTINO="$RUN/probes/wait-jobs.pristine.sh"

corre() { bash "$RAIZ/tests/session/test-process-group.sh" 2>&1; }

echo "== BASE =="
corre | tail -1

echo
echo "== ANULADO: se retira \`Z*\` del case de job_alive =="
python3 - "$OBJETIVO" <<'PYMUT'
import pathlib, sys
p = pathlib.Path(sys.argv[1]); t = p.read_text()
viejo = """        case "$estado" in ''|Z*) continue ;; esac"""
nuevo = """        case "$estado" in '') continue ;; esac"""
assert t.count(viejo) == 1, f"ocurrencias={t.count(viejo)}"
p.write_text(t.replace(viejo, nuevo))
print("  mutado: la rama Z* ya no descarta")
PYMUT
corre | sed 's/^/  /'

echo
echo "== RESTAURADO =="
cp "$PRISTINO" "$OBJETIVO"
if cmp -s "$PRISTINO" "$OBJETIVO"; then echo "  identico al pristino: si"; else echo "  IDENTICO: NO"; fi
corre | tail -1
