"""Pruebas de ``roster.job_liveness`` — vivo, muerto, o no se puede saber.

Adaptación de ``probeDaemonJob``/``dbt``/``S6e`` del cliente Claude Code (ver
el docstring de ``job_liveness`` para la referencia completa). Lo que viaja es
el veredicto de cuatro causas + su procedencia + la holgura de reloj + la
cuarentena que no se confunde con "sin marcador"; lo que NO viaja es el PID ni
el daemon — no hay proceso que sondear.

Los casos que DISCRIMINAN, y por qué:

- **2 y 3** — un contenido "cortado" (``shape="cut"``) DENTRO de la ventana de
  vejez es indistinguible de una escritura en curso: el veredicto es
  ``"recent"`` de todos modos. Confundirlo declararía muerto a un trabajo vivo.
- **4 y 5** — sólo FUERA de la ventana el contenido decide entre evidencia
  positiva (``stalled_evident``) y mera ausencia (``stalled_unknown``); las dos
  NO se colapsan en una, porque sólo la primera autoriza relanzar en
  ``reconciliar-agentes.sh``.
- **6** — la holgura de reloj es una constante PROPIA, sumada al umbral: sin
  ella, una entrada apenas más vieja que el umbral se leería como muerta
  aunque el desfase de reloj entre quien escribe y quien mide la explique
  entera.
- **10** — un fallo de LECTURA (symlink roto, contenido corrupto) se separa en
  cuarentena, nunca se cuela en los diagnósticos como si fuera "pending".

Los repos/roster son de mentira y se construyen aquí, con ``os.utime`` para
fijar la antigüedad exacta que cada caso necesita — medir contra el reloj real
haría el resultado dependiente de cuándo corre la suite.
"""
from __future__ import annotations

import os
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from roster import job_liveness as jl  # noqa: E402

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


def make_entry(tmp: Path, name: str, content: str, age_seconds: float) -> Path:
    """Un archivo con contenido y ``mtime`` fijados a una antigüedad exacta."""
    path = tmp / name
    path.write_text(content)
    when = jl_now() - age_seconds
    os.utime(path, (when, when))
    return path


def jl_now() -> float:
    """La hora que rige toda la suite — una sola vez, como ``NOW=$(date +%s)``."""
    import time
    return time.time()


def fake_read_shape(path: Path) -> str:
    """El lector de sustrato que un consumidor real reemplazaría.

    Convención de prueba: el contenido del archivo ES la etiqueta del shape,
    o la palabra ``CORRUPT`` para simular una lectura que falla.
    """
    text = path.read_text()
    if text == "CORRUPT":
        raise jl.UnreadableEntryError(path, "contenido no reconocido (medido en la prueba)")
    return text


NOW = jl_now()

print("== 1. shape terminado gana SIEMPRE, sin importar la antigüedad ==")
d = jl.diagnose("terminated", age_seconds=10_000_000, stale_after=900, clock_skew=60)
check("verdict terminated", "terminated", d.verdict)
check("procedencia: el marcador decidió", True, d.from_marker)

print("== 2. DISCRIMINA: 'cut' DENTRO de la ventana sigue siendo 'recent' ==")
d = jl.diagnose("cut", age_seconds=10, stale_after=900, clock_skew=60)
check("no se declara muerto por el contenido solo", "recent", d.verdict)
check("procedencia: fue la antigüedad, no el marcador", False, d.from_marker)

print("== 3. y 'pending' DENTRO de la ventana también es 'recent' ==")
d = jl.diagnose("pending", age_seconds=10, stale_after=900, clock_skew=60)
check("mismo veredicto que 'cut' mientras es reciente", "recent", d.verdict)

print("== 4. DISCRIMINA: 'cut' FUERA de la ventana es evidencia POSITIVA ==")
d = jl.diagnose("cut", age_seconds=1000, stale_after=900, clock_skew=60)
check("stalled_evident, no stalled_unknown", "stalled_evident", d.verdict)
check("procedencia: el marcador decidió", True, d.from_marker)

print("== 5. y 'pending' FUERA de la ventana es sólo AUSENCIA de evidencia ==")
d = jl.diagnose("pending", age_seconds=1000, stale_after=900, clock_skew=60)
check("stalled_unknown, no stalled_evident", "stalled_unknown", d.verdict)
check("procedencia: sólo la antigüedad, ningún marcador", False, d.from_marker)

print("== 6. DISCRIMINA: la holgura de reloj es una constante PROPIA, sumada ==")
# 900 (umbral) + 60 (holgura) = 960. A 950s el desfase de reloj cubre la
# diferencia; sin holgura (clock_skew=0) el mismo caso ya sería stalled.
d = jl.diagnose("pending", age_seconds=950, stale_after=900, clock_skew=60)
check("950s con holgura de 60 sigue 'recent'", "recent", d.verdict)
d_sin_holgura = jl.diagnose("pending", age_seconds=950, stale_after=900, clock_skew=0)
check("el mismo caso SIN holgura ya es 'stalled_unknown'",
      "stalled_unknown", d_sin_holgura.verdict)

