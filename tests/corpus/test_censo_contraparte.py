"""Pruebas de ``corpus.census_counterparts`` — con un consumidor SINTÉTICO.

El censo es mecanismo del proveedor; qué repo se censa, contra qué referencia
y qué archivo marca una unidad es dominio del consumidor (DEC-04, #249). Esta
suite llevaba ese dominio escrito dentro —``/home/user/odoo-tools``, ``api``,
``addons,src/addons``, ``__manifest__.py`` y la declaración viva de
``kaupamex-docs``— y por eso medía si el consumidor estaba instalado, no el
censo: sin ``odoo-tools`` rehusaba siempre, y el mecanismo quedaba SIN MEDIR
en cada ejecución por una ausencia que no era suya.

Ahora el consumidor se construye aquí: un repo censado, una referencia con dos
raíces y una declaración, con un marcador que NO es el de ningún producto
(``unidad.toml``). El caso con la declaración real de kaupamex es del
consumidor y vive en su suite.

Y la pregunta de qué pasa cuando una CONSTANTE del dominio no está definida
tiene su propio caso: cada una de las cuatro, sin bandera ni variable, rehúsa
con exit 2 nombrándose y sin emitir cifra.
"""
from __future__ import annotations

import os
import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from corpus import census_counterparts  # noqa: E402
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


CENSUS = reach.thyrox_root() / "src" / "corpus" / "census_counterparts.py"
MARKER = "unidad.toml"
BASES = "addons,src/addons"
DOMAIN_VARS = (census_counterparts.CENSUSED_ROOT_VAR,
               census_counterparts.UNIT_MARKER_VAR,
               census_counterparts.UNIT_BASES_VAR,
               census_counterparts.REFERENCE_ROOT_VAR)

DECLARATION = """\
# Declaración del consumidor sintético.
raiz:ref-base    base
raiz:ref-extra   extra
omega                    beta
funcional:ref-extra:sigma  gamma
-                        delta
"""


def unit(root: Path, relative: str) -> None:
    (root / relative).mkdir(parents=True)
    (root / relative / MARKER).write_text("")


def isolated_env(tmp: Path, **extra: str) -> dict[str, str]:
    """El entorno sin nada del consumidor real: ni sus constantes ni su .env."""
    env = {k: v for k, v in os.environ.items()
           if k not in DOMAIN_VARS
           and k != census_counterparts.COUNTERPART_DECLARATION_VAR
           and k not in reach.EXTRA_ROOTS_VARS}
    empty = tmp / "vacio.env"
    empty.write_text("")
    env[census_counterparts.COUNTERPART_DECLARATION_FILE_VAR] = str(empty)
    # El censo importa `paths.reach`: se le da su raíz de módulos en vez de
    # heredarla de quien corra la suite (`tests/run.sh` la exporta; una
    # invocación suelta no).
    env["PYTHONPATH"] = os.pathsep.join(
        p for p in (str(reach.thyrox_root() / "src"), os.environ.get("PYTHONPATH", "")) if p)
    env.update(extra)
    return env


def run(env: dict[str, str], *args: str) -> tuple[int, str]:
    done = subprocess.run([sys.executable, str(CENSUS), *args],
                          capture_output=True, text=True, env=env)
    return done.returncode, done.stdout + done.stderr


