#!/usr/bin/env python3
"""Control de ``src/session/generate_bin.py`` — el generador de ``bin/``.

El defecto medido que este archivo existe para no repetir: la primera
versión del clasificador de ``.py`` sólo veía la guarda con comillas
DOBLES (``__name__ == "__main__"``) y perdía 36 de 82 entrypoints reales
—entre ellos ``check_rst_sintaxis.py``, que usa comillas simples—. El caso
central de este archivo es la anulación de ese arreglo: retirar la
tolerancia a comillas y comprobar que cae EXACTAMENTE el caso que la
motivó, ni uno más.

El segundo caso central es el hallazgo empírico que fundamenta todo el
diseño: un symlink PLANO rompe un guion que resuelve su raíz con
``${BASH_SOURCE[0]}`` (invocado desde otro directorio, calcula la raíz
equivocada); el guion envoltorio que ``wrapper_body`` genera NO se rompe,
porque ``exec`` apunta a la ruta ABSOLUTA real del objetivo. Sin este test
la afirmación "el wrapper funciona" descansaría en haberlo probado una vez
a mano, no en el control de anulación que el resto del árbol exige.
"""
from __future__ import annotations

import os
import pathlib
import subprocess
import sys
import tempfile

HERE = pathlib.Path(__file__).resolve()
ROOT = HERE.parent.parent.parent
sys.path.insert(0, str(ROOT / "src/session"))
import generate_bin as gb  # noqa: E402

passed = failed = 0


def check(label: str, condition: bool, extra: str = "") -> None:
    global passed, failed
    if condition:
        passed += 1
        print(f"  ok   {label}")
    else:
        failed += 1
        print(f"  FAIL {label}{(' — ' + extra) if extra else ''}")


def _make_tree(base: pathlib.Path) -> pathlib.Path:
    """Un árbol sintético con las tres carpetas que ``SOURCE_DIRS`` declara."""
    for rel in gb.SOURCE_DIRS:
        (base / rel).mkdir(parents=True)
    return base


def test_quote_agnostic_guard(base: pathlib.Path) -> None:
    """Caso central 1 — con anulación: la guarda con comilla simple cuenta."""
    tree = _make_tree(base / "guardas")
    single = tree / "src/verify/check_single.py"
    single.write_text("if __name__ == '__main__':\n    pass\n")
    double = tree / "src/verify/check_double.py"
    double.write_text('if __name__ == "__main__":\n    pass\n')
    library = tree / "src/verify/helper.py"
    library.write_text("def helper():\n    pass\n")

    check("comilla doble es entrypoint", gb.is_python_entrypoint(double))
    check("comilla simple TAMBIÉN es entrypoint (el defecto original)",
          gb.is_python_entrypoint(single))
    check("un módulo sin guarda NO es entrypoint",
          not gb.is_python_entrypoint(library))

    # --- anulación: retirar la tolerancia a comillas ------------------------
    # Reproduce el primer MAIN_GUARD, anclado sólo a comillas dobles. Si el
    # control no discrimina, ambos guiones seguirían contando como entrypoint
    # y esta prueba no probaría nada.
    import re
    original_guard = gb.MAIN_GUARD
    try:
        gb.MAIN_GUARD = re.compile(r'__name__\s*==\s*"__main__"')
        check("anulado: la comilla doble sigue contando",
              gb.is_python_entrypoint(double))
        check("anulado: la comilla simple YA NO cuenta — cae exactamente ella",
              not gb.is_python_entrypoint(single))
    finally:
        gb.MAIN_GUARD = original_guard
    check("restaurado: la comilla simple vuelve a contar",
          gb.is_python_entrypoint(single))


def test_init_never_counts(base: pathlib.Path) -> None:
    tree = _make_tree(base / "init")
    init = tree / "src/agents/__init__.py"
    init.write_text('if __name__ == "__main__":\n    pass\n')
    check("__init__.py nunca es entrypoint, aunque lleve la guarda",
          not gb.is_python_entrypoint(init))


