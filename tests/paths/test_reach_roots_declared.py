#!/usr/bin/env python3
"""El ROSTER de raices de trabajo se declara o se deriva — nunca se codifica.

Mitad ROJA escrita antes del mecanismo. ``REACH_ROOTS`` es hoy una tupla
literal con los nombres de ESTE multi-repo dentro del modulo que resuelve
CUALQUIERA, asi que estos casos fallan al correrlos.

Es el gemelo exacto de ``derive_clone_prefix``: aquel saco el literal
``"kaupamex-"`` del mecanismo y dejo el roster dentro. Un proveedor que sabe
componer el nombre de un clon pero lleva escritos los cinco nombres de un
consumidor concreto sigue sirviendo a uno solo.

CONTROL DE ANULACION: el caso 6 deriva sobre un arbol FABRICADO cuyos hermanos
no se llaman como los de aqui. Si el mecanismo volviera a la tupla literal,
ese caso cae y los demas —que miden el arbol real— seguirian en verde. Sin el,
el verde no distinguiria «deriva» de «acerto por casualidad».
"""
from __future__ import annotations

import atexit
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from paths import reach  # noqa: E402

OK = 0
FAILED = 0


def check(label: str, expected, obtained) -> None:
    global OK, FAILED
    if expected == obtained:
        print(f"  ok    {label}")
        OK += 1
    else:
        print(f"  FALLO {label}\n        esperado=[{expected}] obtenido=[{obtained}]")
        FAILED += 1


#: Los fixtures de esta suite son TEMPORALES, no bancos de evidencia. Vivian
#: sueltos bajo `reach.scratch_root()` y nadie los borraba, asi que el gate del
#: proveedor los leia como bancos emitidos dentro del arbol del PROVEEDOR y
#: detenia el commit. Es el mismo significante —un directorio bajo
#: `.claude/eventos`— con dos significados distintos; lo que faltaba era
#: separarlos, no mover el hogar.
#:
#: `dir=` los mantiene bajo el scratch declarado (nunca `/tmp`, #166) y el
#: `atexit` los retira aunque un caso falle. Las otras cuatro suites que piden
#: scratch ya usaban `TemporaryDirectory`; esta era la unica que no.
_SCRATCH = tempfile.mkdtemp(prefix="reach-roots-", dir=str(reach.scratch_root()))
atexit.register(shutil.rmtree, _SCRATCH, ignore_errors=True)


def fixture(name: str) -> Path:
    """Un directorio de fixture bajo el scratch efimero de esta suite."""
    return Path(_SCRATCH) / name


def with_env(vars: dict[str, str | None], fn):
    """Corre ``fn`` con el entorno alterado y lo restaura pase lo que pase."""
    previous = {k: os.environ.get(k) for k in vars}
    for k, v in vars.items():
        if v is None:
            os.environ.pop(k, None)
        else:
            os.environ[k] = v
    try:
        return fn()
    finally:
        for k, v in previous.items():
            if v is None:
                os.environ.pop(k, None)
            else:
                os.environ[k] = v


print("== 1. la constante nombra la variable ==")
check("nombra THYROX_REACH_ROOTS", "THYROX_REACH_ROOTS", reach.REACH_ROOTS_VAR)

print("== 2. entrada A — la variable del proceso gana ==")
with_env({"THYROX_REACH_ROOTS": "alpha,beta,gamma", "THYROX_ENV_FILE": None},
         lambda: check("lee la lista declarada", ("alpha", "beta", "gamma"),
                       reach.reach_roots()))
with_env({"THYROX_REACH_ROOTS": " alpha , beta ", "THYROX_ENV_FILE": None},
         lambda: check("recorta el espacio alrededor de cada nombre",
                       ("alpha", "beta"), reach.reach_roots()))

print("== 3. entrada B — la declaracion del .env cuando el proceso calla ==")
scratch = fixture("reach-roots-env")
scratch.mkdir(parents=True, exist_ok=True)
env_file = scratch / ".env"
env_file.write_text("THYROX_REACH_ROOTS=uno,dos\n")
with_env({"THYROX_REACH_ROOTS": None, "THYROX_ENV_FILE": str(env_file)},
         lambda: check("lee la declaracion del archivo", ("uno", "dos"),
                       reach.reach_roots()))

print("== 4. el proceso gana sobre el .env ==")
with_env({"THYROX_REACH_ROOTS": "gana", "THYROX_ENV_FILE": str(env_file)},
         lambda: check("la invocacion corrige al archivo", ("gana",),
                       reach.reach_roots()))

print("== 5. sin declaracion, DERIVA del arbol real ==")
vacio = fixture("sin-declaracion")
vacio.mkdir(parents=True, exist_ok=True)
(vacio / ".env").write_text("")
with_env({"THYROX_REACH_ROOTS": None, "THYROX_ENV_FILE": str(vacio / ".env")},
         lambda: check("deriva los cinco hermanos de este arbol",
                       ("api", "db", "docs", "server", "ui"),
                       reach.reach_roots()))

print("== 6. CONTROL DE ANULACION: deriva sobre un arbol que NO es este ==")
# Si el mecanismo volviera al literal, este es el unico caso que lo delata.
otro = fixture("otro-multirepo")
for hermano in ("foo-alpha", "foo-beta", "foo-gamma", "thyrox"):
    (otro / hermano).mkdir(parents=True, exist_ok=True)
(otro / "sin-guion").mkdir(parents=True, exist_ok=True)
with_env({"THYROX_REACH_ROOTS": None, "THYROX_ENV_FILE": str(vacio / ".env")},
         lambda: check("deriva alpha/beta/gamma, no los de aqui",
                       ("alpha", "beta", "gamma"),
                       reach.reach_roots(start=otro / "thyrox")))

print("== 7. el atributo REACH_ROOTS sigue resolviendo (6 consumidores) ==")
with_env({"THYROX_REACH_ROOTS": None, "THYROX_ENV_FILE": str(vacio / ".env")},
         lambda: check("el nombre historico devuelve lo mismo que la funcion",
                       reach.reach_roots(), reach.REACH_ROOTS))

print("== 8. sin declaracion NI derivacion posible, REHUSA ==")
solo = fixture("sin-hermanos") / "thyrox"
solo.mkdir(parents=True, exist_ok=True)
def _rehusa():
    try:
        reach.reach_roots(start=solo)
    except reach.ReachRootError as e:
        return "REHUSA:" + ("nombra la variable" if reach.REACH_ROOTS_VAR in str(e)
                            else "sin nombrarla")
    except KeyError as e:
        return "REHUSA:" + ("nombra la variable" if reach.REACH_ROOTS_VAR in str(e)
                            else "sin nombrarla")
    return "no rehuso"
with_env({"THYROX_REACH_ROOTS": None, "THYROX_ENV_FILE": str(vacio / ".env")},
         lambda: check("rehusa nombrando la variable",
                       "REHUSA:nombra la variable", _rehusa()))

print(f"\n{OK} ok, {FAILED} fallos")
raise SystemExit(1 if FAILED else 0)
