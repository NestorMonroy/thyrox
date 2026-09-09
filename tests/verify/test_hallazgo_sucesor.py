"""Pruebas del gate de `hallazgo-abierto-genera-sucesor`.

Porte de ``tests/legacy/test-hallazgo-sucesor.sh``, que quedo en rojo tras el
traslado a thyrox: componia su raiz con ``dirname($BASH_SOURCE)/..`` y buscaba
el gate en ``<eso>/gates/``, la ruta previa. Aqui la raiz se pide al mecanismo
de alcance (``paths.reach``) en vez de contarse en niveles.

Lo que su inercia escondia, y es el motivo de portarla primero
---------------------------------------------------------------
Este gate ha fallado **ocho veces por su instrumento** —sus propios comentarios
y su regla las enumeran—, y la suite existe justamente para ser su red. Medida
en su estado roto daba ``1 ok, 10 falla(s)``, y ese unico ``ok`` es el dato
incomodo: era la asercion «y NO emite cifra alguna», que pasaba porque el gate
no se encontraba y por tanto no imprimia nada. Un verde por la razon
equivocada, dentro de una suite que no medía nada.

Los positivos son REALES, del arbol del consumidor
---------------------------------------------------
Tres casos leen hallazgos que existen en ``kaupamex-docs``: el cierre en
parrafo aparte que el gate marcaba (caso 1), su denominador publicado (caso 7) y
el hallazgo que cita **solo** la forma durable ``TASK-<CAPA>-NNNN`` (caso 8),
ante el que el gate era ciego justo a la cita mejor. Un incumplidor fabricado
por quien escribio el patron hereda su encuadre y confirma el instrumento en vez
de probarlo.

El caso 9 es el control que discrimina
---------------------------------------
Con un ``awk`` que revienta —el octavo defecto: mawk 1.3.4 ante un cuantificador
de intervalo seguido de grupo— el gate NO puede salir 0. Tiene que rehusar con
exit 2 y sin cifra: un patron que no compila deja el conteo en 0 y ese 0 se lee
como salud. El doble reproduce la conducta real (mensaje a stderr, exit 100).
"""
from __future__ import annotations

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


GATE = reach.thyrox_root() / "src" / "verify" / "check-hallazgo-sucesor.sh"
DOCS = reach.root("docs")
CIERRE_REAL = (DOCS / "source/gestion/pm/docs/iniciativas"
               / "unificar-trabajo-en-rama-kaupamex-l1/hallazgos"
               / "hallazgo-H-DOCS-439-el-valor-por-omision-se-ataba-como-declaracion.rst")
CITA_DURABLE = (DOCS / "source/gestion/pm/docs/iniciativas"
                / "construir-harness-propio/hallazgos"
                / "hallazgo-H-DOCS-1061-pushe-al-mismo-repo-y-el-amend-del-agente-reescribio-mi-commit.rst")

if not GATE.is_file():
    print(f"REHUSA — el gate no esta en {GATE}. No se emite conteo: un 0 aqui "
          f"no distinguiria «sin incumplidores» de «no medi nada».")
    raise SystemExit(2)

for fuente in (CIERRE_REAL, CITA_DURABLE):
    if not fuente.is_file():
        print(f"REHUSA — el control positivo real no esta en {fuente}.\n"
              f"Es evidencia del consumidor, resuelta por `paths.reach`. Sin ella "
              f"solo quedaria un incumplidor fabricado, que confirma el patron en "
              f"vez de probarlo. No se emite conteo.")
        raise SystemExit(2)

CABECERA = (".. meta::\n   :estado: {estado}\n\n"
            "H-DOCS-1 — caso\n===============\n\n- **Estado:** {visible}\n\n")


def montar(cuerpo: str) -> Path:
    """Un arbol sintetico con UN hallazgo. El gate opera desde la raiz git."""
    d = Path(tempfile.mkdtemp(prefix="sucesor-"))
    destino = d / "source/gestion/pm/docs/iniciativas/x/hallazgos"
    destino.mkdir(parents=True)
    (destino / "hallazgo-H-DOCS-1-caso.rst").write_text(cuerpo, encoding="utf-8")
    subprocess.run(["git", "-C", str(d), "init", "-q"], check=True)
    return d


def correr(raiz: Path, *args: str, env: dict | None = None) -> tuple[int, str]:
    hecho = subprocess.run(["bash", str(GATE), *args], cwd=raiz,
                           capture_output=True, text=True, env=env)
    return hecho.returncode, hecho.stdout.strip()


