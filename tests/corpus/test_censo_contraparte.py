"""Pruebas de ``corpus.censo_contraparte``.

Porte de ``tests/legacy/test-censo-contraparte.sh``. Aquella suite componía su
raíz con ``../../..`` y buscaba el censo y su declaración en
``.claude/scripts/corpus/``; tras la mudanza el censo está aquí y la
declaración se quedó en el consumidor, así que el guion moría con
``FileNotFoundError`` sobre una ruta que en thyrox nunca existió.

El control positivo NO se fabrica: es el estado REAL de la declaración antes
de H-DOCS-229, recuperado retirando dos filas vivas. Un incumplidor escrito
por quien escribió el patrón hereda su encuadre y confirma el instrumento en
vez de probarlo (``hallazgo-abierto-genera-sucesor.md``).
"""
from __future__ import annotations

import os
import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from corpus import censo_contraparte  # noqa: E402
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


CENSO = reach.thyrox_root() / "src" / "corpus" / "censo_contraparte.py"
# La declaración es PARÁMETRO del consumidor (DEC-04): vive en su banco de
# baselines, no en thyrox. Se resuelve por el mecanismo de alcance.
DECL = reach.root("docs") / ".claude" / "baselines" / "addon-alias.txt"
REFERENCIA = "/home/user/odoo-tools"

if not DECL.is_file():
    print(f"REHÚSA — la declaración del consumidor no está en {DECL}. "
          f"Sin ella ningún caso puede discriminar, y un verde mediría sólo "
          f"que el censo arranca.")
    raise SystemExit(2)


def run(*args: str, extra_roots: str | None = REFERENCIA) -> tuple[int, str]:
    entorno = dict(os.environ)
    if extra_roots is None:
        entorno.pop("THYROX_EXTRA_REACH_ROOTS", None)
    else:
        entorno["THYROX_EXTRA_REACH_ROOTS"] = extra_roots
    hecho = subprocess.run([sys.executable, str(CENSO), *args],
                           capture_output=True, text=True, env=entorno)
    return hecho.returncode, hecho.stdout + hecho.stderr


print("== 1. el árbol vivo no deja ningún addon SIN-DECLARAR ==")
codigo, salida = run("--quiet", "--strict", "--declaracion", str(DECL))
check("sale 0 con la declaración vigente", 0, codigo)
check("ninguna línea SIN-DECLARAR", False, "SIN-DECLARAR" in salida)