with tempfile.TemporaryDirectory(dir=str(reach.scratch_root())) as raw_tmp:
    tmp = Path(raw_tmp)
    ours = tmp / "consumidor"
    for relative in ("addons/alfa", "addons/beta", "addons/gamma", "src/addons/delta"):
        unit(ours, relative)
    (ours / "addons" / "sin_marca").mkdir()        # sin marcador: no es unidad
    reference = tmp / "referencia-sintetica"
    for relative in ("base/alfa", "base/omega", "extra/sigma"):
        unit(reference, relative)
    declaration = tmp / "declaracion.txt"
    declaration.write_text(DECLARATION)
    env = isolated_env(tmp)
    flags = ("--nuestro", str(ours), "--referencia", str(reference),
             "--marcador", MARKER, "--bases", BASES)

    print("== 1. la declaración completa no deja ninguna unidad SIN-DECLARAR ==")
    code, output = run(env, *flags, "--quiet", "--strict", "--declaracion", str(declaration))
    check("sale 0 con la declaración completa", 0, code)
    check("ninguna línea SIN-DECLARAR", False, "SIN-DECLARAR" in output)
    code, output = run(env, *flags, "--declaracion", str(declaration))
    check("el directorio sin marcador no es unidad", False, "sin_marca" in output)

    print("== 2. CONTROL POSITIVO: la declaración sin dos filas ==")
    # Dos a propósito: el censo imprime los huérfanos en UNA línea, y con uno
    # solo la igualdad de línea y la búsqueda dentro de ella no se distinguen.
    trimmed = tmp / "dos-huerfanos.txt"
    trimmed.write_text("".join(
        line for line in DECLARATION.splitlines(keepends=True)
        if not line.startswith(("omega", "-"))))
    assert len(trimmed.read_text()) < len(DECLARATION), "el recorte NO aplicó"
    code, output = run(env, *flags, "--quiet", "--strict", "--declaracion", str(trimmed))
    check("sale 1 cuando faltan las filas", 1, code)
    line = next((l for l in output.splitlines() if "SIN-DECLARAR:" in l), "")
    check("nombra a beta dentro de la línea", True, "beta" in line)
    check("nombra a delta dentro de la línea", True, "delta" in line)

    print("== 3. una raíz que no resuelve se AVISA, no se calla ==")
    broken = tmp / "raiz-rota.txt"
    broken.write_text(DECLARATION.replace("raiz:ref-extra   extra",
                                          "raiz:ref-extra   ruta-que-no-existe"))
    _, output = run(env, *flags, "--quiet", "--declaracion", str(broken))
    check("avisa de la raíz vacía", True,
          "AVISO: raíz declarada sin unidades: ref-extra" in output)

    print("== 4. sin ninguna fila raiz: el censo se REHÚSA a medir ==")
    # 2, no 1: «no emití veredicto», no «no hay incumplidores».
    rootless = tmp / "sin-raices.txt"
    rootless.write_text("\n".join(
        l for l in DECLARATION.splitlines() if not l.startswith("raiz:")))
    code, _ = run(env, *flags, "--quiet", "--declaracion", str(rootless))
    check("sale 2 sin raíces declaradas", 2, code)

    print("== 5. las filas de nivel MODELO se ignoran, y lo declara ==")
    with_model = tmp / "con-modelo.txt"
    with_model.write_text(DECLARATION + "algo.modelo   alfa.Modelo\n")
    _, output = run(env, *flags, "--quiet", "--declaracion", str(with_model))
    check("declara cuántas ignoró", True, "filas de nivel MODELO ignoradas: 1" in output)

    print("== 6. una CONSTANTE del dominio sin definir: rehúsa y se nombra ==")
    # Cada una por separado, con las otras tres por bandera: el rehúse tiene
    # que venir de ESA constante, no de la primera que falte.
    by_flag = {census_counterparts.CENSUSED_ROOT_VAR: ("--nuestro", str(ours)),
               census_counterparts.UNIT_MARKER_VAR: ("--marcador", MARKER),
               census_counterparts.UNIT_BASES_VAR: ("--bases", BASES),
               census_counterparts.REFERENCE_ROOT_VAR: ("--referencia", str(reference))}
    for missing in DOMAIN_VARS:
        args = [a for var, pair in by_flag.items() if var != missing for a in pair]
        code, output = run(env, *args, "--quiet", "--declaracion", str(declaration))
        check(f"sin {missing}: exit 2", 2, code)
        check(f"sin {missing}: el mensaje la nombra", True, missing in output)
        check(f"sin {missing}: no emite resumen", False, "SIN-DECLARAR" in output)

    print("== 7. la declaración sin hogar: rehúsa nombrando sus dos entradas ==")
    check("nombra la entrada del VALOR", "THYROX_COUNTERPART_DECLARATION",
          census_counterparts.COUNTERPART_DECLARATION_VAR)
    check("y la entrada de la RUTA del archivo que la declara", "THYROX_ENV_FILE",
          census_counterparts.COUNTERPART_DECLARATION_FILE_VAR)
    code, output = run(env, *flags, "--quiet")
    check("sin declarar REHÚSA con exit 2", 2, code)
    check("y el mensaje nombra la constante", True,
          census_counterparts.COUNTERPART_DECLARATION_VAR in output)

    print("== 8. la referencia por ALIAS entra por el tramo extensible, o se rehúsa ==")
    by_alias = [a for var, pair in by_flag.items()
                if var != census_counterparts.REFERENCE_ROOT_VAR for a in pair]
    alias_env = isolated_env(tmp, **{census_counterparts.REFERENCE_ROOT_VAR: reference.name})
    code, output = run(alias_env, *by_alias, "--quiet", "--declaracion", str(declaration))
    check("sin la referencia en el alcance sale 2", 2, code)
    check("y nombra la variable del tramo extra", True,
          reach.EXTRA_ROOTS_VARS[0] in output)
    alias_env[reach.EXTRA_ROOTS_VARS[0]] = str(reference)
    code, _ = run(alias_env, *by_alias, "--quiet", "--strict", "--declaracion", str(declaration))
    check("declarada en el tramo extra, mide y sale 0", 0, code)

    print("== 9. CONTROL DE ANULACIÓN: con la declaración intacta el caso 2 cae ==")
    code, _ = run(env, *flags, "--quiet", "--strict", "--declaracion", str(declaration))
    check("con la declaración completa --strict vuelve a 0", 0, code)

print("== 10. el DOMINIO DEL PRODUCTO es parámetro, no conocimiento de aquí ==")
SOURCE = CENSUS.read_text()
check("el repo censado no cae a un consumidor concreto", 0, SOURCE.count('root("api")'))
check("el árbol de referencia no se nombra en el mecanismo", 0, SOURCE.lower().count("odoo"))
check("qué marca la unidad censada se declara", 0, SOURCE.count("__manifest__"))
check("y su constante existe", "THYROX_CENSUS_UNIT_MARKER",
      census_counterparts.UNIT_MARKER_VAR)
check("igual que la del árbol de referencia", "THYROX_CENSUS_REFERENCE_ROOT",
      census_counterparts.REFERENCE_ROOT_VAR)

print(f"\n{OK} ok, {FAILED} fallos")
raise SystemExit(1 if FAILED else 0)