def conteo(raiz: Path) -> str:
    return correr(raiz, "--quiet")[1]


print("== 1. CONTROL POSITIVO REAL: cierre en parrafo aparte NO es apertura ==")
# El texto sale del hallazgo real que el gate marcaba, no de uno fabricado.
real = CIERRE_REAL.read_text(encoding="utf-8")
seccion = real[real.index("Lo que este hallazgo no cierra"):]
d = montar(CABECERA.format(estado="resuelto", visible="RESUELTO") + seccion)
check("cierre en parrafo aparte NO cuenta como apertura", "0", conteo(d))
shutil.rmtree(d)

print("== 2. CONTROL NEGATIVO: la misma seccion, abriendo de verdad ==")
d = montar(CABECERA.format(estado="resuelto", visible="RESUELTO")
           + "Lo que este hallazgo no cierra\n-------------------------------\n\n"
             "El barrido del resto del arbol queda pendiente y nadie lo tiene asignado.")
check("apertura real sin sucesor SI se marca", "1", conteo(d))
shutil.rmtree(d)

print("== 3. la misma apertura, con sucesor citado ==")
d = montar(CABECERA.format(estado="resuelto", visible="RESUELTO")
           + "Lo que este hallazgo no cierra\n-------------------------------\n\n"
             "El barrido del resto del arbol queda pendiente. Sucesor: tarea **#910**.")
check("apertura con #NNN no se marca", "0", conteo(d))
shutil.rmtree(d)

print("== 4. la forma inline que el sexto arreglo introdujo ==")
d = montar(CABECERA.format(estado="resuelto", visible="RESUELTO")
           + "**Lo que este hallazgo no cierra:** nada del alcance declarado.")
check("cierre inline sigue descontandose", "0", conteo(d))
shutil.rmtree(d)

print("== 5. el estado estructural manda sobre la prosa ==")
d = montar(CABECERA.format(estado="documentado", visible="DOCUMENTADO"))
check("estado documentado sin sucesor SI se marca", "1", conteo(d))
shutil.rmtree(d)

print("== 6. sin arbol que medir NO sale verde ==")
vacio = Path(tempfile.mkdtemp(prefix="sucesor-vacio-"))
subprocess.run(["git", "-C", str(vacio), "init", "-q"], check=True)
check("sin arbol que medir sale 2, no 0", 2, correr(vacio)[0])
shutil.rmtree(vacio)

print("== 7. el reporte publica su denominador ==")
import re  # noqa: E402
salida = correr(DOCS)[1]
check("el reporte publica su denominador", True,
      bool(re.search(r"alcance medido: \d+ de \d+", salida)))

print("== 8. CONTROL POSITIVO REAL: la cita durable TASK-<CAPA>-NNNN ==")
fuente = CITA_DURABLE.read_text(encoding="utf-8")
check("el control positivo real NO cita ningun #NNN", 0,
      len(re.findall(r"#[0-9]+|T-[0-9]{3}|sub-iniciativa|DESCONOCIDO", fuente)))
d = montar(fuente)
check("cita TASK-<CAPA>-NNNN cuenta como sucesor", "0", conteo(d))
shutil.rmtree(d)

print("== 9. ANULACION: con un awk que no compila, el gate REHUSA ==")
# Sin este control, un patron que no compila deja el conteo en 0 y ese 0 se lee
# como salud: el verde no distinguiria «sin incumplidores» de «no pude medir».
stub = Path(tempfile.mkdtemp(prefix="awk-roto-"))
(stub / "awk").write_text(
    '#!/bin/sh\necho "REcompile() - panic:  values still on machine stack" >&2\nexit 100\n')
(stub / "awk").chmod(0o755)
entorno = dict(os.environ, PATH=f"{stub}:{os.environ['PATH']}")
d = montar(CABECERA.format(estado="resuelto", visible="RESUELTO"))
codigo, salida = correr(d, "--quiet", env=entorno)
check("con awk que no compila el gate sale 2", 2, codigo)
check("y NO emite cifra alguna", "", salida)
# La mitad que hace del caso un control: con el awk SANO el mismo arbol da 0.
check("y con el awk sano el MISMO arbol da 0 — el control DISCRIMINA", "0", conteo(d))
shutil.rmtree(d)
shutil.rmtree(stub)

print(f"\n{OK} ok, {FAILED} fallos")
raise SystemExit(1 if FAILED else 0)