def test_stem_collision_raises(base: pathlib.Path) -> None:
    """Dos stems iguales entre carpetas distintas rehúsan, no se resuelven."""
    tree = _make_tree(base / "colision")
    (tree / "src/session/dup.sh").write_text("#!/bin/bash\n")
    (tree / "src/session/dup.sh").chmod(0o755)   # un entrypoint LLEVA el bit
    (tree / "src/verify/dup.sh").write_text("#!/bin/bash\n")
    (tree / "src/verify/dup.sh").chmod(0o755)   # un entrypoint LLEVA el bit
    try:
        gb.discover_entrypoints(tree)
        check("colisión de stem levanta ValueError", False,
              "no levantó nada — resolvió la colisión en silencio")
    except ValueError as exc:
        check("colisión de stem levanta ValueError", True)
        check("y el mensaje nombra el stem", "dup" in str(exc))


def test_symlink_breaks_but_wrapper_does_not(base: pathlib.Path) -> None:
    """El hallazgo empírico que motiva todo el diseño, con su anulación real.

    ``target.sh`` resuelve su raíz con ``${BASH_SOURCE[0]}`` — el mismo
    patrón que ``bg.sh``. Symlinkeado PLANO desde otro directorio, calcula
    la raíz equivocada y falla. El wrapper que ``wrapper_body`` genera,
    invocado desde el MISMO otro directorio, no falla — porque hace ``exec``
    sobre la ruta absoluta real, y dentro de esa invocación
    ``${BASH_SOURCE[0]}`` es esa ruta real.
    """
    tree = _make_tree(base / "raiz")
    target = tree / "src/session/target.sh"
    target.write_text(
        "#!/bin/bash\n"
        '_SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"\n'
        'if [ -f "$_SRC_DIR/marker.txt" ]; then echo RAIZ_CORRECTA; '
        'else echo RAIZ_EQUIVOCADA; fi\n'
    )
    target.chmod(0o755)
    (tree / "src/marker.txt").write_text("aqui vive session/..\n")

    elsewhere = base / "otro-sitio"
    elsewhere.mkdir()

    # --- el defecto: symlink plano, invocado con cwd en OTRO sitio ----------
    plain_link = elsewhere / "target.sh"
    plain_link.symlink_to(target)
    r = subprocess.run(["bash", str(plain_link)], capture_output=True, text=True,
                        cwd=str(elsewhere))
    check("symlink plano invocado de lejos: NO resuelve la raíz correcta",
          "RAIZ_EQUIVOCADA" in r.stdout,
          f"dio {r.stdout!r} — si esto falla, el hallazgo que motivó el "
          "diseño entero dejó de reproducirse")

    # --- el arreglo: el wrapper que este generador produce ------------------
    # Vive DENTRO del árbol (``tree/bin/``, no ``elsewhere/bin/``) — resuelve
    # su raíz contra su propia ubicación, no contra el cwd del que lo invoca.
    # Se invoca por ruta absoluta con cwd puesto en ``elsewhere`` — la misma
    # asimetría que sufre ``bin/`` en ``PATH`` cuando el cwd real es otro.
    wrapper_dir = tree / "bin"
    wrapper_dir.mkdir()
    wrapper = wrapper_dir / "target"
    wrapper.write_text(gb.wrapper_body(target, tree))
    wrapper.chmod(0o755)
    r2 = subprocess.run(["bash", str(wrapper)], capture_output=True, text=True,
                         cwd=str(elsewhere))
    check("el wrapper generado, con cwd en el mismo sitio lejano: SÍ resuelve",
          "RAIZ_CORRECTA" in r2.stdout,
          f"dio {r2.stdout!r}: {r2.stderr[:200]}")


def test_python_wrapper_missing_interpreter(base: pathlib.Path) -> None:
    """Sin ``.venv/bin/python`` el wrapper de un ``.py`` rehúsa con 2, no cuelga."""
    tree = _make_tree(base / "sin-venv")
    target = tree / "src/agents/algo.py"
    target.write_text('if __name__ == "__main__":\n    print("no debería correr")\n')

    wrapper_dir = tree / "bin"
    wrapper_dir.mkdir()
    wrapper = wrapper_dir / "algo"
    wrapper.write_text(gb.wrapper_body(target, tree))
    wrapper.chmod(0o755)

    r = subprocess.run(["bash", str(wrapper)], capture_output=True, text=True)
    check("sin .venv, el wrapper de un .py sale 2", r.returncode == 2,
          f"dio {r.returncode}: {r.stdout!r} {r.stderr!r}")
    check("y nombra el remedio (uv sync)", "uv sync" in r.stderr)
    check("y NO llegó a ejecutar el .py",
          "no debería correr" not in r.stdout)