print("== 7. justo en el borde (900+60=960) sigue 'recent'; a 961 ya no ==")
check("960s exactos: recent", "recent",
      jl.diagnose("pending", age_seconds=960, stale_after=900, clock_skew=60).verdict)
check("961s: stalled_unknown", "stalled_unknown",
      jl.diagnose("pending", age_seconds=961, stale_after=900, clock_skew=60).verdict)

print("== 8. un shape fuera del vocabulario rehúsa, no se adivina ==")
try:
    jl.diagnose("zombie", age_seconds=1)
    check("rehúsa shape desconocido", "UnknownShapeError", "no lanzó")
except jl.UnknownShapeError as err:
    check("rehúsa shape desconocido", "UnknownShapeError", type(err).__name__)

print("== 9. is_alive() — el booleano ENCIMA del veredicto de 4 valores ==")
check("terminated no está vivo", False, jl.is_alive(jl.Diagnosis("terminated", True)))
check("recent SÍ está vivo", True, jl.is_alive(jl.Diagnosis("recent", False)))
check("stalled_evident no está vivo", False, jl.is_alive(jl.Diagnosis("stalled_evident", True)))
check("stalled_unknown TAMPOCO está vivo — ausencia no es evidencia de vida",
      False, jl.is_alive(jl.Diagnosis("stalled_unknown", False)))

print("== 10. DISCRIMINA: sweep() separa lo ilegible en cuarentena, NUNCA en diagnoses ==")
with tempfile.TemporaryDirectory() as tmp:
    raiz = Path(tmp)
    vivo = make_entry(raiz, "vivo.txt", "pending", age_seconds=5)
    corrupto = make_entry(raiz, "corrupto.txt", "CORRUPT", age_seconds=5)
    result = jl.sweep([vivo, corrupto], fake_read_shape, now=jl_now())
    check("el legible aparece en diagnoses", True, "vivo.txt" in result.diagnoses)
    check("el corrupto NO aparece en diagnoses", False, "corrupto.txt" in result.diagnoses)
    check("el corrupto aparece en quarantined, con su razón",
          True, "corrupto.txt" in result.quarantined
          and "contenido no reconocido" in result.quarantined["corrupto.txt"])
    check("nada más en cuarentena", 1, len(result.quarantined))

print("== 11. un symlink roto se pone en cuarentena ANTES de leer su contenido ==")
with tempfile.TemporaryDirectory() as tmp:
    raiz = Path(tmp)
    enlace = raiz / "roto.txt"
    enlace.symlink_to(raiz / "no-existe.txt")
    result = jl.sweep([enlace], fake_read_shape, now=jl_now())
    check("el symlink roto queda en cuarentena, no en diagnoses",
          (0, True), (len(result.diagnoses), "roto.txt" in result.quarantined))

print("== 12. sweep() con entradas de las TRES formas, contra un umbral real ==")
with tempfile.TemporaryDirectory() as tmp:
    raiz = Path(tmp)
    a = make_entry(raiz, "a.txt", "terminated", age_seconds=100_000)
    b = make_entry(raiz, "b.txt", "cut", age_seconds=5)
    c = make_entry(raiz, "c.txt", "cut", age_seconds=1000)
    d_ = make_entry(raiz, "d.txt", "pending", age_seconds=1000)
    result = jl.sweep([a, b, c, d_], fake_read_shape, now=jl_now(),
                       stale_after=900, clock_skew=60)
    check("a: terminated pase lo que pase", "terminated", result.diagnoses["a.txt"].verdict)
    check("b: cut reciente = recent", "recent", result.diagnoses["b.txt"].verdict)
    check("c: cut viejo = stalled_evident", "stalled_evident", result.diagnoses["c.txt"].verdict)
    check("d: pending viejo = stalled_unknown", "stalled_unknown", result.diagnoses["d.txt"].verdict)
    check("sin cuarentena en este barrido", 0, len(result.quarantined))

print("== 13. una lista de entradas VACÍA no rehúsa — aquí SÍ es un estado legítimo ==")
# A diferencia de repo.pending_work.sweep([]) — que rehúsa porque "cero
# configurado" y "cero con trabajo" publican el mismo vacío ambiguo — aquí las
# entradas se listan en tiempo real: un roster sin trabajo pendiente AHORA
# MISMO es un estado normal y frecuente, no un error de composición. Copiar
# esa guarda aquí penalizaría el caso común.
result = jl.sweep([], fake_read_shape, now=jl_now())
check("sweep([]) no rehúsa", (0, 0), (len(result.diagnoses), len(result.quarantined)))

print(f"\n{OK} ok, {FAILED} fallos")
raise SystemExit(1 if FAILED else 0)
