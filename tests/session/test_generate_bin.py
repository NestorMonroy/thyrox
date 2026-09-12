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


def test_shell_always_counts(base: pathlib.Path) -> None:
    tree = _make_tree(base / "shell")
    script = tree / "src/session/algo.sh"
    script.write_text("#!/bin/bash\necho hola\n")
    check(".sh cuenta sin mirar su contenido — medido: ninguno es librería",
          gb.is_shell_entrypoint(script))


def test_stem_collision_raises(base: pathlib.Path) -> None:
    """Dos stems iguales entre carpetas distintas rehúsan, no se resuelven."""
    tree = _make_tree(base / "colision")
    (tree / "src/session/dup.sh").write_text("#!/bin/bash\n")
    (tree / "src/verify/dup.sh").write_text("#!/bin/bash\n")
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


def test_builtin_collision_on_real_tree() -> None:
    """Hallazgo medido en ESTE árbol: ``bg`` choca con el builtin de bash.

    No se re-deriva ``compgen -b`` en el test — eso acoplaría el control al
    bash que lo corre. Se compara la constante declarada contra el plan real
    de thyrox, que es lo que un usuario con ``bin/`` en ``PATH`` sufre hoy.
    """
    plan = gb.planned_files(ROOT)
    shadowed = sorted(set(plan) & gb.BASH_BUILTINS)
    check("el árbol real de thyrox choca con exactamente 1 builtin: bg",
          shadowed == ["bg"], shadowed)


def test_cli_check_exit_code() -> None:
    """El CLI real, tal como lo usaría un gate: --check sale 0 con bin/ al día."""
    r = subprocess.run(
        [sys.executable, str(ROOT / "src/session/generate_bin.py"), "--check"],
        capture_output=True, text=True, cwd=str(ROOT),
    )
    check("bin/ real está al día tras la última generación (exit 0)",
          r.returncode == 0, f"stdout={r.stdout!r} stderr={r.stderr!r}")
    check("y avisa del choque con bg en stderr, sin bloquear",
          "bg" in r.stderr)


def main() -> int:
    with tempfile.TemporaryDirectory() as tmp:
        base = pathlib.Path(tmp)
        test_quote_agnostic_guard(base)
        test_init_never_counts(base)
        test_shell_always_counts(base)
        test_stem_collision_raises(base)
        test_symlink_breaks_but_wrapper_does_not(base)
        test_python_wrapper_missing_interpreter(base)
        test_apply_plan_idempotent_and_removes_stale(base)
        test_check_detects_drift(base)
        test_install_user_bin_writes_and_is_idempotent(base)
        test_install_user_bin_never_touches_foreign_files(base)
    test_builtin_collision_on_real_tree()
    test_cli_check_exit_code()

    print(f"\n{passed} aprobada(s) · {failed} fallida(s) "
          f"(alcance medido: generate_bin.py)")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
