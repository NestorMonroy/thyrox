#!/usr/bin/env bash
# Las tres guardas del gate, anuladas una a una.
#
# Cada una tiene que derribar EXACTAMENTE las aserciones que dependen de ella.
# Si al quitarle la causa el veredicto no cambia, la guarda no estaba midiendo
# la causa — sub-patron D de `metrica-decide-la-conclusion.md`.
#
# El bytecode se borra entre pases: restaurar el fuente NO restaura el
# __pycache__, y el interprete leeria la version mutada con el fuente ya sano.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)"
SUJETO=src/verify/citation_resolution.py
HERMANO=src/verify/commit_message.py
SUITE=tests/verify/test_citation_resolution.py
RESPALDO=$(mktemp -d)
cp "$SUJETO" "$RESPALDO/sujeto.py"
cp "$HERMANO" "$RESPALDO/hermano.py"
limpiar() {
    cp "$RESPALDO/sujeto.py" "$SUJETO"
    cp "$RESPALDO/hermano.py" "$HERMANO"
    find src tests -name __pycache__ -type d -exec rm -rf {} + 2>/dev/null
    rm -rf "$RESPALDO"
}
trap limpiar EXIT

medir() {
    find src tests -name __pycache__ -type d -exec rm -rf {} + 2>/dev/null
    python3 "$SUITE" 2>&1 | tail -1
}

echo "== 0. SIN anular — la linea base =="
medir

echo
echo "== 1. la resolucion contra el store, anulada: todo resuelve =="
python3 - <<'PY'
import pathlib
p = pathlib.Path('src/verify/citation_resolution.py')
t = p.read_text()
t = t.replace('    unresolved = [citation for citation in cited if citation not in known]',
              '    unresolved = []  # ANULADA')
p.write_text(t)
PY
medir
cp "$RESPALDO/sujeto.py" "$SUJETO"

echo
echo "== 2. el descuento de lineas de comentario, anulado =="
python3 - <<'PY'
import pathlib
p = pathlib.Path('src/verify/commit_message.py')
t = p.read_text()
t = t.replace('''    return "\\n".join(
        "" if line.startswith("#") else line for line in text.splitlines()
    )''', '    return text  # ANULADA')
p.write_text(t)
PY
medir
cp "$RESPALDO/hermano.py" "$HERMANO"

echo
echo "== 3. la refusal sin store, anulada: devuelve mapa vacio =="
python3 - <<'PY'
import pathlib
p = pathlib.Path('src/verify/citation_resolution.py')
t = p.read_text()
t = t.replace('        raise StoreUnavailable(str(error)) from error',
              '        return {}  # ANULADA')
p.write_text(t)
PY
medir
