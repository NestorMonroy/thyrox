"""Suite del gate de segundo plano.

El control que importa no es «avisa cuando hay suite» —eso pasaría igual con y
sin el descuento de `ALREADY_BACKGROUND`— sino que **calle** cuando el comando
ya viaja por el mecanismo. Un detector sin ese descuento avisa en el mismo
lanzamiento que cumple la regla, y un aviso que sale siempre se ignora.
"""
from __future__ import annotations

import importlib.util
import pathlib
import sys

# El bootstrap de UNA linea es la unica aritmetica que el gate admite,
# y la unica que el localizador no puede reemplazar: no se puede pedir
# `reach.thyrox_root()` antes de que `import reach` funcione.
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "src"))
from paths import reach  # noqa: E402

_MODULE = reach.thyrox_root() / "src/hooks/detect_foreground_long_command.py"
_spec = importlib.util.spec_from_file_location("_gate", _MODULE)
assert _spec is not None and _spec.loader is not None
gate = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(gate)


def _detect(command):
    return gate.detect({"tool_input": {"command": command}})


def test_warns_on_the_bare_suite():
    aviso = _detect("bash tests/run.sh")
    assert aviso is not None
    assert "la suite" in aviso
    assert "bg.sh" in aviso


def test_names_every_family_the_command_invokes():
    aviso = _detect("make html && uv run pytest -q")
    assert "un build" in aviso and "la suite" in aviso


def test_stays_silent_when_the_command_already_uses_the_assembler():
    assert _detect("bash src/session/bg.sh start suite -- bash tests/run.sh") is None
    assert _detect("bash src/session/run-task-pool.sh --width 2 jobs.txt") is None
    assert _detect("nohup uv run pytest -q > log 2>&1 & disown") is None


def test_the_background_discount_carries_its_own_weight():
    """El caso donde `ALREADY_BACKGROUND` es lo ÚNICO que calla el aviso.

    Los tres de arriba los silencia el anclaje a posición de comando, no el
    descuento: al retirar `ALREADY_BACKGROUND` la suite seguía en verde, o sea
    que el descuento era código muerto y el control no discriminaba. La forma
    que sí lo exige es el `&` final — no es separador de segmento, así que la
    familia queda al principio del `head` y el anclaje no la ve.
    """
    assert _detect("bash tests/run.sh &") is not None   # sin disown: aún en primer plano
    assert _detect("bash tests/run.sh & disown") is None


def test_warns_on_the_suites_this_tree_actually_runs():
    """Las suites de thyrox se invocan por su archivo, no por `pytest`.

    Los cuatro comandos son los que corrieron en primer plano el 2026-09-29,
    cada uno de varios minutos, sin que el detector dijera nada.
    """
    for command in (
        'timeout 300 bash tests/session/test-headless-pool-worktree.sh 2>&1 | grep -E "FALLA|aserciones"',
        "bash tests/session/test-item-worktree-orphans.sh 2>&1 | tail -14",
        "PYTHONDONTWRITEBYTECODE=1 timeout 300 python3 tests/session/test_user_wiring.py 2>&1 | grep FALLO",
        'timeout 300 bash tests/session/test-headless-pool.sh 2>&1 | grep -E "FALLA|aserciones"',
    ):
        aviso = _detect(command)
        assert aviso is not None and "la suite" in aviso, command


def test_a_suite_file_named_as_an_argument_stays_silent():
    assert _detect("sed -n 1,40p tests/session/test-headless-pool.sh") is None
    # Una ruta dentro de un texto entrecomillado es un dato, no una orden.
    assert _detect("OLD='a' NEW='bash tests/session/test-x.sh' bash bin/replace_literal f") is None
    assert _detect("bash bin/thyrox-bg start s --grace 0 -- bash tests/session/test-headless-pool.sh") is None


def test_a_suite_named_inside_a_heredoc_body_stays_silent():
    """El mensaje de commit que describió este arreglo disparó el aviso."""
    command = ("git commit -q -F - -- src/x.py <<'EOF'\nThe detector only knew pytest, bun test,\n"
               "npm test and jest. The suites here are invoked by their file.\nEOF")
    assert _detect(command) is None