print("== 2. CONTROL POSITIVO REAL: la declaración SIN dos filas vivas ==")
# Se retiran DOS a propósito. El censo imprime todos los huérfanos en UNA
# línea separados por espacio, así que con un solo huérfano la igualdad de
# línea completa y la búsqueda DENTRO de la línea dan el mismo verde: ningún
# caso distinguiría la aserción correcta de la rota. Sub-patrón D.
with tempfile.TemporaryDirectory(dir=str(reach.thyrox_root() / ".claude" / "eventos")) as tmp:
    recortada = Path(tmp) / "dos-huerfanos.txt"
    recortada.write_text("".join(
        l for l in DECL.read_text().splitlines(keepends=True)
        if not l.startswith(("funcional:_18-app:app_auto_backup", "auth_timeout"))))
    # La mutación tiene que haber aplicado: sin esto, un filtro que no
    # recortara nada dejaría el caso verde midiendo la declaración intacta.
    assert len(recortada.read_text()) < len(DECL.read_text()), "el recorte NO aplicó"

    codigo, salida = run("--quiet", "--strict", "--declaracion", str(recortada))
    check("sale 1 cuando faltan las filas", 1, codigo)
    linea = next((l for l in salida.splitlines() if "SIN-DECLARAR:" in l), "")
    check("nombra a auto_backup dentro de la línea", True, "auto_backup" in linea)
    check("nombra a authz_timeout dentro de la línea", True, "authz_timeout" in linea)

    print("== 3. una raíz que no resuelve se AVISA, no se calla ==")
    rota = Path(tmp) / "raiz-rota.txt"
    rota.write_text("\n".join(
        "raiz:odoo19e\t19.x/ruta-que-no-existe" if l.startswith("raiz:odoo19e") else l
        for l in DECL.read_text().splitlines()))
    _, salida = run("--quiet", "--declaracion", str(rota))
    check("avisa de la raíz vacía", True,
          "AVISO: raíz declarada sin addons: odoo19e" in salida)

    print("== 4. sin ninguna fila raiz: el censo se REHÚSA a medir ==")
    # 2, no 1: «no emití veredicto» y no «no hay incumplidores». Un 0 aquí se
    # leería como «ningún addon SIN-DECLARAR», que es el verde falso.
    sin_raices = Path(tmp) / "sin-raices.txt"
    sin_raices.write_text("\n".join(
        l for l in DECL.read_text().splitlines() if not l.startswith("raiz:")))
    codigo, _ = run("--quiet", "--declaracion", str(sin_raices))
    check("sale 2 sin raíces declaradas", 2, codigo)

    print("== 5. las filas de nivel MODELO se ignoran, y lo declara ==")
    con_modelo = Path(tmp) / "con-modelo.txt"
    con_modelo.write_text(DECL.read_text()
                          + "\nmail.tracking.value   authz.AlgunModelo\n")
    _, salida = run("--quiet", "--declaracion", str(con_modelo))
    check("declara cuántas ignoró", True,
          "filas de nivel MODELO ignoradas: 1" in salida)

print("== 6. las dos entradas del hogar de la declaración (DEC-04) ==")
# Sin `--declaracion` la ruta sale de la CONSTANTE, no de un archivo hermano.
# La versión anterior la componía con `__file__.with_name` y por eso murió al
# mudarse: el mecanismo llevaba dentro un parámetro del consumidor.
check("nombra la entrada del VALOR", "THYROX_CONTRAPARTE_DECLARATION",
      censo_contraparte.CONTRAPARTE_DECLARATION_VAR)
check("y la entrada de la RUTA del archivo que la declara", "THYROX_ENV_FILE",
      censo_contraparte.CONTRAPARTE_DECLARATION_FILE_VAR)

# La referencia SÍ se declara aquí: el censo rehúsa en lo primero que falte,
# así que sin ella el rehúse vendría del tramo extra y este caso mediría el
# mensaje equivocado. Se aísla la variable bajo prueba.
entorno_limpio = {k: v for k, v in os.environ.items()
                  if k != censo_contraparte.CONTRAPARTE_DECLARATION_VAR}
entorno_limpio["THYROX_EXTRA_REACH_ROOTS"] = REFERENCIA
hecho = subprocess.run([sys.executable, str(CENSO), "--quiet"],
                       capture_output=True, text=True, env=entorno_limpio)
check("sin declarar REHÚSA con exit 2", 2, hecho.returncode)
check("y el mensaje nombra la constante", True,
      censo_contraparte.CONTRAPARTE_DECLARATION_VAR in hecho.stderr)

print("== 7. la referencia entra por el tramo extensible, o se rehúsa ==")
codigo, salida = run("--quiet", "--declaracion", str(DECL), extra_roots=None)
check("sin odoo-tools en el alcance sale 2", 2, codigo)
check("y nombra la variable del tramo extra", True,
      "THYROX_EXTRA_REACH_ROOTS" in salida)

print("== 8. CONTROL DE ANULACIÓN: con la declaración intacta el caso 2 cae ==")
# Qué haría fallar al caso 2. Si con la declaración COMPLETA siguiera saliendo
# 1, el verde de allá no vendría del recorte sino de otra cosa.
codigo, _ = run("--quiet", "--strict", "--declaracion", str(DECL))
check("con la declaración completa --strict vuelve a 0", 0, codigo)

print(f"\n{OK} ok, {FAILED} fallos")
raise SystemExit(1 if FAILED else 0)