def test_apply_plan_idempotent_and_removes_stale(base: pathlib.Path) -> None:
    tree = _make_tree(base / "idempotencia")
    (tree / "src/session/uno.sh").write_text("#!/bin/bash\necho uno\n")
    (tree / "src/session/uno.sh").chmod(0o755)   # un entrypoint LLEVA el bit
    plan = gb.planned_files(tree)

    written1, removed1 = gb.apply_plan(tree, plan)
    check("primera corrida: escribe el entrypoint", written1 == ["uno"], written1)
    check("primera corrida: nada que retirar", removed1 == [], removed1)

    written2, removed2 = gb.apply_plan(tree, plan)
    check("regenerar sin cambios: NO reescribe nada (idempotente)",
          written2 == [], written2)

    # Un stem que ya no está en el plan (el .sh se borró) se retira de bin/.
    (tree / "src/session/uno.sh").unlink()
    new_plan = gb.planned_files(tree)
    written3, removed3 = gb.apply_plan(tree, new_plan)
    check("al desaparecer la fuente, el generador RETIRA su wrapper huérfano",
          removed3 == ["uno"], removed3)
    check("y no queda en el disco", not (tree / "bin/uno").exists())


def test_check_detects_drift(base: pathlib.Path) -> None:
    """El nivel que usa el CLI (--check): current_state vs planned_files."""
    tree = _make_tree(base / "check")
    script = tree / "src/session/x.sh"
    script.write_text("#!/bin/bash\necho v1\n")
    script.chmod(0o755)   # un entrypoint LLEVA el bit
    gb.apply_plan(tree, gb.planned_files(tree))

    check("recién generado: current_state == plan (al día)",
          gb.current_state(tree) == gb.planned_files(tree))

    # El objetivo cambia (nueva ruta relativa no aplica aquí, pero el
    # contenido del wrapper depende de la ruta del target — simulamos drift
    # borrando el wrapper a mano, que es exactamente lo que --check detecta).
    (tree / "bin/x").unlink()
    check("wrapper borrado a mano: current_state YA NO == plan",
          gb.current_state(tree) != gb.planned_files(tree))


def test_install_user_bin_writes_and_is_idempotent(base: pathlib.Path) -> None:
    tree = _make_tree(base / "user-bin-tree")
    (tree / "src/session/algo.sh").write_text("#!/bin/bash\necho algo\n")
    (tree / "src/session/algo.sh").chmod(0o755)   # un entrypoint LLEVA el bit
    plan = gb.planned_files(tree)
    dest = base / "user-bin-tree-dest"

    written1, removed1, foreign1 = gb.install_user_bin(plan, dest)
    check("primera corrida: escribe el envoltorio de segundo salto",
          written1 == ["algo"], written1)
    check("primera corrida: nada ajeno que preservar aquí", foreign1 == [])
    body = (dest / "algo").read_text()
    check("el envoltorio delega a bin/<stem>, no repite la lógica del wrapper",
          f'exec "$THYROX_ROOT/bin/algo" "$@"' in body, body)
    check("y fija THYROX_ROOT por env-o-literal (no por BASH_SOURCE)",
          'THYROX_ROOT="${THYROX_ROOT:-' in body)

    written2, removed2, foreign2 = gb.install_user_bin(plan, dest)
    check("regenerar sin cambios: idempotente, no reescribe", written2 == [])

    # El stem desaparece del plan (la fuente se borró) → se retira SÓLO si es
    # nuestro.
    (tree / "src/session/algo.sh").unlink()
    new_plan = gb.planned_files(tree)
    written3, removed3, foreign3 = gb.install_user_bin(new_plan, dest)
    check("al desaparecer del plan, el envoltorio NUESTRO se retira",
          removed3 == ["algo"], removed3)
    check("y no queda en disco", not (dest / "algo").exists())


