"""Cadena de mantenimiento — un mecanismo, dos renders, que nunca bloquea.

Adaptación de dos hooks de ``kaupamex-docs`` que resultaron ser el mismo
mecanismo con distinto destino de la salida:

- ``.claude/hooks/reconciliar-store-al-arrancar.sh`` (SessionStart) — corre sus
  pasos y **publica** la última línea de cada uno como ``additionalContext``;
- ``.claude/hooks/reconciliar-store-al-cerrar.sh`` (Stop) — corre los suyos y
  **descarta** la salida, emitiendo ``{}``.

Lo que viaja es la cadena: una lista ordenada de pasos con su plazo, que se
recorre entera aunque alguno muera. Lo que se inyecta son sus parámetros —los
comandos, sus plazos, el presupuesto del hook y la prosa del preámbulo—, porque
todos son propiedad del consumidor y no del mecanismo (DEC-04).

Por qué el presupuesto se comprueba
------------------------------------

Los plazos de los pasos suman contra el ``timeout`` que ``settings.json``
declara para el hook. El bash lo llevaba en un **comentario** —20+90+15 ≤ 130— y
nadie lo verificaba; una versión anterior sumaba 150 contra 130 y el pase moría
sin escribir nada (H-DOCS-235, H-DOCS-498). Un comentario no es un control: lo
que no se comprueba, driftea.

El aviso **no bloquea**. Un hook cuyo cometido es no estorbar no puede negarse a
arrancar porque su presupuesto esté ajustado — pero tampoco puede callarlo: el
turno se quedaría sin la telemetría y sin saber por qué.

Por qué un paso que muere se NOMBRA
------------------------------------

El bash cerraba cada paso con ``>/dev/null 2>&1 || true``. Con eso, un paso que
agota su plazo y uno que terminó bien **se ven idénticos desde fuera**: el
silencio no discrimina — sub-patrón D de ``metrica-decide-la-conclusion.md``.
No bloquear el turno no obliga a callar lo que pasó; son dos ejes distintos, y
el bash los había colapsado en uno.

Por qué la cadena vacía rehúsa
-------------------------------

Cero pasos ejecutados y cero pasos declarados publican la misma cifra. Rehusar
es lo único que los separa — mismo criterio que el registro vacío de
``pretooluse_dispatch``.
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from dataclasses import dataclass, field

#: Código con que se marca un paso que agotó su plazo. Es el convenio de la
#: utilidad `timeout(1)`, que es lo que el bash original invocaba.
TIMEOUT_EXIT = 124

#: Ídem para un comando que no se pudo ejecutar — convenio del shell.
NOT_FOUND_EXIT = 127

#: Lo que se publica por un paso que terminó sin escribir una sola línea.
NO_OUTPUT = "sin salida"


class EmptyChainError(RuntimeError):
    """La cadena se declaró sin pasos: no hay nada que medir ni que publicar."""


@dataclass(frozen=True)
class Step:
    """Un paso de la cadena: qué se corre, con qué nombre y con cuánto plazo."""

    label: str
    command: list[str]
    timeout: int


@dataclass(frozen=True)
class Result:
    """Lo que quedó de un paso: su código, su última línea y si se colgó."""

    label: str
    exit_code: int
    tail: str
    timed_out: bool

    @property
    def ok(self) -> bool:
        return self.exit_code == 0 and not self.timed_out


@dataclass
class Chain:
    """Los pasos y el presupuesto del hook que los hospeda.

    El presupuesto se comprueba al construir, no al correr: para cuando el
    primer paso arranca, el plazo del hook ya está en marcha.
    """

    steps: list[Step]
    budget: int
    stderr: object = field(default=None, repr=False)

    def __post_init__(self) -> None:
        if not self.steps:
            raise EmptyChainError(
                "cadena sin pasos: un cero de pasos ejecutados y un cero de "
                "pasos declarados publican la misma cifra"
            )
        self._check_budget()

    def _write(self, message: str) -> None:
        print(message, file=self.stderr or sys.stderr)

    def _check_budget(self) -> None:
        total = sum(step.timeout for step in self.steps)
        if total > self.budget:
            self._write(
                f"maintenance_chain: los plazos suman {total} s y el hook "
                f"declara {self.budget} s — el último paso morirá sin escribir. "
                f"Ajustar los plazos o el timeout de settings.json."
            )

    def run(self) -> list[Result]:
        """Recorre la cadena entera; ningún paso corta a los siguientes."""
        results: list[Result] = []
        for step in self.steps:
            result = self._run_step(step)
            if not result.ok:
                self._report(result, step)
            results.append(result)
        return results

    def _run_step(self, step: Step) -> Result:
        try:
            proc = subprocess.run(
                step.command,
                capture_output=True,
                text=True,
                timeout=step.timeout,
            )
        except subprocess.TimeoutExpired:
            return Result(step.label, TIMEOUT_EXIT, "", timed_out=True)
        except OSError:
            return Result(step.label, NOT_FOUND_EXIT, "", timed_out=False)
        return Result(step.label, proc.returncode, _tail(proc.stdout),
                      timed_out=False)

    def _report(self, result: Result, step: Step) -> None:
        if result.timed_out:
            self._write(
                f"maintenance_chain: el paso '{result.label}' agotó su plazo de "
                f"{step.timeout} s y se abandonó"
            )
        else:
            self._write(
                f"maintenance_chain: el paso '{result.label}' salió en "
                f"{result.exit_code}"
            )


def _tail(text: str) -> str:
    """La última línea con contenido — es lo que los guiones `--quiet` emiten."""
    lines = [line for line in (text or "").splitlines() if line.strip()]
    return lines[-1] if lines else ""


def render_session_start(results: list[Result], preamble: str = "") -> str:
    """Publica las colas como ``additionalContext`` del evento SessionStart."""
    partes = [preamble] if preamble else []
    # Un paso mudo se declara, no se omite: si desapareciera de la lista, «no
    # dijo nada» y «no corrió» se leerían igual.
    partes.extend(f"{r.label}: {r.tail or NO_OUTPUT}" for r in results)
    return json.dumps(
        {
            "hookSpecificOutput": {
                "hookEventName": "SessionStart",
                "additionalContext": "\n".join(partes),
            }
        },
        ensure_ascii=False,
    )


def render_stop(results: list[Result]) -> str:
    """Descarta la salida: el hook Stop corre por su efecto, no por su texto."""
    del results
    return "{}"


RENDERS = {"session-start": render_session_start, "stop": render_stop}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--render", choices=sorted(RENDERS), required=True)
    parser.add_argument("--budget", type=int, required=True,
                        help="el timeout que settings.json declara para el hook")
    parser.add_argument("--preamble", default="",
                        help="prosa del consumidor; sólo la usa session-start")
    parser.add_argument("--step", nargs=3, action="append", default=[],
                        metavar=("LABEL", "TIMEOUT", "COMMAND"))
    args = parser.parse_args(argv)

    steps = [
        Step(label=label, command=["sh", "-c", command], timeout=int(timeout))
        for label, timeout, command in args.step
    ]
    try:
        results = Chain(steps=steps, budget=args.budget).run()
    except EmptyChainError as err:
        print(f"maintenance_chain: {err}", file=sys.stderr)
        return 0

    if args.render == "session-start":
        print(render_session_start(results, preamble=args.preamble))
    else:
        print(render_stop(results))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
