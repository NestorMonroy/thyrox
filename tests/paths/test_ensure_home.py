#!/usr/bin/env python3
"""Un hogar DECLARADO y ausente se crea; uno NO declarado sigue rehusando.

El defecto que cierra, medido por conducta en
`.claude/workbench/hogar-ausente-se-crea-*`: los cuatro resolutores devolvian
la ruta declarada sin crearla, y un listado sobre ella daba **0 entradas** en
vez de un error. Ese cero es indistinguible de «el hogar esta vacio» — el
sub-patron D de `metrica-decide-la-conclusion.md`, con el hogar como sujeto.

La mitad que NO cambia, y es la que hace segura la otra: un hogar **sin
declarar** sigue rehusando. Crear lo declarado satisface una precondicion;
inventar un default seria tomar una decision del consumidor, que es lo que
DEC-04 reserva para el consumidor.
"""
import os
import pathlib
import sys
import tempfile

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "src"))

from session.background import LogHomeError, log_dir          # noqa: E402
from cache.paths import cache_dir                             # noqa: E402
from session.job_runs import jobs_dir                         # noqa: E402
from workbench.paths import workbench_dir                     # noqa: E402

OK = 0
FAILED = 0


def check(label, expected, got):
    global OK, FAILED
    if expected == got:
        OK += 1
        print(f"  ok    {label}")
    else:
        FAILED += 1
        print(f"  FALLO {label}\n        esperado=[{expected}] obtenido=[{got}]")


RESOLVERS = (
    ("THYROX_BACKGROUND_LOG_DIR", "log_dir", log_dir),
    ("THYROX_CACHE_DIR", "cache_dir", cache_dir),
    ("THYROX_JOBS_DIR", "jobs_dir", jobs_dir),
    ("THYROX_WORKBENCH_DIR", "workbench_dir", workbench_dir),
)


def declared(var, value):
    """Declara `var` en el proceso y la retira al salir."""
    previous = os.environ.get(var)
    os.environ[var] = str(value)
    return previous


def restore(var, previous):
    if previous is None:
        os.environ.pop(var, None)
    else:
        os.environ[var] = previous


print("== 1. el hogar declarado y AUSENTE existe tras resolverlo ==")
for var, name, resolver in RESOLVERS:
    with tempfile.TemporaryDirectory() as tmp:
        absent = pathlib.Path(tmp) / "no" / "existe" / name
        previous = declared(var, absent)
        try:
            resolved = pathlib.Path(resolver())
            check(f"{name} crea su hogar declarado", True, resolved.exists())
            check(f"{name} crea la cadena de padres", True,
                  resolved.parent.exists())
        finally:
            restore(var, previous)

print()
print("== 2. es IDEMPOTENTE: resolver dos veces no falla ==")
for var, name, resolver in RESOLVERS:
    with tempfile.TemporaryDirectory() as tmp:
        absent = pathlib.Path(tmp) / "dos" / "veces"
        previous = declared(var, absent)
        try:
            resolver()
            second = "sin excepcion"
            try:
                resolver()
            except Exception as exc:                 # noqa: BLE001
                second = f"{type(exc).__name__}: {exc}"
            check(f"{name} resuelto dos veces", "sin excepcion", second)
        finally:
            restore(var, previous)

print()
print("== 3. GUARDA: un hogar SIN declarar sigue rehusando, no se inventa ==")
# `log_dir` es el unico de los cuatro que rehusa cuando nadie declara; los
# otros tres componen su hogar desde una raiz. Medirlo sobre el que rehusa es
# lo que discrimina «crear lo declarado» de «inventar un default».
saved = {var: os.environ.pop(var, None)
         for var in ("THYROX_BACKGROUND_LOG_DIR",
                     "THYROX_BACKGROUND_LOG_CLONE_THYROX")}
try:
    with tempfile.TemporaryDirectory() as tmp:
        verdict = "no rehuso"
        try:
            log_dir(start=tmp)
        except LogHomeError:
            verdict = "rehusa"
        check("log_dir sin declaracion sigue rehusando", "rehusa", verdict)
finally:
    for var, previous in saved.items():
        restore(var, previous)

print()
print(f"resultado: {OK} de {OK + FAILED} aserciones en verde")
sys.exit(0 if FAILED == 0 else 1)
