#!/usr/bin/env python3
"""Prueba de ``paths.reach`` — la resolución de raíces por variable.

Es la mitad ROJA escrita ANTES del mecanismo (TDD). El módulo que importa no
existe todavía: este archivo falla al importarlo, y ese fallo es el resultado
que se persiste.

Qué cubre cada bloque, y por qué existe — cada uno nace de un defecto MEDIDO en
``kaupamex-docs/.claude/scripts/reach_roots.py``, no de una preferencia:

1. **La constante por raíz se lee** — ``KAUPAMEX_API`` decide el valor de
   ``root('api')``. Hoy no: ``_env_name`` sólo se usa para EXPORTAR con
   ``--env`` y nunca para LEER, así que la constante se declara y se ignora
   (H-DOCS-1070).
2. **La precedencia es cadena, no bifurcación** — lo más específico gana. Una
   ruta declarada explícitamente no puede quedar anulada por una derivación:
   sería descartar el único dato que alguien escribió a propósito.
3. **El ascenso es independiente de la profundidad** — el mismo árbol resuelve
   igual desde dos niveles y desde cinco. La fórmula actual es un offset fijo
   (``parents[2].parent``) que sólo acierta a UNA profundidad, y su acierto se
   rompe sin que nada lo note.
4. **El archivo ``.env`` se lee sin librería** — medido: ``python-dotenv`` no
   está instalado en el ``python3`` del sistema ni en el venv de ``api``, y los
   gates corren con ``python3`` pelado. Una dependencia de terceros aquí
   convertiría a todo consumidor en un rehúse.
5. **La grafía del árbol es UNA tupla ordenada en un sitio** — no cuatro
   grafías inventadas por cuatro guiones (H-DOCS-1071). Aceptar dos nombres
   declarados en orden no es aquel defecto: es su reparación, porque el orden
   está escrito y es auditable.
6. **Los controles pueden fallar** — cada bloque de precedencia trae su gemelo
   con la fuente de mayor precedencia RETIRADA, y exige que el veredicto
   CAMBIE. Un verde que no cambia al quitarle la causa no está midiendo la
   causa (sub-patrón D de ``metrica-decide-la-conclusion.md``).

Uso:  python3 tests/paths/test_reach.py
"""

import os
import pathlib
import sys
import tempfile

_MARKER = pathlib.Path("src") / "paths" / "reach.py"
_HERE = pathlib.Path(__file__).resolve()
for _level in _HERE.parents:
    if (_level / _MARKER).is_file():
        THYROX_ROOT = _level
        break
else:
    raise SystemExit(f"no se halló {_MARKER} ascendiendo desde {_HERE}")
sys.path.insert(0, str(THYROX_ROOT / "src"))

from paths import reach  # noqa: E402  (la ruta se compone arriba, a propósito)

PASS = 0
FAIL = 0


def check(label: str, expected, actual) -> None:
    global PASS, FAIL
    if expected == actual:
        PASS += 1
        print(f"  ok    {label}")
    else:
        FAIL += 1
        print(f"  FALLA {label}\n          esperado: {expected!r}\n          real:     {actual!r}")


def check_raises(label: str, exc_type, fn) -> None:
    global PASS, FAIL
    try:
        fn()
    except exc_type:
        PASS += 1
        print(f"  ok    {label}")
        return
    except Exception as err:  # noqa: BLE001 — el tipo equivocado también es fallo
        FAIL += 1
        print(f"  FALLA {label}: alzó {type(err).__name__}, no {exc_type.__name__}")
        return
    FAIL += 1
    print(f"  FALLA {label}: no alzó nada")


def build_tree(base: pathlib.Path, deep: bool = False) -> pathlib.Path:
    """Un árbol sintético con dos clones y un THYROX a profundidad variable."""
    for name in ("kaupamex-api", "kaupamex-docs"):
        (base / name).mkdir(parents=True, exist_ok=True)
    leaf = base / "thyrox" / "src" / ("a/b/c" if deep else "paths")
    leaf.mkdir(parents=True, exist_ok=True)
    return leaf


def clean_env() -> None:
    """Retira toda variable del mecanismo — el suelo de cada bloque."""
    for key in list(os.environ):
        if key.startswith("KAUPAMEX_") or key.startswith("THYROX_"):
            del os.environ[key]


print("\n1. La constante por raíz se LEE (H-DOCS-1070)")
with tempfile.TemporaryDirectory() as tmp:
    base = pathlib.Path(tmp)
    start = build_tree(base)
    otro = base / "otro-sitio"
    otro.mkdir()

    clean_env()
    os.environ["THYROX_REACH_ROOT"] = str(base)
    os.environ["THYROX_REACH_API"] = str(otro)
    check("THYROX_REACH_API gana sobre el árbol", otro, reach.root("api", start=start))

    # Control: retirada la constante, el veredicto DEBE cambiar al clon del árbol.
    del os.environ["THYROX_REACH_API"]
    check(
        "control — sin la constante por raíz cae al clon del árbol",
        base / "kaupamex-api",
        reach.root("api", start=start),
    )