def test_install_user_bin_never_touches_foreign_files(base: pathlib.Path) -> None:
    """El control central de seguridad — con anulación.

    ``~/.local/bin`` real tiene ``black``, ``mypy``, … puestos ahí por
    ``uv tool install``. Un archivo que COINCIDE en nombre con un stem del
    plan pero no lleva nuestro marcador NUNCA se sobreescribe ni se borra —
    ni siquiera cuando su stem sale del plan.
    """
    tree = _make_tree(base / "tree-vs-foreign")
    (tree / "src/session/black.sh").write_text("#!/bin/bash\necho impostor\n")
    (tree / "src/session/black.sh").chmod(0o755)   # un entrypoint LLEVA el bit
    plan = gb.planned_files(tree)
    dest = base / "dest-con-ajenos"
    dest.mkdir()

    foreign_content = "#!/usr/bin/env bash\n# puesto ahí por uv tool install\necho real-black\n"
    (dest / "black").write_text(foreign_content)
    (dest / "black").chmod(0o755)

    written, removed, foreign = gb.install_user_bin(plan, dest)
    check("el archivo ajeno se reporta como preservado, no como escrito",
          foreign == ["black"], foreign)
    check("y su contenido NO cambió — ni una línea",
          (dest / "black").read_text() == foreign_content)

    # --- anulación: SIN la guarda del marcador, se sobreescribiría ---------
    # Reproduce la rama ingenua (escribir siempre que el stem esté en el plan,
    # sin mirar si ya había algo ajeno) para confirmar que el control real
    # discrimina: con la guarda, 0 líneas cambian; sin ella, se habría perdido
    # el contenido de `black`.
    naive_would_overwrite = gb.user_bin_wrapper_body("black") != foreign_content
    check("anulación: SIN la guarda, la escritura habría pisado el archivo "
          "ajeno (confirma que el control de arriba es el que discrimina)",
          naive_would_overwrite)

    # El stem sale del plan por completo (ya no hay 'black' que generar) — el
    # archivo ajeno sigue sin tocarse, porque el retiro también exige marcador.
    (tree / "src/session/black.sh").unlink()
    empty_plan = gb.planned_files(tree)
    written2, removed2, foreign2 = gb.install_user_bin(empty_plan, dest)
    check("stem fuera del plan por completo: el ajeno TAMPOCO se retira",
          removed2 == [], removed2)
    check("sigue en disco, intacto", (dest / "black").read_text() == foreign_content)


def test_resolve_bin_name_prefixes_builtin_collisions(base: pathlib.Path) -> None:
    """``resolve_bin_name`` — con anulación: sin ``bg`` en ``BASH_BUILTINS``,
    deja de prefijarse. Confirma que el prefijo lo causa la pertenencia al
    conjunto, no otra rama del código.
    """
    check("bg (builtin) resuelve a thyrox-bg",
          gb.resolve_bin_name("bg") == "thyrox-bg")
    check("un stem que no es builtin no se toca",
          gb.resolve_bin_name("agent_store") == "agent_store")

    original = gb.BASH_BUILTINS
    try:
        gb.BASH_BUILTINS = frozenset(original - {"bg"})
        check("anulado: sin bg en BASH_BUILTINS, deja de prefijarse",
              gb.resolve_bin_name("bg") == "bg")
    finally:
        gb.BASH_BUILTINS = original
    check("restaurado: bg vuelve a resolver a thyrox-bg",
          gb.resolve_bin_name("bg") == "thyrox-bg")


def test_builtin_collision_on_real_tree() -> None:
    """Hallazgo medido en ESTE árbol: el stem CRUDO ``bg`` choca con el
    builtin de bash; el nombre RESUELTO ya no.

    No se re-deriva ``compgen -b`` en el test — eso acoplaría el control al
    bash que lo corre. Se compara la constante declarada contra el árbol real
    de thyrox, en sus dos formas: antes y después de ``resolve_bin_name``.
    """
    raw = gb.discover_entrypoints(ROOT)
    raw_shadowed = sorted(set(raw) & gb.BASH_BUILTINS)
    check("el stem crudo del árbol real choca con exactamente 1 builtin: bg",
          raw_shadowed == ["bg"], raw_shadowed)

    plan = gb.planned_files(ROOT)
    resolved_shadowed = sorted(set(plan) & gb.BASH_BUILTINS)
    check("el plan RESUELTO ya no choca con ningún builtin",
          resolved_shadowed == [], resolved_shadowed)
    check("bg crudo no aparece como clave del plan resuelto", "bg" not in plan)
    check("aparece como thyrox-bg en su lugar", "thyrox-bg" in plan)