def test_stays_silent_on_short_commands():
    assert _detect("git status --short") is None
    assert _detect("grep -rn pytest .claude/rules/") is None


def test_stays_silent_without_a_command():
    assert _detect("") is None
    assert gate.detect({}) is None
    assert gate.detect({"tool_input": {"command": None}}) is None


def test_the_dispatcher_registers_it():
    sys.path.insert(0, str(_MODULE.parent))
    import tool_use_preflight as preflight_hook

    assert "detect_foreground_long_command" in preflight_hook.DETECTOR_NAMES
    registry, missing = preflight_hook.build_registry(_MODULE.parent, preflight_hook.DETECTOR_NAMES)
    assert not missing, missing
    assert any(name == "detect_foreground_long_command" for name, _ in registry)


def _payload_bg(command, background):
    return {"tool_name": "Bash",
            "tool_input": {"command": command, "run_in_background": background}}


#: Un cliente que ofrece `run_in_background`: el entorno no lo deshabilita.
#: Se declara en cada caso porque el contenedor remoto lo deshabilita, y
#: heredar su entorno haría que el veredicto dependiera de la máquina.
CLIENT_WITH_BACKGROUND: dict = {}
#: El cliente del entorno remoto: 2.1.286 omite `run_in_background` del
#: esquema de Bash cuando `yl()` lee esta variable no vacía.
CLIENT_WITHOUT_BACKGROUND = {"CLAUDE_CODE_DISABLE_BACKGROUND_TASKS": "1"}


def _detect_bg(command, background, environ=None):
    return gate.detect(_payload_bg(command, background),
                       environ=CLIENT_WITH_BACKGROUND if environ is None else environ)


def test_warns_on_a_blocking_wait_in_the_foreground():
    """Una espera ES un comando largo (directiva del ejecutor 2026-09-24).

    `thyrox-bg wait` en primer plano bloqueo el turno varios minutos: el
    detector lo eximia porque el comando nombraba el mecanismo.
    """
    for command in ("timeout 580 bash bin/thyrox-bg wait ts-completa",
                    "bash bin/wait-jobs wait --timeout 1800",
                    "bash src/session/bg.sh wait suite",
                    "bash bin/marker_wait log.txt --pid 12"):
        notice = _detect_bg(command, False)
        assert notice and "espera" in notice.lower(), command


def test_a_wait_sent_to_the_client_background_stays_silent():
    assert _detect_bg("bash bin/thyrox-bg wait ts-completa", True) is None


def test_non_blocking_ledger_commands_stay_silent():
    for command in ("bash bin/thyrox-bg status ts", "bash bin/wait-jobs status",
                    "bash bin/thyrox-bg start x -- bash tests/run.sh"):
        assert _detect_bg(command, False) is None, command


def test_a_wait_named_inside_a_heredoc_body_stays_silent():
    """El cuerpo de un heredoc es un dato que se escribe, no una orden."""
    command = "python3 - <<'PY'\nnota = 'usa wait-jobs wait'\nPY"
    assert _detect_bg(command, False) is None


#: El comando real del episodio de TASK-THYROX-0668, citado verbatim.
EPISODE_DETACHED_WAIT = ("bash bin/wait-jobs wait --only shell-gate-pool --timeout 7500"
                         " >/dev/null 2>&1 & disown")


def _is_detached_notice(notice):
    return bool(notice) and "desprende" in notice and "run_in_background" in notice


def test_the_episode_detached_wait_is_named_as_detached():
    """La espera con `& disown` no bloquea: el aviso de bloqueo decía lo contrario."""
    for background in (False, True):
        notice = _detect_bg(EPISODE_DETACHED_WAIT, background)
        assert _is_detached_notice(notice), background
        assert "bloquea el turno" not in notice


def test_a_wait_list_ended_by_an_ampersand_is_detached():
    """El `&` desprende la lista entera, `&&` incluido, no sólo el último comando."""
    for command in ("bash bin/thyrox-bg wait suite &",
                    "bash bin/wait-jobs wait && echo listo &",
                    "nohup bash bin/wait-jobs wait > log 2>&1 &"):
        assert _is_detached_notice(_detect_bg(command, True)), command


