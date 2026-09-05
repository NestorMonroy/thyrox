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

Dos formas de motor, un solo par de modos
------------------------------------------

Los dos gates portados consultan a un guion externo. Los dos que quedan
—``trabajo-sin-publicar`` y ``hallazgo-pendiente``— **no consultan a nadie**:
recorren los repos y calculan el veredicto dentro. Medido antes de decidir la
forma: los dos invocan `reach_roots.py --paths` para saber qué repos hay, y a
partir de ahí el predicado es suyo.

Admitirlos con un **tercer modo** duplicaría la traducción, que es justo lo que
este módulo existe para tener una sola vez. Lo que se generaliza es el otro eje:
el motor es un ``argv`` **o** algo invocable que devuelve ``(código, salida)``.
Los dos modos de veredicto lo leen igual, porque lo que traducen es el par
código/salida y no de dónde vino.

Un motor en proceso tiene **un** flujo, así que se le asigna ``stdout`` —el que
gobierna el veredicto en modo por salida— y ``both()`` devuelve lo mismo. Y si
revienta, el gate lo nombra y emite ``{}``: un gate que propaga la excepción de
su motor deja el turno sin veredicto y sin aviso.

El CLI sigue construyendo sólo la forma ``argv``: un invocable no cabe en una
línea de comando. Un consumidor en proceso importa ``Gate`` y le pasa el suyo.

Qué flujo decide, y cuál sólo redacta
--------------------------------------

Las dos fuentes divergían aquí y el primer porte las fundió, con
``output = stdout + stderr`` para todo. Medido contra ellas:

- ``evidencia-varada`` invocaba su motor con ``2>&1`` — el stderr **entra** en
  el motivo del bloqueo;
- ``espera-pendiente`` con ``2>/dev/null`` — el stderr se **descarta**, y sólo
  stdout decide.

Fundirlos hace que un motor no-cero con stdout vacío y un aviso en stderr se lea
como incumplimiento: un bloqueo que la fuente nunca pidió, y que ni la línea
base ni el positivo sintético podían ver —en las dos corridas el motor no
escribió nada por stderr—. El sub-patrón D sobre el propio control.

Por eso el eje se parte en dos: **el veredicto** en modo por salida lee
``stdout`` y nada más; **el motivo** en modo por código sigue fundiendo los dos
(``Completed.both()``), que es lo que su fuente pedía.

Por qué el motor se lanza con guarda de grupo
----------------------------------------------

Con ``subprocess.run(..., timeout=)`` el plazo mata al proceso lanzado y sólo a
él. Los motores de los dos consumidores son guiones de shell que forkean: el
hijo sobreviviría al plazo mientras el gate publica ``{}``. El mecanismo vive en
``hooks.process.run_guarded``, compartido con ``hooks.maintenance_chain``, y su
cabecera explica el porqué. Un motor agotado **no bloquea** —nadie sabría cómo
resolverlo— pero **se nombra en stderr**: callarlo lo haría indistinguible de
un motor limpio.

Por qué no bloquea nunca el proceso
------------------------------------

