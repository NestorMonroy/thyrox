"""Pruebas de ``corpus.list_corpus_builds``.

El defecto que este guion corrige es que `_references/claude-code-bin/README.md`
transcribía a mano qué builds había y qué traía cada una — una cifra que
crece con cada extracción, la forma que `calibration-verified-numbers.md`
prohíbe. La suite comprueba que el guion SÍ distingue entre "extracción
completa", "sólo volcado de cadenas" y "vista derivada por sufijo", y que esa
distinción depende de verdad de `detect_markers` — no de que las tres
categorías coincidan por casualidad.
"""
from __future__ import annotations

import os
import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from corpus import list_corpus_builds as guion  # noqa: E402
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


#: `reach.thyrox_root()` ya está importado arriba: no hace falta re-derivarla
#: por aritmética (tarea #228).
SCRIPT = reach.thyrox_root() / "src" / "corpus" / "list_corpus_builds.py"


def escribir(path: Path, *nombres: str) -> None:
    """Crea `path` como directorio con los marcadores que se le nombren."""
    path.mkdir(parents=True, exist_ok=True)
    for nombre in nombres:
        if nombre in ("bunfs-root", "src"):
            (path / nombre).mkdir()
            (path / nombre / "placeholder.txt").write_text("x")
        else:
            (path / nombre).write_text("x" * 10)


with tempfile.TemporaryDirectory(dir=str(reach.scratch_root())) as tmp:
    raiz = Path(tmp) / "corpus-sintetico"

    # Tres formas reales, medidas en el arbol vivo:
    #   - extraccion completa      (2.1.241)
    #   - solo volcado de cadenas  (2.1.250 / 2.1.251)
    #   - vista derivada           (2.1.246-nombrado)
    # mas la forma que origino la tarea: bunfs-root + MANIFEST.tsv SIN src
    # (2.1.258 tal como esta hoy).
    escribir(raiz / "9.9.1", "bunfs-root", "src", "MANIFEST.tsv", "README.md")
    escribir(raiz / "9.9.2", "claude_strings.txt", "README.md")
    escribir(raiz / "9.9.2-nombrado", "bunfs-root", "src")
    escribir(raiz / "9.9.3", "bunfs-root", "MANIFEST.tsv", "claude_strings.txt", "README.md")
    # un directorio SIN forma de version: no debe aparecer en el inventario
    (raiz / "notas-sueltas").mkdir()

    print("== 1. cada build se reporta con SUS marcadores, no con todos ==")
    entradas = guion.scan_root(raiz)
    check("4 builds con forma de version (notas-sueltas queda fuera)", 4, len(entradas))
    por_nombre = {e.name: e for e in entradas}
    check("9.9.1: extraccion completa",
          ("bunfs-root", "src", "MANIFEST.tsv", "README.md"),
          por_nombre["9.9.1"].present)
    check("9.9.2: solo volcado de cadenas",
          ("claude_strings.txt", "README.md"),
          por_nombre["9.9.2"].present)
    check("9.9.2-nombrado: vista derivada, sin MANIFEST ni volcado",
          ("bunfs-root", "src"),
          por_nombre["9.9.2-nombrado"].present)
    check("9.9.2-nombrado declara su version base", "9.9.2",
          por_nombre["9.9.2-nombrado"].version)
    check("9.9.2-nombrado lleva su sufijo", "-nombrado",
          por_nombre["9.9.2-nombrado"].suffix)
    check("9.9.1 NO lleva sufijo (build de primer nivel)", None,
          por_nombre["9.9.1"].suffix)
    check("9.9.3: bunfs-root + MANIFEST.tsv SIN src (el caso que origino la tarea)",
          ("bunfs-root", "MANIFEST.tsv", "claude_strings.txt", "README.md"),
          por_nombre["9.9.3"].present)

    print("== 2. el resumen lleva su denominador ==")
    resumen = guion.format_summary(entradas, raiz)
    check("nombra el total", True, "4 builds" in resumen)
    check("cuenta los que tienen src (solo 2: 9.9.1 y 9.9.2-nombrado)", True,
          "2 con src" in resumen)
    check("cuenta las vistas derivadas (solo 1)", True,
          "1 vista(s) derivada(s)" in resumen)

    print("== 3. CLI: reproducible desde fuera, con --root ==")
    hecho = subprocess.run(
        [sys.executable, str(SCRIPT), "--root", str(raiz)],
        capture_output=True, text=True,
    )
    check("sale 0", 0, hecho.returncode)
    check("nombra 9.9.1", True, "9.9.1" in hecho.stdout)
    check("nombra 9.9.3 sin listar src en su fila", True,
          "9.9.3" in hecho.stdout
          and "bunfs-root, MANIFEST.tsv, claude_strings.txt, README.md" in hecho.stdout)
    check("no lista a notas-sueltas", False, "notas-sueltas" in hecho.stdout)

    print("== 4. CONTROL DE ANULACIÓN: sin detect_markers, todo parece completo ==")
    # Que haria fallar a la asercion del bloque 1 sobre 9.9.2 (solo volcado).
    # Si el detector se reemplaza por uno que no mira el disco y devuelve
    # siempre los cinco marcadores, la distincion que el bloque 1 media
    # desaparece: 9.9.2 (volcado suelto) queda indistinguible de 9.9.1
    # (extraccion completa). Eso es lo que hace que el chequeo sea un
    # control real y no un verde que nunca podria fallar.
    original = guion.detect_markers
    guion.detect_markers = lambda path: guion.CONTENT_MARKERS  # anula el mecanismo
    try:
        entradas_anuladas = guion.scan_root(raiz)
        por_nombre_anulado = {e.name: e for e in entradas_anuladas}
        check("anulado: 9.9.2 (solo volcado) aparenta TODOS los marcadores",
              guion.CONTENT_MARKERS, por_nombre_anulado["9.9.2"].present)
        check("anulado: la aserción original del bloque 1 ahora es FALSA",
              True,
              por_nombre_anulado["9.9.2"].present != ("claude_strings.txt", "README.md"))
    finally:
        guion.detect_markers = original

    print("== 5. restaurado, 9.9.2 vuelve a mostrar solo sus dos marcadores ==")
    entradas_restauradas = guion.scan_root(raiz)
    por_nombre_restaurado = {e.name: e for e in entradas_restauradas}
    check("9.9.2 vuelve a la forma correcta", ("claude_strings.txt", "README.md"),
          por_nombre_restaurado["9.9.2"].present)

print(f"\n{OK} ok, {FAILED} fallos")
raise SystemExit(1 if FAILED else 0)
