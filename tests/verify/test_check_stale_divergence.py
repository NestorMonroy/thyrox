"""Suite de `check_stale_divergence`: separa la ausencia declarada de la
decision de diseno, y mide si la ausencia sigue siendo cierta.

Los controles positivos son bloques REALES del arbol, no fabricados: un
incumplidor inventado por quien escribe el patron hereda su encuadre.
"""

import pathlib
import sys

# El `parents[2]` alimenta el bootstrap de `sys.path` y NADA mas: es la forma
# que `check_path_arithmetic` admite. La raiz que el CUERPO usa sale del
# localizador, porque ahi cruza la distribucion — una ruta compuesta por
# aritmetica caduca en cuanto el archivo se mueve (tarea #228).
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "src"))

from paths.reach import thyrox_root  # noqa: E402
from verify.check_stale_divergence import (  # noqa: E402
    Verdict,
    classify_block,
    extract_referent,
    extract_referents,
    resolves_today,
)

ROOT = thyrox_root()

failures = []


def check(label, condition):
    print(f"  {'OK  ' if condition else 'FALLO'}  {label}")
    if not condition:
        failures.append(label)


print("=== Caso 1: una ausencia declarada se reconoce como tal ===")
check(
    "«que no esta en este arbol» es ABSENCE",
    classify_block("la fuente toma `sample` de `lodash-es`, que no esta "
                   "en este arbol") is Verdict.ABSENCE,
)
check(
    "«ausente de este arbol» es ABSENCE",
    classify_block("la fuente la importa de `@thyrox/output/utils/"
                   "stringUtils.js`, ausente de este arbol") is Verdict.ABSENCE,
)

print("=== Caso 2 (EL QUE DISCRIMINA): una decision de diseno NO es ausencia ===")
check(
    "«BLOQUEADO por diseno» es DESIGN",
    classify_block("ese modulo es UI (react/ink) y queda BLOQUEADO por "
                   "diseno (TASK-THYROX-0006)") is Verdict.DESIGN,
)
check(
    "«es un PARAMETRO» es DESIGN",
    classify_block("la lista de variables reenviadas es un PARAMETRO. La "
                   "fuente lleva incrustadas las claves") is Verdict.DESIGN,
)
check(
    # SINTETICO, y declarado: medido sobre el corpus, CERO bloques reales
    # llevan las dos frases. Sin este caso la rama de diseno no la ejercita
    # nada y la anulacion no discrimina -- se comprobo, y salio verde.
    "con AMBAS frases gana diseno, no ausencia",
    classify_block("queda BLOQUEADO por diseno; ademas `X` no esta en "
                   "este arbol") is Verdict.DESIGN,
)
check(
    "«ninguna» es NONE",
    classify_block("ninguna.") is Verdict.NONE,
)

print("=== Caso 3: el referente sale del bloque, y es el que la ausencia nombra ===")
check(
    "extrae el especificador de paquete",
    extract_referent("la fuente la importa de `@thyrox/output/utils/"
                     "stringUtils.js`, ausente de este arbol")
    == "@thyrox/output/utils/stringUtils.js",
)
check(
    "extrae el paquete externo, no el simbolo que lo precede",
    extract_referent("la fuente toma `sample` de `lodash-es`, que no esta "
                     "en este arbol") == "lodash-es",
)

print("=== Caso 4: la vigencia se mide contra el arbol, no se supone ===")
check(
    "un subpath declarado por un hermano RESUELVE hoy",
    resolves_today("@thyrox/output/utils/stringUtils.js", ROOT) is True,
)
check(
    "un paquete que el arbol declara ausente y SI esta, resuelve",
    resolves_today("lodash-es", ROOT) is True,
)
check(
    "un especificador genuinamente ausente NO resuelve",
    resolves_today("bun:bundle", ROOT) is False,
)
check(
    "un simbolo exportado por un hermano RESUELVE",
    resolves_today("Progress", ROOT) is True,
)

print("=== Caso 4-bis: las dos cegueras que el censo destapo ===")
check(
    "el alcance PRE-renombre resuelve contra el nombre de hoy",
    resolves_today("@claude-code-how-works/output/utils/displayTags.js", ROOT)
    is True,
)
check(
    "nombra el contenedor Y el simbolo; se devuelven los dos",
    extract_referents("`Progress` vive en `tool-registry`, ausente de este "
                      "arbol") == ["tool-registry", "Progress"],
)

print("=== Caso 5: rehusa en vez de publicar un cero ===")
check(
    "sin referente extraible, INDECIDIBLE y no False",
    extract_referent("ausente de este arbol") is None,
)

print()
print(f"{len(failures)} fallo(s)" if failures else "todos en verde")
sys.exit(1 if failures else 0)
