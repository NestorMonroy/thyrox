"""El manifiesto es JSONL: registros etiquetados, uno por linea.

Por que estos controles y no «el archivo parsea»
================================================

``json.loads`` acepta un JSONL de UNA linea. Un manifiesto de workbench es un
solo documento, asi que una conversion probada contra n=1 pasaria sin que
ningun lector se volviera lector de LINEAS — el sub-patron D de
``metrica-decide-la-conclusion.md`` con la propia conversion como sujeto.

Lo que discrimina es el eje TEMPORAL de la familia ``jobs``: ``scaffold_run``
escribe el lanzamiento y ``settle`` escribe el asentamiento. Son dos momentos
que el mecanismo impone, no una lista que alguien decidio partir. Con los dos,
el archivo entero **deja de ser JSON valido**, y esa es la asercion.

El control positivo lo produce el MECANISMO (``scaffold_run`` + ``settle``), no
una mano: un archivo de dos lineas escrito a mano probaria que el lector lee lo
que el test escribio, no lo que el escritor emite. El arbol real se mide ademas,
declarando su poblacion — si ``.claude/jobs/`` sale de git (TASK-THYROX-0048) el
control del mecanismo sobrevive y el del arbol reporta 0 sin mentir.
"""
from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from session import job_runs  # noqa: E402
from workbench import manifest  # noqa: E402

OK = 0
FAILED = 0


def check(label: str, expected, obtained) -> None:
    global OK, FAILED
    if expected == obtained:
        OK += 1
        print(f"  ok   {label}")
    else:
        FAILED += 1
        print(f"  FAIL {label}\n       esperado: {expected!r}\n       obtenido: {obtained!r}")


import tempfile  # noqa: E402

print("== 1. el nombre y la etiqueta ==")
check("el manifiesto es JSONL", "manifest.jsonl", manifest.MANIFEST_FILE_NAME)
check("la clave que etiqueta cada registro", "kind", manifest.KIND_KEY)

print("== 2. un registro es UNA linea, y se clasifica por lo que DICE ==")
line = manifest.manifest_line("launch", {"instrument": "pytest -q"})
check("sin salto de linea dentro", 1, len(line.splitlines()))
check("la etiqueta viaja en el registro", "launch", json.loads(line)["kind"])

print("== 3. el lector funde por orden de archivo; el posterior gana ==")
merged = manifest.read_manifest_lines([
    manifest.manifest_line("launch", {"instrument": "el comando", "started_at": "A"}),
    "",                                     # una linea en blanco no es un registro
    manifest.manifest_line("settle", {"exit_code": 0}),
    manifest.manifest_line("declaration", {"instrument": "la herramienta"}),
])
check("la clave `kind` NO llega al documento fundido", False, "kind" in merged)
check("una clave que solo un registro declara", "A", merged.get("started_at"))
check("el registro posterior gana sobre el anterior", "la herramienta",
      merged.get("instrument"))
check("el tipo se conserva, no se serializa", 0, merged.get("exit_code"))

print("== 4. el andamiaje de workbench nace SIN registros ==")
with tempfile.TemporaryDirectory() as tmp:
    created = manifest.scaffold_workbench(tmp, "sonda")
    raw = (created / manifest.MANIFEST_FILE_NAME).read_text(encoding="utf-8")
    check("cero registros — no un `{}` que se lea como documento",
          [], [l for l in raw.splitlines() if l.strip()])
    check("y por tanto ninguna de las cinco esta declarada",
          list(manifest.REQUIRED_KEYS), job_runs.missing_keys(created))