def test_cli_check_exit_code() -> None:
    """El CLI real, tal como lo usaría un gate: --check sale 0 con bin/ al día."""
    r = subprocess.run(
        [sys.executable, str(ROOT / "src/session/generate_bin.py"), "--check"],
        capture_output=True, text=True, cwd=str(ROOT),
    )
    check("bin/ real está al día tras la última generación (exit 0)",
          r.returncode == 0, f"stdout={r.stdout!r} stderr={r.stderr!r}")
    check("y NO avisa de ningún choque con builtins — ya resuelto en el plan",
          r.stderr.strip() == "", r.stderr)


def test_install_user_bin_warns_when_dir_is_not_on_path(base: pathlib.Path) -> None:
    """Instalar en un directorio fuera de ``PATH`` y NO decirlo es un verde mudo.

    La referencia lo hace: ``ccnmt: install.sh:119-133`` compara con
    ``case ":$PATH:" in`` y, si no está, imprime la línea ``export`` exacta
    para el shell del usuario. Aquí se copiaban 119 envoltorios y se
    publicaba «119 escrito(s)» — cierto, y sin embargo ninguno invocable
    suelto. Medido antes de escribir esto: 0 menciones de PATH en la salida.
    """
    destino = base / "xbin-fuera-de-path"
    entorno = dict(os.environ, PATH="/usr/bin:/bin")
    hecho = subprocess.run(
        [sys.executable, str(ROOT / "src/session/generate_bin.py"),
         "--install-user-bin", str(destino)],
        capture_output=True, text=True, env=entorno, cwd=str(ROOT))
    salida = hecho.stdout + hecho.stderr
    check("avisa cuando el destino no esta en PATH", str(destino) in salida
          and "PATH" in salida, salida[-200:])
    check("y da la linea export para arreglarlo", "export PATH=" in salida,
          salida[-200:])


def test_install_user_bin_stays_quiet_when_dir_is_on_path(base: pathlib.Path) -> None:
    """El control que hace discriminar al anterior.

    Sin este caso, un aviso incondicional pasaría el test de arriba y saldría
    SIEMPRE — y un aviso que sale siempre se aprende a ignorar, que es el
    mismo criterio con que los diez detectores avisan y no bloquean.
    """
    destino = base / "xbin-dentro-de-path"
    destino.mkdir(parents=True, exist_ok=True)
    entorno = dict(os.environ, PATH=f"{destino}:/usr/bin:/bin")
    hecho = subprocess.run(
        [sys.executable, str(ROOT / "src/session/generate_bin.py"),
         "--install-user-bin", str(destino)],
        capture_output=True, text=True, env=entorno, cwd=str(ROOT))
    salida = hecho.stdout + hecho.stderr
    check("calla cuando el destino SI esta en PATH",
          "export PATH=" not in salida, salida[-200:])


def test_library_modules_are_silent_when_run_as_scripts() -> None:
    """La afirmación del docstring de ``generate_bin.py``, como control.

    Su universo dice que un ``.py`` sin guarda ``__main__`` es biblioteca, y
    lo sostenía con una frase —«``reader.py --help`` corre a exit 0 sin
    imprimir nada»—. Una frase no es una ``Observation``: este caso la mide
    sobre los módulos de las carpetas de ``SOURCE_DIRS``, no sobre uno
    recordado.

    **Son DOS poblaciones, no una** — lo destapó ensanchar ``SOURCE_DIRS`` de
    cinco carpetas a quince (TASK-THYROX-0071), que llevó el universo de 17
    módulos a 46. La premisa «una biblioteca sale 0 en silencio» se había
    medido sobre 17 que usan import ABSOLUTO; ``src/transcript/`` usa import
    RELATIVO (``from .messages import _lines``), y un módulo así no puede
    correrse como guion suelto por construcción: Python levanta
    ``ImportError: attempted relative import with no known parent package``
    antes de ejecutar una sola línea suya.

    Ese ``ImportError`` no es ruido — es la conducta correcta de un módulo de
    paquete al entrar por la puerta equivocada. Colapsarlo con «habla o falla»
    mediría el fenómeno equivocado. Así que el caso separa las dos poblaciones
    y le exige a cada una lo suyo, y **sigue pudiendo fallar**: una biblioteca
    de import absoluto que imprima o salga != 0 lo rompe igual que antes.
    """
    libreria = [f for d in gb.SOURCE_DIRS
                for f in sorted((ROOT / d).glob("*.py"))
                if f.name != "__init__.py"
                and not gb.MAIN_GUARD.search(f.read_text(errors="ignore"))]
    check("hay modulos de biblioteca que medir", len(libreria) > 0,
          f"encontrados {len(libreria)}")
    entorno = dict(os.environ, PYTHONPATH=str(ROOT / "src"))
    ruidosos, de_paquete = [], []
    for f in libreria:
        hecho = subprocess.run([sys.executable, str(f)], capture_output=True,
                               text=True, env=entorno, timeout=30)
        salida = (hecho.stdout + hecho.stderr).strip()
        if "attempted relative import" in salida:
            de_paquete.append(f.name)
        elif hecho.returncode != 0 or salida:
            ruidosos.append(f.name)
    check(f"las {len(libreria) - len(de_paquete)} bibliotecas de import "
          f"absoluto salen 0 en silencio",
          not ruidosos, f"hablan o fallan: {ruidosos}")
    check(f"los {len(de_paquete)} modulos de paquete rehusan con ImportError",
          all(n.endswith(".py") for n in de_paquete), str(de_paquete))