def test_a_wait_wrapped_by_setsid_or_nohup_is_detached():
    """Sin `&`: sólo el envoltorio lo delata; es la rama que carga este caso."""
    for command in ("setsid -f bash bin/wait-jobs wait --timeout 1800",
                    "nohup bash bin/thyrox-bg wait suite > log 2>&1"):
        assert _is_detached_notice(_detect_bg(command, True)), command


def test_a_client_background_wait_with_redirections_stays_silent():
    """`2>&1` y `&>` redirigen; no desprenden. Con `run_in_background`, calla."""
    for command in ("bash bin/wait-jobs wait --only shell-gate-pool --timeout 7500",
                    "bash bin/wait-jobs wait --timeout 1800 >log 2>&1",
                    "bash bin/thyrox-bg wait suite &>log"):
        assert _detect_bg(command, True) is None, command


def test_a_detached_launch_that_is_not_a_wait_is_not_a_detached_wait():
    notice = _detect_bg("bash bin/thyrox-bg start x -- bash tests/run.sh &", False)
    assert not _is_detached_notice(notice)


def test_a_detached_wait_inside_a_heredoc_body_stays_silent():
    command = "cat > nota.md <<'EOF'\nbash bin/wait-jobs wait & disown\nEOF"
    assert _detect_bg(command, True) is None



def test_the_client_reads_the_switch_as_an_env_boolean():
    """El getter es `M.bool()` → `s=i((n)=>Le(n))`: el `isEnvTruthy` del cliente.

    Medido con `bin/binary` sobre 2.1.286. No es la veracidad cruda de la
    cadena: «0», «false», «no» y «off» dejan `run_in_background` en el esquema.
    """
    for value in ("1", "true", "TRUE", " yes ", "on"):
        assert gate.client_background_disabled({"CLAUDE_CODE_DISABLE_BACKGROUND_TASKS": value}), value
    for value in ("0", "false", "no", "off", ""):
        assert not gate.client_background_disabled({"CLAUDE_CODE_DISABLE_BACKGROUND_TASKS": value}), value
    assert not gate.client_background_disabled({})


def test_without_client_background_a_blocking_wait_is_sent_to_a_monitor():
    """El episodio de 2026-10-01: el aviso pedía un parámetro que el esquema no traía."""
    notice = _detect_bg("timeout 590 bash bin/thyrox-bg wait archive-sources", False,
                        CLIENT_WITHOUT_BACKGROUND)
    assert notice and "Monitor" in notice and "thyrox-bg status" in notice
    assert "con `run_in_background`" not in notice
    assert "no ofrece `run_in_background`" in notice


def test_without_client_background_a_detached_wait_is_sent_to_a_monitor():
    notice = _detect_bg(EPISODE_DETACHED_WAIT, False, CLIENT_WITHOUT_BACKGROUND)
    assert notice and "desprende" in notice and "Monitor" in notice
    assert "con `run_in_background`" not in notice
    assert "no ofrece `run_in_background`" in notice


def test_with_client_background_the_notice_keeps_naming_it():
    """La otra mitad del control: un cliente que sí lo ofrece no recibe `Monitor`."""
    notice = _detect_bg("bash bin/wait-jobs wait --timeout 1800", False)
    assert "run_in_background" in notice and "Monitor" not in notice


# Sin este bloque `python3 <suite>` sólo IMPORTA el módulo: las funciones
# `test_*` no se invocan y el corredor cuenta la suite en verde. El verde no
# distinguía «las aserciones pasan» de «las aserciones no se ejecutan» —
# sub-patrón D con la propia suite como sujeto. Medido: 20 funciones inertes en
# dos archivos de los 117 `test_*.py` (los otros 81 sin bloque asertan a nivel
# de módulo, y ésas sí corren al importar).
if __name__ == "__main__":
    import traceback
    _failures = 0
    for _name, _case in sorted(list(globals().items())):
        if not _name.startswith("test_") or not callable(_case):
            continue
        try:
            _case()
            print(f"  ok    {_name}")
        except Exception:
            _failures += 1
            print(f"  FALLO {_name}")
            traceback.print_exc()
    print(f"resumen: {_failures} fallo(s)")
    raise SystemExit(1 if _failures else 0)
