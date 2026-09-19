#!/usr/bin/env bash
# test-reach-pythonpath.sh — la raiz de IMPORTACION que `reach.sh` declara.
#
# `test-reach-sh.sh` cubre otro eje: donde esta thyrox. Este cubre si sus
# modulos se pueden IMPORTAR desde un guion que ya sabe donde esta — que es
# una pregunta distinta y quedo sin dueño.
#
# El defecto que cierra, medido: `aa20229e` retiro 109 `sys.path.insert` de
# `src/` sobre la premisa de que «bin/ declara la raiz». La premisa se sostiene
# en UNA de las tres superficies de invocacion:
#
#   | superficie                     | declara PYTHONPATH | veredicto |
#   |--------------------------------|--------------------|-----------|
#   | `bin/<envoltorio>`             | si                 | funciona  |
#   | `tests/run.sh`, `.githooks/`   | si                 | funciona  |
#   | `python3 src/<x>.py` desde .sh | NO                 | muere     |
#
# La tercera es la de PRODUCCION: cinco guiones de `src/` invocan asi un modulo
# que importa un hermano, y `clone_bootstrap.py` —el que corre un clon nuevo—
# es uno de ellos. El fallo no es silencioso, es ruidoso y completo:
# `ModuleNotFoundError: No module named 'paths'`.
#
# El caso que DISCRIMINA es el 2: sin `source reach.sh` el mismo modulo tiene
# que seguir muriendo. Sin el, un `reach.sh` que no exportara nada pasaria el
# caso 3 en cuanto el corredor exportara PYTHONPATH por su cuenta — que es
# exactamente como este defecto sobrevivio: la suite entera corre bajo
# `run.sh`, que lo declara, asi que ninguna prueba veia el agujero.
set -uo pipefail

AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RAIZ="$(cd "$AQUI/../.." && pwd)"
GUION="$RAIZ/src/lib/reach.sh"
source "$RAIZ/src/lib/assert.sh"
ok()  { thyrox_ok "$*"; }
bad() { thyrox_fail "$*" || true; }

#: Sujeto REAL del arbol, no fabricado (`hallazgo-abierto-genera-sucesor.md`):
#: es el modulo que `src/verify/install-hooks.sh` invoca al preparar un clon.
MODULO="src/session/clone_bootstrap.py"

echo "=== Caso 1: el guion existe y parsea ==="
if [[ -f "$GUION" ]] && bash -n "$GUION" 2>/dev/null; then ok "parsea"
else bad "ausente o con error de sintaxis"; fi

echo "=== Caso 2 (EL QUE DISCRIMINA): sin reach.sh el modulo real MUERE ==="
# `env -u PYTHONPATH` porque esta suite corre bajo `run.sh`, que lo exporta:
# sin limpiarlo, el caso 3 pasaria por el corredor y no por el sujeto.
salida="$(cd "$RAIZ" && env -u PYTHONPATH python3 "$MODULO" --help 2>&1)"
if grep -q "ModuleNotFoundError" <<<"$salida"; then
  ok "sin la declaracion, $MODULO no importa su hermano"
else
  bad "el modulo ya no necesita la declaracion: el caso 3 dejo de discriminar"
fi

echo "=== Caso 3: tras sourcear reach.sh, ese mismo modulo arranca ==="
salida="$(cd "$RAIZ" && env -u PYTHONPATH bash -c \
  "source '$GUION' && python3 '$MODULO' --help" 2>&1)"
if grep -q "ModuleNotFoundError" <<<"$salida"; then
  bad "sigue muriendo: $(tail -1 <<<"$salida")"
else
  ok "el modulo importa su hermano"
fi

echo "=== Caso 4: el prepend NO pisa lo que el llamador ya traia ==="
got="$(env PYTHONPATH="/sonda-del-llamador" bash -c \
  "source '$GUION' >/dev/null 2>&1; printf '%s' \"\$PYTHONPATH\"" 2>&1)"
if [[ "$got" == "$RAIZ/src:/sonda-del-llamador" ]]; then
  ok "src va delante y lo del llamador sobrevive"
else
  bad "prepend mal compuesto: '$got' (se esperaba '$RAIZ/src:/sonda-del-llamador')"
fi