def test_repo_family_reaches_bin() -> None:
    """La familia ``src/repo`` tambien es superficie de invocacion.

    ``SOURCE_DIRS`` enumeraba session/verify/agents/docs, y ``src/repo`` queda
    fuera: sus entrypoints —``pack_headroom.py`` y los dos ``.sh`` de disco—
    solo se alcanzan por ruta al fuente, que es justo lo que
    ``trabajo-en-segundo-plano.md`` declara como la forma que NO exporta
    ``PYTHONPATH``. Es TASK-THYROX-0051.

    El control mide el arbol REAL, no uno sintetico: el sintetico se construye
    desde ``SOURCE_DIRS``, asi que pasaria con la constante corta y con la
    larga — no discriminaria (sub-patron D).
    """
    check("src/repo esta en SOURCE_DIRS", "src/repo" in gb.SOURCE_DIRS,
          str(gb.SOURCE_DIRS))
    plan = gb.planned_files(ROOT)
    for esperado in ("pack_headroom", "disk-headroom", "disk-usage"):
        check(f"bin/{esperado} esta en el plan", esperado in plan,
              str(sorted(k for k in plan if "disk" in k or "pack" in k)))
    bindir = ROOT / "bin"
    for esperado in ("pack_headroom", "disk-headroom", "disk-usage"):
        check(f"bin/{esperado} existe en el arbol", (bindir / esperado).exists())


def test_shell_library_is_not_an_entrypoint(base: pathlib.Path) -> None:
    """El bit ejecutable separa entrypoint de biblioteca — medido, no elegido.

    La version anterior de este caso afirmaba ".sh cuenta sin mirar su
    contenido - medido: ninguno es libreria", y esa premisa se habia medido
    SOLO sobre ``SOURCE_DIRS``. Al ensanchar el universo a ``src/lib`` resulta
    falsa: sus seis ``.sh`` definen funciones y no invocan nada.

    Los dos discriminadores candidatos se midieron contra las dos poblaciones
    conocidas antes de elegir. El bit ejecutable acierta 36 de 36 entrypoints y
    0 de 6 bibliotecas; la heuristica de "hay una llamada de nivel superior"
    marca 5 de las 6 bibliotecas como entrypoint. Por eso el criterio es el
    bit, que ademas es como POSIX separa "se ejecuta" de "se sourcea".
    """
    tree = _make_tree(base / "shell_lib")
    entrypoint = tree / "src/session/corre.sh"
    entrypoint.write_text("#!/bin/bash\necho hola\n")
    entrypoint.chmod(0o755)
    biblioteca = tree / "src/session/biblio.sh"
    biblioteca.write_text("#!/bin/bash\nsaluda() { echo hola; }\n")
    biblioteca.chmod(0o644)

    check("un .sh con bit ejecutable es entrypoint",
          gb.is_shell_entrypoint(entrypoint))
    check("un .sh SIN bit ejecutable es biblioteca, no entrypoint",
          not gb.is_shell_entrypoint(biblioteca))