print("\n2. El proceso gana al archivo .env")
with tempfile.TemporaryDirectory() as tmp:
    base = pathlib.Path(tmp)
    start = build_tree(base)
    via_env = base / "por-env"
    via_process = base / "por-proceso"
    via_env.mkdir()
    via_process.mkdir()
    (base / ".env").write_text(f"THYROX_REACH_API={via_env}\n")

    clean_env()
    os.environ["THYROX_REACH_ROOT"] = str(base)
    os.environ["THYROX_REACH_API"] = str(via_process)
    check("el proceso gana", via_process, reach.root("api", start=start))

    # Control: retirado el proceso, el veredicto DEBE cambiar al valor del .env.
    del os.environ["THYROX_REACH_API"]
    check("control — sin proceso, manda el .env", via_env, reach.root("api", start=start))

print("\n3. El ascenso NO depende de la profundidad")
with tempfile.TemporaryDirectory() as tmp:
    base = pathlib.Path(tmp)
    somero = build_tree(base, deep=False)
    hondo = build_tree(base, deep=True)

    clean_env()
    check("desde 2 niveles", base, reach.tree_root(start=somero))
    check("desde 5 niveles", base, reach.tree_root(start=hondo))
    check(
        "control — los dos coinciden (un offset fijo daría distinto)",
        reach.tree_root(start=somero),
        reach.tree_root(start=hondo),
    )

print("\n4. El .env se lee sin librería de terceros")
with tempfile.TemporaryDirectory() as tmp:
    base = pathlib.Path(tmp)
    start = build_tree(base)
    (base / ".env").write_text(
        "# un comentario\n"
        "\n"
        "export THYROX_REACH_ROOT=/desde/export\n"
        'THYROX_REACH_API="/entre/comillas"\n'
        "THYROX_REACH_DOCS='/comilla/simple'\n"
        "MAL_FORMADA\n"
    )
    valores = reach.read_env_file(base / ".env")
    check("ignora el comentario y la línea en blanco", 3, len(valores))
    check("acepta el prefijo export", "/desde/export", valores["THYROX_REACH_ROOT"])
    check("quita la comilla doble", "/entre/comillas", valores["THYROX_REACH_API"])
    check("quita la comilla simple", "/comilla/simple", valores["THYROX_REACH_DOCS"])
    check("descarta la línea sin '='", False, "MAL_FORMADA" in valores)

print("\n5. Las variables nombran al LECTOR, como el binario")
# Medido en el volcado del ejecutable 2.1.261: el cliente nombra SIEMPRE por su
# propio producto —CLAUDE_PLUGIN_ROOT 49, CLAUDE_STAGE_FILE_ROOT 11,
# CLAUDE_CODE_TEST_FIXTURES_ROOT 4— y las que nombran el destino sin prefijo
# son de otras herramientas (ANDROID_SDK_ROOT, DOTNET_ROOT, GOENV_ROOT). La
# forma es <PRODUCTO>_<QUE ES>_ROOT, y `reach` es la palabra del propio binario
# para el mecanismo.
check("la primera es la del lector", "THYROX_REACH_ROOT", reach.TREE_ROOT_VARS[0])
check("la heredada queda de segunda", "KAUPAMEX_ROOT", reach.TREE_ROOT_VARS[1])
check("el tramo extra sigue la misma forma", "THYROX_EXTRA_REACH_ROOTS", reach.EXTRA_ROOTS_VARS[0])
check("y su heredada", "KAUPAMEX_EXTRA_ROOTS", reach.EXTRA_ROOTS_VARS[1])
check("la constante por raíz nombra al lector", "THYROX_REACH_API", reach.env_names("api")[0])
check("y admite la heredada", "KAUPAMEX_API", reach.env_names("api")[1])
with tempfile.TemporaryDirectory() as tmp:
    base = pathlib.Path(tmp)
    start = build_tree(base)
    segunda = base / "por-la-segunda"
    segunda.mkdir()
    if len(reach.TREE_ROOT_VARS) > 1:
        clean_env()
        os.environ[reach.TREE_ROOT_VARS[0]] = str(base)
        os.environ[reach.TREE_ROOT_VARS[1]] = str(segunda)
        check("gana la primera de la tupla", base, reach.tree_root(start=start))
        del os.environ[reach.TREE_ROOT_VARS[0]]
        check("control — retirada la primera, manda la segunda", segunda, reach.tree_root(start=start))

print("\n6. El tramo extra exige rutas absolutas")
clean_env()
os.environ[reach.EXTRA_ROOTS_VARS[0]] = "/home/user/thyrox"
check("una raíz extra absoluta entra", True, "thyrox" in reach.extra_roots())
os.environ[reach.EXTRA_ROOTS_VARS[0]] = "relativa/no"
check_raises("una relativa rehúsa", reach.ReachRootError, reach.extra_roots)
clean_env()

