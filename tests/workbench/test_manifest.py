"""Pruebas de ``workbench.manifest`` — acunar, resolver, andamiar.

Espeja el bloque de resolutor de ``tests/workbench/manifest.test.ts`` y anade el
control que ese bloque no tiene: la **anulacion por mtime invertido**.

Por que ese control y no otro. ``runs_for`` ordena por NOMBRE, y un test que
cree los directorios en orden cronologico pasa igual con un orden por ``mtime``
— los dos criterios coinciden cuando nadie toco nada despues. El verde no
distinguiria «ordena por el ISO del identificador» de «ordena por actividad del
filesystem», que es el sub-patron D de ``metrica-decide-la-conclusion.md``. Con
el ``mtime`` invertido a proposito, los dos criterios discrepan y solo el
correcto pasa.
"""
from __future__ import annotations

import os
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from workbench import manifest  # noqa: E402

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


print("== 1. acunar: el ISO basico, y el rehuse del doble sufijo ==")
MOMENTO = datetime(2026, 1, 2, 3, 4, 5, tzinfo=timezone.utc)
check("el identificador lleva el ISO basico", "sonda-20260102T030405",
      manifest.run_id_for("sonda", MOMENTO))
try:
    manifest.run_id_for("sonda-20260101T000000", MOMENTO)
    check("un slug ya fechado REHUSA", "RunIdError", "no lanzo")
except manifest.RunIdError:
    check("un slug ya fechado REHUSA", "RunIdError", "RunIdError")

print("== 2. la fecha se DERIVA del identificador, no del reloj ==")
check("del sufijo sale la fecha extendida", "2026-09-09T17:59:59",
      manifest.run_id_date("probe-20260909T175959"))
check("sin sufijo NO se fabrica una fecha", None,
      manifest.run_id_date("probe-a-mano"))

with tempfile.TemporaryDirectory() as base:
    home = Path(base)
    NOMBRES = [
        "probe-20260101T000000",
        "probe-20260909T175959",
        "probe-20260505T120000",
        "probe-extra-20261231T235959",   # otro slug: NO se cuela bajo `probe`
        "probe-a-mano",                  # sin ISO: no se lista
    ]
    for nombre in NOMBRES:
        (home / nombre).mkdir()

    print("== 3. resolver: del mas reciente al mas antiguo ==")
    check("tres runs, en orden descendente",
          ["probe-20260909T175959", "probe-20260505T120000", "probe-20260101T000000"],
          [p.name for p in manifest.runs_for(home, "probe")])
    check("el mas reciente", "probe-20260909T175959",
          manifest.latest_run(home, "probe").name)

    print("== 4. CONTROL de frontera: el prefijo se ancla por los dos extremos ==")
    # Sin el ancla `^...$`, `probe-extra-<ISO>` empieza por `probe-` y su resto
    # casaria un ISO al final: un run AJENO devuelto como propio.
    check("`probe-extra-<ISO>` NO entra bajo `probe`", False,
          any(p.name.startswith("probe-extra") for p in manifest.runs_for(home, "probe")))
    check("y si entra bajo SU slug", ["probe-extra-20261231T235959"],
          [p.name for p in manifest.runs_for(home, "probe-extra")])

    print("== 5. CONTROL de anulacion: mtime INVERTIDO ==")
    # El mas antiguo por ISO recibe el mtime mas NUEVO. Un orden por mtime
    # devolveria `probe-20260101T000000`; el orden por nombre, el de 2026-09-09.
    for indice, nombre in enumerate(
            ["probe-20260909T175959", "probe-20260505T120000", "probe-20260101T000000"]):
        marca = 1_000_000 + indice * 10_000      # el ultimo de la lista, el mayor
        os.utime(home / nombre, (marca, marca))
    por_mtime = sorted((home / n for n in
                        ["probe-20260101T000000", "probe-20260505T120000",
                         "probe-20260909T175959"]),
                       key=lambda p: p.stat().st_mtime, reverse=True)
    check("los dos criterios DISCREPAN (si no, el caso no mide nada)", False,
          [p.name for p in por_mtime] == [p.name for p in manifest.runs_for(home, "probe")])
    check("y gana el ISO del identificador", "probe-20260909T175959",
          manifest.latest_run(home, "probe").name)

    print("== 6. sin runs: None y lista vacia, nunca una ruta inventada ==")
    check("un slug desconocido no tiene ultimo", None,
          manifest.latest_run(home, "no-existe"))
    check("ni runs", [], manifest.runs_for(home, "no-existe"))

check("un hogar inexistente devuelve lista vacia", [],
      manifest.runs_for("/no/existe/este/hogar", "probe"))

print("== 7. andamiar: las cinco claves se OMITEN, no se rellenan ==")
with tempfile.TemporaryDirectory() as base:
    creado = manifest.scaffold_workbench(base, "andamio", MOMENTO)
    check("el run lleva el identificador acunado", "andamio-20260102T030405", creado.name)
    for sub in manifest.SCAFFOLD_SUBDIRS:
        check(f"crea `{sub}/`", True, (creado / sub).is_dir())
    check("el manifiesto existe", True, (creado / manifest.MANIFEST_FILE_NAME).is_file())
    # Un placeholder pasaria un check de presencia y se leeria como dato; una
    # clave ausente la nombra el gate. Por eso el manifiesto nace VACIO.
    contenido = (creado / manifest.MANIFEST_FILE_NAME).read_text(encoding="utf-8")
    for clave in manifest.REQUIRED_KEYS:
        check(f"`{clave}` NO se rellena con placeholder", False, clave in contenido)

print("== 8. el contrato que el gemelo TypeScript declara ==")
check("las cinco claves, en el orden del reporte",
      ("question", "instrument", "metric", "blind_to", "destination"),
      manifest.REQUIRED_KEYS)
check("las tres formas, en ingles",
      ("corpus", "measurement", "transformation"), manifest.WORKBENCH_FORMS)
check("el nombre del manifiesto", "manifest.json", manifest.MANIFEST_FILE_NAME)

print(f"\n{OK} ok, {FAILED} fallos")
raise SystemExit(1 if FAILED else 0)