print("== 5. el control que discrimina: `settle` AÑADE, no reescribe ==")
with tempfile.TemporaryDirectory() as tmp:
    started = datetime(2026, 9, 17, 6, 0, 0, tzinfo=timezone.utc)
    run = job_runs.scaffold_run(tmp, "sonda", command="pytest -q", now=started)
    path = run / manifest.MANIFEST_FILE_NAME
    after_launch = path.read_text(encoding="utf-8")
    check("el lanzamiento es UN registro", 1,
          len([l for l in after_launch.splitlines() if l.strip()]))

    job_runs.settle(run, 0, now=datetime(2026, 9, 17, 6, 0, 30, tzinfo=timezone.utc))
    after_settle = path.read_text(encoding="utf-8")
    lines = [l for l in after_settle.splitlines() if l.strip()]

    # La asercion que separa «añade» de «reescribe»: el prefijo del archivo es
    # BYTE A BYTE lo que habia antes. Una reescritura que produjera el mismo
    # contenido logico fallaria esta y pasaria una de igualdad de dict.
    check("el registro de lanzamiento sobrevive intacto", True,
          after_settle.startswith(after_launch))
    check("y el asentamiento es un SEGUNDO registro", 2, len(lines))

    # El discriminador de «lector de lineas»: el archivo entero NO es JSON.
    whole_file_parses = True
    try:
        json.loads(after_settle)
    except json.JSONDecodeError:
        whole_file_parses = False
    check("el archivo ENTERO no es JSON valido", False, whole_file_parses)
    check("pero cada linea si lo es", [True, True],
          [isinstance(json.loads(l), dict) for l in lines])

    merged = job_runs.read_manifest(run)
    check("el lector devuelve el documento fundido", 0, merged.get("exit_code"))
    check("con la duracion derivada de los dos momentos", 30.0,
          merged.get("duration_seconds"))

print("== 6. el arbol real, con su poblacion declarada ==")
root = Path(__file__).resolve().parents[2]
home = root / ".claude" / "jobs"
settled_runs = []
if home.is_dir():
    for path in sorted(home.glob(f"*/{manifest.MANIFEST_FILE_NAME}")):
        data = manifest.read_manifest_lines(path.read_text(encoding="utf-8").splitlines())
        if "started_at" in data and "exit_code" in data:
            settled_runs.append(path)
print(f"  (poblacion medida: {len(settled_runs)} job(s) asentado(s) en .claude/jobs/)")
for path in settled_runs[:3]:
    raw = path.read_text(encoding="utf-8")
    whole_file_parses = True
    try:
        json.loads(raw)
    except json.JSONDecodeError:
        whole_file_parses = False
    check(f"{path.parent.name}: >=2 registros", True,
          len([l for l in raw.splitlines() if l.strip()]) >= 2)
    check(f"{path.parent.name}: el archivo entero no es JSON", False, whole_file_parses)

print("== 7. el reparto por clave, y su mitad de juicio ==")
# Las cuatro formas que el corpus tiene, con el ejemplar real que las lleva.
# No son fabricadas: se midieron antes de escribir el reparto.
JOB_SETTLED = {                      # .claude/jobs/typecheck-20260916T101957
    "instrument": "bun typecheck", "started_at": "2026-09-16T10:19:57+00:00",
    "exit_code": 0, "finished_at": "2026-09-16T10:26:54+00:00",
    "duration_seconds": 417.0,
}
BANK_DECLARED = {                    # cualquier banco de .claude/workbench
    "question": "q", "instrument": "i", "metric": "m",
    "blind_to": ["b"], "destination": "d", "form": "measurement",
}
JOB_HANDWRITTEN = {                  # .claude/jobs/suite-base-20260909T102123
    "question": "q", "instrument": "bash tests/run.sh", "metric": "m",
    "blind_to": ["b"], "destination": "d",
}
JOB_MIXED = {                        # .claude/jobs/suite-full-t9-20260913T182631
    "question": "q", "instrument": "bash tests/run.sh", "metric": "m",
    "blind_to": ["b"], "started_at": "2026-09-13T18:26:31+00:00",
    "exit_code": 1, "finished_at": "2026-09-13T18:38:48",
}


def shape(document):
    return "+".join(kind for kind, _ in manifest.split_into_records(document))


check("job asentado: dos momentos", "launch+settle", shape(JOB_SETTLED))
check("banco: solo declaracion", "declaration", shape(BANK_DECLARED))
check("job a mano: sin lanzamiento que etiquetar",
      "declaration", shape(JOB_HANDWRITTEN))