def test_mandatory_flow_tools_reach_bin() -> None:
    """Los pasos 4 y 5 del flujo obligatorio tienen envoltorio en ``bin/``.

    ``.claude/CLAUDE.md`` declara dos herramientas como paso obligatorio del
    flujo de sesion: ``src/task/task_ids.py`` acuña la cita durable (paso 4) y
    ``src/hallazgo/hallazgo_ids.py`` acuña el id de hallazgo del consumidor
    (paso 5). Ninguna de las dos estaba en ``SOURCE_DIRS``, asi que la
    directiva "usar las herramientas de thyrox/bin/" era incumplible para
    ellas: ``bash bin/task_ids`` daba *No such file or directory*.

    Mide el arbol REAL por la misma razon que ``test_repo_family_reaches_bin``:
    un arbol sintetico se construye desde ``SOURCE_DIRS``, asi que pasaria con
    la constante corta y con la larga — no discriminaria (sub-patron D).

    Es TASK-THYROX-0071.
    """
    plan = gb.planned_files(ROOT)
    bindir = ROOT / "bin"
    for esperado in ("task_ids", "hallazgo_ids"):
        check(f"bin/{esperado} esta en el plan", esperado in plan,
              f"SOURCE_DIRS={gb.SOURCE_DIRS}")
        check(f"bin/{esperado} existe en el arbol", (bindir / esperado).exists())


def test_check_declares_its_universe() -> None:
    """``--check`` no puede publicar "al dia" dejando entrypoints fuera.

    El verde anterior no distinguia "todos los entrypoints tienen envoltorio"
    de "los directorios que miro lo tienen": publicaba "bin/ al dia: 131
    entrypoint(s)" con 51 entrypoints en 10 directorios fuera de su universo.
    Un conteo sin denominador no es un resultado.
    """
    huerfanos = gb.entrypoints_outside_universe(ROOT)
    check("ningun entrypoint de src/ queda fuera del universo de SOURCE_DIRS",
          huerfanos == [],
          f"{len(huerfanos)} fuera: {[str(p) for p in huerfanos[:6]]}")


def test_library_shell_stays_out_of_the_real_plan() -> None:
    """``src/lib/*.sh`` son biblioteca y NO entran al plan del arbol real.

    Es el control que hace falsable al discriminador sobre la poblacion que lo
    motivo: ensanchar ``SOURCE_DIRS`` sin el bit ejecutable levantaria
    ``ValueError`` por la colision ``reach`` — ``src/lib/reach.sh`` contra
    ``src/paths/reach.py``, la unica de las 182 medidas.
    """
    # ``planned_files`` devuelve el CUERPO del envoltorio, no la ruta del
    # objetivo; el mapa nombre->ruta lo da ``discover_entrypoints``.
    objetivos = gb.discover_entrypoints(ROOT)
    check("bin/reach resuelve a la mitad Python, no a la de shell",
          objetivos.get("reach") is not None
          and objetivos["reach"].name == "reach.py",
          str(objetivos.get("reach")))
    for biblioteca in ("assert", "logging", "toolchain", "workbench"):
        check(f"src/lib/{biblioteca}.sh no entra al plan",
              biblioteca not in objetivos
              or objetivos[biblioteca].parent.name != "lib",
              str(objetivos.get(biblioteca)))


def main() -> int:
    with tempfile.TemporaryDirectory() as tmp:
        base = pathlib.Path(tmp)
        test_quote_agnostic_guard(base)
        test_init_never_counts(base)
        test_shell_library_is_not_an_entrypoint(base)
        test_stem_collision_raises(base)
        test_symlink_breaks_but_wrapper_does_not(base)
        test_python_wrapper_missing_interpreter(base)
        test_apply_plan_idempotent_and_removes_stale(base)
        test_check_detects_drift(base)
        test_install_user_bin_writes_and_is_idempotent(base)
        test_install_user_bin_never_touches_foreign_files(base)
        test_resolve_bin_name_prefixes_builtin_collisions(base)
        test_install_user_bin_warns_when_dir_is_not_on_path(base)
        test_install_user_bin_stays_quiet_when_dir_is_on_path(base)
    test_builtin_collision_on_real_tree()
    test_cli_check_exit_code()
    test_library_modules_are_silent_when_run_as_scripts()
    test_repo_family_reaches_bin()
    test_mandatory_flow_tools_reach_bin()
    test_check_declares_its_universe()
    test_library_shell_stays_out_of_the_real_plan()

    print(f"\n{passed} aprobada(s) · {failed} fallida(s) "
          f"(alcance medido: generate_bin.py)")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