El hook sale 0 pase lo que pase: el bloqueo del turno lo pide el JSON
(``decision: block``), no el código de salida. Un hook que muriera dejaría al
consumidor sin veredicto y sin aviso.
"""
from __future__ import annotations

import argparse
import json
import sys
from collections.abc import Callable
from dataclasses import dataclass, field
from pathlib import Path

# El módulo se importa como ``hooks.stop_gate`` (con ``src`` en la ruta) y también
# se ejecuta como guion —así lo invoca el stub del consumidor—, donde
# ``sys.path[0]`` es ``src/hooks`` y ``hooks`` no resolvería. La composición va
# ANTES del import a propósito; el import sigue siendo de nivel de módulo, que
# es lo que ``no-lazy-imports.md`` exige.
if __package__ in (None, ""):  # sólo en invocación directa
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from hooks.process import Completed, run_guarded  # noqa: E402
from hooks.stop_payload import is_reentry  # noqa: E402

#: La ranura que el motivo puede reservar para la salida del motor. Los dos
#: consumidores la incrustan en medio de su prosa, no al final.
OUTPUT_SLOT = "{output}"


#: El motor: o un argv que se lanza, o algo invocable que devuelve
#: ``(código, salida)`` sin salir del proceso. Ver «Dos formas de motor».
Engine = list[str] | Callable[[], tuple[int, str]]


class ModeError(ValueError):
    """Se declararon los dos modos de veredicto, o ninguno."""


@dataclass
class Gate:
    """Un gate de ``Stop``: un motor, un modo de veredicto y un motivo."""

    engine: Engine
    reason: str
    clean_exits: tuple[int, ...] = ()
    block_exits: tuple[int, ...] = ()
    block_on_output: bool = False
    #: Segundos que se le conceden al motor. Un motor colgado no puede dejar el
    #: turno colgado con él.
    timeout: int = 60
    _stderr: object = field(default=None, repr=False)

    def __post_init__(self) -> None:
        if not callable(self.engine) and not self.engine:
            raise ModeError(
                "el motor está vacío: ni argv ni invocable.\n"
                "  NO se emite un veredicto sobre un motor que no existe."
            )
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

        done = self._consult()
        if done is None:          # no hubo veredicto, y ya se avisó por qué
            return self._clean()

        code = done.exit_code

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
            # salió por otra razón y no tiene nada que reportar. Y lo que
            # cuenta como texto es **stdout**, no la suma de los dos flujos.
            # El `strip()` decide si HAY texto; el que viaja al motivo es el
            # original. Recortarlo le come la sangría al render del motor, y
            # esa sangría es formato del consumidor — medido al portar
            # `trabajo-sin-publicar`, cuya lista empieza con dos espacios.
            if not done.stdout.strip():
                if done.stderr.strip():
                    self._warn(
                        f"'{self.engine_name}' salió {code} sin stdout, con "
                        f"aviso en stderr: "
                        f"{done.stderr.strip().splitlines()[-1]}"
                    )
                return self._clean()
            return self._block(done.stdout.rstrip("\n"))

        if code in self.block_exits:
            return self._block(done.both())

        self._warn(
            f"'{self.engine_name}' salió {code}, que no está declarado ni "
            "limpio ni bloqueante: no medible. No se bloquea, pero tampoco es "
            "un verde."
        )
        return self._clean()


    @property
    def engine_name(self) -> str:
        """Cómo se nombra el motor en un aviso — no es su identidad."""
        if callable(self.engine):
            return getattr(self.engine, "__name__", "motor en proceso")
        return Path(self.engine[0]).name

    def _consult(self) -> Completed | None:
        """Interroga al motor. ``None`` = sin veredicto, y ya se avisó."""
        if callable(self.engine):
            try:
                code, output = self.engine()
            except Exception as err:   # noqa: BLE001 — un gate no revienta
                self._warn(f"'{self.engine_name}' falló: {err}")
                return None
            # Un motor en proceso tiene UN flujo. Se le asigna stdout porque
            # es el que gobierna el veredicto en modo por salida; `both()`
            # devuelve lo mismo, así que el modo por código lo lee igual.
            return Completed(code, output, "")

        binary = Path(self.engine[0])
        if not binary.is_file():
            # Sin motor no hay nada que consultar. Callar es correcto; fingir
            # un veredicto sobre un motor ausente, no.
            self._warn(f"el motor no está en '{binary}' — sin veredicto")
            return None

        done = run_guarded(self.engine, self.timeout)
        if not done.started:
            self._warn(f"el motor '{binary.name}' no pudo correr: {done.stderr}")
            return None
        if done.timed_out:
            # No bloquear es lo correcto —nadie sabría cómo resolverlo— pero
            # callarlo no: un motor colgado y uno limpio publicarían el mismo
            # `{}`, y ése es el verde que no discrimina.
            self._warn(
                f"'{binary.name}' agotó su plazo de {self.timeout} s y se "
                "abandonó: sin veredicto, no es un verde."
            )
            return None
        return done


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