print("\n7. Rehúsa nombrando, nunca devuelve un conjunto corto")
check_raises("raíz desconocida rehúsa", KeyError, lambda: reach.clone_name("no-existe"))
with tempfile.TemporaryDirectory() as tmp:
    base = pathlib.Path(tmp)
    start = build_tree(base)
    clean_env()
    os.environ["THYROX_REACH_ROOT"] = str(base)
    check_raises(
        "require_all rehúsa si falta una raíz",
        reach.ReachRootError,
        lambda: reach.require_all(start=start),
    )
clean_env()

print("\n8. El CLI sobrevive a que le cierren la salida")
clean_env()  # el subproceso HEREDA el environ: sin esto dependería del bloque 7
# Un consumidor que hace `reach.py --list | head -3` cierra el pipe antes de
# que el guion termine de escribir. Sin tratarlo, Python vuelca un traceback de
# BrokenPipeError por stderr: ruido que se lee como fallo del mecanismo cuando
# es conducta normal de una tubería.
import subprocess

_completado = subprocess.run(
    f"python3 {THYROX_ROOT / 'src' / 'paths' / 'reach.py'} --list | head -1",
    shell=True, capture_output=True, text=True,
)
check("no vuelca traceback por stderr", "", _completado.stderr.strip())
check("y sale sin error", 0, _completado.returncode)

print("\n9. thyrox se localiza a SÍ MISMO por mecanismo, no por aritmética (#146)")
# `reach.root()` alcanza los clones kaupamex-*; lo que faltaba era la raíz de
# thyrox, que hoy sólo se deriva con `parents[N]` — la aritmética que
# H-DOCS-1103 midió apuntando a un directorio que nunca existió. La precedencia
# es la misma que install.sh ya escribe: variable declarada, luego ascenso.
with tempfile.TemporaryDirectory() as tmp:
    base = pathlib.Path(tmp)
    falso = base / "thyrox"                       # se LLAMA thyrox y no lo es
    (falso / "src").mkdir(parents=True)
    real = base / "otro-nombre"                   # NO se llama thyrox y sí lo es
    (real / "src" / "paths").mkdir(parents=True)
    (real / "src" / "paths" / "reach.py").write_text("", encoding="utf-8")
    hondo = real / "src" / "gates" / "sub"
    hondo.mkdir(parents=True)

    clean_env()
    os.environ["THYROX_ROOT"] = str(falso)
    check("THYROX_ROOT declarada gana", falso, reach.thyrox_root(start=hondo))

    # Control: retirada la variable, el veredicto DEBE cambiar al ascenso.
    del os.environ["THYROX_ROOT"]
    check("control — sin la variable, asciende hasta el marcador",
          real, reach.thyrox_root(start=hondo))
    check("y acierta desde cualquier profundidad",
          real, reach.thyrox_root(start=real / "src"))

    # El marcador es el ARCHIVO, no el nombre del directorio: por eso el
    # localizador sobrevive a una copia o a un renombre del clon.
    vacio = base / "sin-arbol"
    vacio.mkdir()
    os.environ["THYROX_REACH_ROOT"] = str(vacio)
    check_raises("un directorio llamado thyrox sin el marcador no cuenta",
                 reach.ReachRootError,
                 lambda: reach.thyrox_root(start=falso / "src"))
clean_env()

print("\n10. desde un consumidor, lo resuelve el MECANISMO multi-repo (#146)")
# El ascenso no puede alcanzar thyrox desde un kaupamex-*: es su HERMANO, no
# su ancestro. Medido desde /home/user/kaupamex-api, el ascenso rehúsa. Pero
# `tree_root()` ya sabe dónde está el padre de los clones, y ahí thyrox es un
# hijo más — así que exigir THYROX_ROOT declarada era pedir un parámetro que
# el mecanismo podía derivar. La variable queda como override, no como
# requisito.
with tempfile.TemporaryDirectory() as tmp:
    base = pathlib.Path(tmp)
    start = build_tree(base)                      # los clones kaupamex-*
    proveedor = base / "thyrox"           # build_tree ya creó su src/paths
    marcador = proveedor / "src" / "paths" / "reach.py"
    marcador.write_text("", encoding="utf-8")

    # El start es el CONSUMIDOR, no un archivo de thyrox: ahí el ascenso no
    # llega, y por eso este bloque discrimina. Con start dentro de thyrox el
    # caso pasaría sin implementar nada — el sub-patrón D en el propio control.
    consumidor = base / "kaupamex-api"
    clean_env()
    os.environ["THYROX_REACH_ROOT"] = str(base)
    check("sin THYROX_ROOT, lo halla como hermano de los clones",
          proveedor, reach.thyrox_root(start=consumidor))

    # Control: el hermano se valida por el MARCADOR, no por su nombre. Sin el
    # archivo dentro, el veredicto DEBE cambiar a rehusar.
    marcador.unlink()
    check_raises("control — un hermano llamado thyrox sin marcador no basta",
                 reach.ReachRootError,
                 lambda: reach.thyrox_root(start=consumidor))
clean_env()

print(f"\nresultado: {PASS} de {PASS + FAIL} aserciones en verde")
sys.exit(1 if FAIL else 0)
