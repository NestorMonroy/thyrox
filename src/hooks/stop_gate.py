"""Un gate de ``Stop`` que consulta un motor y traduce su resultado.

Adaptación del esqueleto que comparten ``kaupamex-docs:
.claude/hooks/stop-gate-evidencia-varada.sh`` (68 líneas) y
``stop-gate-espera-pendiente.sh`` (74). Viaja el mecanismo: leer el payload,
rehusar si es reentrada, rehusar si el motor no está, invocarlo y decidir. Se
inyectan sus parámetros —qué motor, con qué modo, con qué motivo— porque son
del consumidor y no del mecanismo (DEC-04).

Los dos modos de veredicto, y por qué son dos
----------------------------------------------

El plan del tramo suponía «un mecanismo, un veredicto». Medirlos lo desmintió:

===========================  ==========================  =========================
Motor                        Cómo decide                 Medido
===========================  ==========================  =========================
``evidencia-varada listar``  código de salida            exit **1** con 880 varados
``wait-jobs pendientes``     salida en stdout            exit **0**, stdout vacío
===========================  ==========================  =========================

El segundo no puede decidir por código: su no-cero **sin texto** no es un
incumplimiento. El primero no puede decidir por salida: imprime su inventario
también cuando está limpio. Un modo único publicaría, en uno de los dos, un
veredicto que su motor nunca pidió — el sub-patrón A de
``metrica-decide-la-conclusion.md``, con el veredicto como encabezado único
sobre dos métricas mezcladas.

Por eso son **excluyentes y declarados**: un gate con los dos, o con ninguno,
rehúsa en vez de elegir por su cuenta.

El tercer desenlace: ``not_measurable``
----------------------------------------

Un código que no está en ninguna de las dos listas **no es limpio**. Emite
``{}`` —no bloquear es lo correcto: nadie sabría cómo resolverlo— y lo
**nombra en stderr**, para que «no pude medir» no se confunda con «no hay
nada». Sin ese aviso el gate publicaría un verde que no discrimina.

Y por eso ``clean_exits`` se declara explícito en vez de derivarse: el stub de
``espera-pendiente`` declara el **4** limpio a propósito —«se lee como limpio
hasta que #95 decida»—, y un default que se lo tragara estaría resolviendo esa
decisión sin que nadie la tomara.

Por qué no bloquea nunca el proceso
------------------------------------

El hook sale 0 pase lo que pase: el bloqueo del turno lo pide el JSON
(``decision: block``), no el código de salida. Un hook que muriera dejaría al
consumidor sin veredicto y sin aviso.
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path

# El módulo se importa como ``hooks.stop_gate`` (con ``src`` en la ruta) y también
# se ejecuta como guion —así lo invoca el stub del consumidor—, donde
# ``sys.path[0]`` es ``src/hooks`` y ``hooks`` no resolvería. La composición va
# ANTES del import a propósito; el import sigue siendo de nivel de módulo, que
# es lo que ``no-lazy-imports.md`` exige.
if __package__ in (None, ""):  # sólo en invocación directa
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from hooks.stop_payload import is_reentry  # noqa: E402

#: La ranura que el motivo puede reservar para la salida del motor. Los dos
#: consumidores la incrustan en medio de su prosa, no al final.
OUTPUT_SLOT = "{output}"


class ModeError(ValueError):
    """Se declararon los dos modos de veredicto, o ninguno."""


@dataclass
class Gate:
    """Un gate de ``Stop``: un motor, un modo de veredicto y un motivo."""

    engine: list[str]
    reason: str
    clean_exits: tuple[int, ...] = ()
    block_exits: tuple[int, ...] = ()
    block_on_output: bool = False
    #: Segundos que se le conceden al motor. Un motor colgado no puede dejar el
    #: turno colgado con él.
    timeout: int = 60
    _stderr: object = field(default=None, repr=False)

    def __post_init__(self) -> None:
        if bool(self.block_exits) == bool(self.block_on_output):
            cuales = ("los dos" if self.block_exits else "ninguno")
            raise ModeError(
                f"los modos de veredicto son excluyentes y se declaró {cuales}: "
                "usa block_exits=(N,…) para decidir por código, o "
                "block_on_output=True para decidir por salida.\n"
                "  NO se elige uno por omisión: el motor de cada consumidor "
                "decide de una forma, y suponerla publicaría un veredicto que "
                "nunca pidió."
            )

    # -- veredictos ---------------------------------------------------------

    def _clean(self) -> dict:
        return {}

    def _block(self, output: str) -> dict:
        reason = (self.reason.replace(OUTPUT_SLOT, output)
                  if OUTPUT_SLOT in self.reason else self.reason)
        return {"decision": "block", "reason": reason}

    def _warn(self, message: str) -> None:
        print(f"stop_gate: {message}", file=self._stderr or sys.stderr)

    # -- el ciclo -----------------------------------------------------------

    def run(self, payload: str = "{}") -> dict:
        """Decide. NUNCA lanza: un gate que revienta no emite veredicto."""
        if is_reentry(payload):
            return self._clean()

        binary = Path(self.engine[0])
        if not binary.is_file():
            # Sin motor no hay nada que consultar. Callar es correcto; fingir
            # un veredicto sobre un motor ausente, no.
            self._warn(f"el motor no está en '{binary}' — sin veredicto")
            return self._clean()

        try:
            done = subprocess.run(self.engine, capture_output=True, text=True,
                                  timeout=self.timeout)
        except (OSError, subprocess.SubprocessError) as err:
            self._warn(f"el motor '{binary.name}' no pudo correr: {err}")
            return self._clean()

        code = done.returncode
        output = (done.stdout + done.stderr).strip()

        if code in self.clean_exits:
            return self._clean()

        if self.block_on_output:
            # El cero es limpio POR EL MODO, no por declaración. Dejarlo
            # depender de `clean_exits` haría que un consumidor que olvidara
            # declarar el 0 bloqueara con la salida informativa de un motor
            # que terminó bien — y lo haría en silencio. Lo destapó el control
            # de anulación de `clean_exits`, no una relectura.
            if code == 0:
                return self._clean()
            # El no-cero SIN texto no es un incumplimiento: es un motor que
            # salió por otra razón y no tiene nada que reportar.
            return self._block(output) if output else self._clean()

        if code in self.block_exits:
            return self._block(output)

        self._warn(
            f"'{binary.name}' salió {code}, que no está declarado ni limpio ni "
            "bloqueante: no medible. No se bloquea, pero tampoco es un verde."
        )
        return self._clean()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Gate de Stop: consulta un motor y traduce su resultado.")
    parser.add_argument("--engine", nargs="+", required=True,
                        help="el motor y sus argumentos")
    parser.add_argument("--reason", required=True,
                        help=f"el motivo del bloqueo; puede llevar {OUTPUT_SLOT}")
    parser.add_argument("--clean-exit", nargs="*", type=int, default=[],
                        help="códigos declarados limpios")
    parser.add_argument("--block-exit", nargs="*", type=int, default=[],
                        help="códigos declarados bloqueantes (modo por código)")
    parser.add_argument("--block-on-output", action="store_true",
                        help="bloquear si el motor sale no-cero CON salida")
    parser.add_argument("--timeout", type=int, default=60)
    args = parser.parse_args(argv)

    try:
        gate = Gate(engine=args.engine, reason=args.reason,
                    clean_exits=tuple(args.clean_exit),
                    block_exits=tuple(args.block_exit),
                    block_on_output=args.block_on_output,
                    timeout=args.timeout)
    except ModeError as err:
        # NO se emite `{}` aquí: un objeto vacío se lee como «sin hallazgos», y
        # lo que hay es una declaración mal formada. Salir sin stdout obliga al
        # consumidor a mirar.
        print(f"stop_gate: {err}", file=sys.stderr)
        return 2

    payload = ""
    try:
        payload = sys.stdin.read()
    except (OSError, ValueError):
        pass

    print(json.dumps(gate.run(payload)))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