echo "=== Caso 5: dos source no duplican la entrada ==="
got="$(env -u PYTHONPATH bash -c \
  "source '$GUION' >/dev/null 2>&1; source '$GUION' >/dev/null 2>&1
   printf '%s' \"\$PYTHONPATH\"" 2>&1)"
if [[ "$got" == "$RAIZ/src" ]]; then ok "el guard de doble inclusion lo cubre"
else bad "duplicado o mal compuesto: '$got'"; fi

echo "=== Caso 6: 0 guiones de PRODUCCION invocan un modulo que no podran importar ==="
# El universo se DERIVA, no se transcribe: la lista a mano caduca en cuanto
# alguien añade un modulo o un guion (`calibration-verified-numbers.md`).
#
# Metrica: guiones de `src/` y `.githooks/` que INVOCAN (no solo citan) un
# modulo que importa un hermano de primer nivel sin abrirse el camino, y que
# no declaran cobertura —export explicito o `source reach.sh`— ANTES de esa
# linea.
# Ciega a: que la declaracion sea EFECTIVA en tiempo de ejecucion. Mide el
# orden en el texto, no la conducta: un `source` dentro de un `if` que no se
# cumple, o un `unset PYTHONPATH` posterior, contarian como cobertura. El
# ancla de conducta es el caso 3, que ejerce el mecanismo de verdad; este caso
# mide que cada guion lo declare. Ciega tambien a una invocacion compuesta por
# una variable que este patron no reconstruye.
descubiertos="$(cd "$RAIZ" && python3 - <<'PY'
import pathlib, re, sys

raiz = pathlib.Path.cwd()
src = raiz / "src"
paquetes = sorted(p.name for p in src.iterdir() if p.is_dir())
importa = re.compile(r"^(?:from|import) (%s)(?:[. ]|$)" % "|".join(paquetes), re.M)

#: Modulos que EXIGEN la declaracion: importan un hermano de primer nivel y
#: ya no se abren el camino solos.
exigen = set()
for f in src.rglob("*.py"):
    texto = f.read_text(encoding="utf-8", errors="replace")
    if importa.search(texto) and "sys.path.insert" not in texto:
        exigen.add(str(f.relative_to(raiz)))

cita = re.compile(r"src/[a-z_]+/[a-z_0-9]+\.py")
sin_cobertura = []
for guion in sorted(list(src.rglob("*.sh")) + list((raiz / ".githooks").glob("*"))):
    if not guion.is_file():
        continue
    lineas = guion.read_text(encoding="utf-8", errors="replace").splitlines()

    #: La cobertura se declara en DOS formas, y las dos valen: el export
    #: explicito, o `source reach.sh`, que es el mecanismo que lo exporta.
    #: Se mide su LINEA, no su presencia: un export posterior a la invocacion
    #: no cubre nada, y un `in texto` no puede ver ese orden.
    cubre_en = None
    for n, linea in enumerate(lineas, 1):
        if "export PYTHONPATH" in linea or re.search(r"source .*reach\.sh", linea):
            cubre_en = n
            break

    tocados = []
    for n, linea in enumerate(lineas, 1):
        for m in cita.findall(linea):
            #: Solo cuenta la INVOCACION, no la asignacion a una variable:
            #: `STORE_CLI="$RAIZ/src/agents/agent_store.py"` no ejecuta nada.
            if m in exigen and re.search(r"python3?\b", linea):
                if cubre_en is None or n < cubre_en:
                    tocados.append(m)
    if tocados:
        sin_cobertura.append("%s -> %s" % (guion.relative_to(raiz), ", ".join(sorted(set(tocados)))))

print("\n".join(sin_cobertura))
print("__TOTAL__=%d __UNIVERSO__=%d" % (len(sin_cobertura), len(exigen)))
PY
)"
total="$(sed -n 's/.*__TOTAL__=\([0-9]*\).*/\1/p' <<<"$descubiertos")"
universo="$(sed -n 's/.*__UNIVERSO__=\([0-9]*\).*/\1/p' <<<"$descubiertos")"
if [[ "$total" == "0" ]]; then
  ok "0 guiones de produccion sin cobertura (universo medido: $universo modulos)"
else
  bad "$total guion(es) de produccion invocan un modulo que no podran importar:"
  grep -v '__TOTAL__' <<<"$descubiertos" | sed 's/^/        /' >&2
fi

thyrox_summary