check("job mixto: los tres", "launch+settle+declaration", shape(JOB_MIXED))
check("documento vacio: cero registros", "", shape({}))
for name, document in (("job asentado", JOB_SETTLED), ("banco", BANK_DECLARED),
                          ("job a mano", JOB_HANDWRITTEN), ("job mixto", JOB_MIXED)):
    check(f"{name}: el fundido ES el original", document,
          manifest.read_manifest_lines(manifest.render_manifest(document).splitlines()))

# ANULACION de la mitad de juicio: `instrument` a `launch` SIEMPRE. Tienen que
# caer exactamente los casos que dependen del discriminador, ni uno mas. Si no
# cayera ninguno, la condicional seria codigo muerto y el verde de arriba no
# informaria nada — el sub-patron D con este reparto como sujeto.
_keys = manifest.LAUNCH_KEYS
manifest.LAUNCH_KEYS = _keys + (manifest.CONDITIONAL_LAUNCH_KEY,)
try:
    check("anulada, CAE: el job a mano fabrica un lanzamiento que no hubo",
          "launch+declaration", shape(JOB_HANDWRITTEN))
    check("anulada, NO cae: el job asentado", "launch+settle", shape(JOB_SETTLED))
    check("anulada, NO cae: el job mixto",
          "launch+settle+declaration", shape(JOB_MIXED))
    check("anulada, NO cae: sigue sin perdida", JOB_HANDWRITTEN,
          manifest.read_manifest_lines(
              manifest.render_manifest(JOB_HANDWRITTEN).splitlines()))
finally:
    manifest.LAUNCH_KEYS = _keys
check("la anulacion se deshizo", "declaration", shape(JOB_HANDWRITTEN))

print("== 8. el lector acepta los DOS nombres; el escritor emite uno ==")
# Sin esta mitad el renombre de la constante ciega al proveedor sobre los
# manifiestos de sus consumidores: `read_manifest` devolveria {} y `bg.sh
# status` diria `unknown` sobre un trabajo terminado (H-THYROX-35 reabierto).
with tempfile.TemporaryDirectory() as tmp:
    legacy_run = Path(tmp) / "run-heredado"
    legacy_run.mkdir()
    (legacy_run / manifest.LEGACY_MANIFEST_FILE_NAME).write_text(
        json.dumps({"instrument": "pytest -q",
                    # Con desplazamiento, que es lo que `scaffold_run` emite:
                    # `.isoformat()` sobre un datetime CONSCIENTE. Un ingenuo aqui
                    # haria fallar a `settle` al restar, y el fallo seria del
                    # fixture, no del mecanismo.
                    "started_at": "2026-01-01T00:00:00+00:00"},
                   indent=2), encoding="utf-8")
    check("el nombre heredado se declara", "manifest.json",
          manifest.LEGACY_MANIFEST_FILE_NAME)
    check("un documento MULTILINEA se lee entero", "pytest -q",
          job_runs.read_manifest(legacy_run).get("instrument"))
    # El ascenso: `settle` convierte el run heredado en vez de dejar dos fuentes.
    job_runs.settle(legacy_run, 3, now=datetime(2026, 1, 1, 0, 1, tzinfo=timezone.utc))
    check("tras asentar, el heredado ya no esta", False,
          (legacy_run / manifest.LEGACY_MANIFEST_FILE_NAME).exists())
    check("y el JSONL lleva los dos momentos", 2,
          len([l for l in (legacy_run / manifest.MANIFEST_FILE_NAME)
               .read_text(encoding="utf-8").splitlines() if l.strip()]))
    check("con el codigo de salida asentado", 3,
          job_runs.read_manifest(legacy_run).get("exit_code"))
    check("y el instrumento del lanzamiento intacto", "pytest -q",
          job_runs.read_manifest(legacy_run).get("instrument"))

print(f"\n{OK} ok, {FAILED} fallos (alcance medido: {OK + FAILED} aserciones)")
raise SystemExit(1 if FAILED else 0)
