#!/usr/bin/env python3
"""Adopta en el ledger un trabajo que OTRO corredor mando a segundo plano.

El problema que cierra
======================

El ledger de `job_ledger.py` sabe esperar lo que NOSOTROS lanzamos: quien lanza
registra, y la barrera gira hasta que todos asientan. Un trabajo que manda a
segundo plano **otro** corredor —el que hospeda la sesion, cuando un comando
excede su plazo— nunca pasa por ese registro. Consecuencia medida: su resultado
se anuncia una vez, y si nadie lo recoge en ese momento se pierde sin dejar
rastro. El Stop gate no lo ve, porque el Stop gate mide el ledger.

Lo unico que ese anuncio entrega son dos hechos: un **identificador** y una
**ruta de salida**. Con esos dos el trabajo ya es registrable, y a partir de ahi
lo gobierna la maquinaria que ya existe.

Los tres ejes del evento — y por que importan aqui
===================================================

No todos los eventos que rodean a un trabajo largo son de la misma clase, y
confundirlos lleva a construir el mecanismo equivocado:

======================  =========================  ==============================
Evento                  Que lo dispara             Como se atiende
======================  =========================  ==============================
plazo excedido          el **reloj**               nada que atender: es el aviso
                                                   de que el trabajo sigue vivo
proceso termino         el **mundo** (cambio de    notificacion (push) del
                        estado)                    corredor, o sondeo del log
sondeo de la barrera    el **reloj**, periodico    `JobLedger.wait`
reintento con espera    el **reloj**, creciente    escalera de reintento
creciente                                          (`2,4,8,16`)
======================  =========================  ==============================

El primero y el tercero son **de tiempo**; el segundo es **de estado**. La
distincion decide el diseno: no se puede *recibir* el segundo —no hay receptor
de notificaciones dentro de un turno—, asi que se **convierte** en uno de tiempo:
se adopta el identificador y se sondea su salida hasta ver el marcador terminal.
Sondear es la unica via que no depende de estar escuchando en el instante justo.

Que ya existia, y por que esto NO lo duplica
=============================================

Medido antes de dar por buena esta pieza, no despues:

- **La mitad PRODUCTORA ya esta portada.** `shell/src/taskOutputPort.ts` y
  `storage/src/task/diskOutput.ts` son el contrato de la salida de una tarea en
  segundo plano —acumular, derramar a disco, exponer el archivo—. Eso ESCRIBE el
  `.output`; no lo espera.
- **La referencia resuelve el seguimiento con su familia `Task`**, no con un
  ledger: `TaskOutput` (42 ocurrencias en 2.1.266) lee la salida de una tarea por
  su identificador y `TaskStop` (31) la detiene, mas una notificacion cuando
  termina. Es lectura BAJO DEMANDA.
- **Lo que ninguna de las dos hace es impedir el olvido.** `TaskOutput` exige
  acordarse del identificador y decidir llamarlo; la notificacion llega una vez.
  Si el turno termina antes, el resultado se pierde sin dejar rastro. Persistir
  el identificador para que el Stop gate lo vea es la pieza que faltaba, y es la
  unica que este modulo aporta.

Por eso aqui no hay lector de salida: leer ya sabe hacerlo `TaskOutput`. Hay
**anotacion**, que es lo que convierte «me avisan una vez» en «no puedo cerrar el
turno sin recogerlo».

El marcador es PARAMETRO, no mecanismo
=======================================

Con que literal cierra su salida un corredor es dialecto suyo, no del ledger.
Por eso viaja como parametro —`--marker`, o la variable declarada— y se guarda
**en el trabajo**, no en la barrera: un mismo ledger hospeda trabajos de varios
dialectos a la vez.
"""

from __future__ import annotations

import argparse
import os
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from session.job_ledger import JobLedger  # noqa: E402

#: Variable que declara el marcador terminal del corredor anfitrion.
MARKER_VAR = "THYROX_BACKGROUND_MARKER"

#: Respaldo cuando nadie lo declara. NO es una constante del mecanismo, y esta
#: medido: las 20 ocurrencias de `exited with code` en 2.1.266 son mensajes de
#: bitacora de procesos hijo —puente HTTP, puente SOCKS, `pwsh`, `git clone`,
#: monitor de sandbox— y NINGUNA es el cierre de una tarea en segundo plano. El
#: literal es del corredor que hospeda ESTA sesion, no de la referencia, asi que
#: se declara y se sobreescribe.
DEFAULT_MARKER = r"\[exited with code "

#: Como se lee un anuncio de segundo plano. Dos grupos con nombre y nada mas:
#: el identificador y la ruta de salida. Todo lo demas del anuncio es prosa que
#: cambia entre versiones, y anclarse a ella seria atarse al significante.
NOTICE_ID = re.compile(r"\(ID:\s*(?P<id>[A-Za-z0-9_-]+)\s*\)")
NOTICE_LOG = re.compile(r"(?P<log>/\S+\.output)\b")


def parse_notice(text: str) -> tuple[str, Path] | None:
    """El identificador y la salida que un anuncio nombra, o ``None``.

    Devuelve ``None`` cuando falta cualquiera de los dos, en vez de componer la
    ruta a partir del identificador: componerla seria inventar un hogar, y un
    hogar inventado que no existe se leeria como «trabajo sin marcador» — un
    diagnostico falso con forma de diagnostico sano.
    """
    id_match = NOTICE_ID.search(text)
    log_match = NOTICE_LOG.search(text)
    if not id_match or not log_match:
        return None
    return id_match.group("id"), Path(log_match.group("log"))


def adopt(ledger: JobLedger, job_id: str, log: Path,
          marker: str | None = None, command: str = "") -> object:
    """Anota el trabajo ajeno con su marcador, para que la barrera lo cubra.

    Sin ``pid``: no lo lanzamos nosotros y su identificador no es un pid. El
    diagnostico de ese trabajo se apoya entonces en el marcador de su salida,
    que es justo el eje que `Job.marker` existe para llevar.
    """
    return ledger.register(
        job_id, log,
        marker=marker or os.environ.get(MARKER_VAR) or DEFAULT_MARKER,
        command=command)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Adopta en el ledger un trabajo de segundo plano ajeno.")
    parser.add_argument("--ledger", required=True, help="el directorio del ledger")
    parser.add_argument("--id", default=None, help="el identificador del trabajo")
    parser.add_argument("--log", default=None, help="su archivo de salida")
    parser.add_argument("--marker", default=None,
                        help=f"marcador terminal (o {MARKER_VAR})")
    parser.add_argument("--from-notice", action="store_true",
                        help="lee el anuncio literal por la entrada estandar")
    args = parser.parse_args(argv)

    if args.from_notice:
        leido = parse_notice(sys.stdin.read())
        if leido is None:
            # REHUSA en vez de adoptar a medias. Un trabajo con ruta inventada
            # nunca asienta, y la barrera se colgaria por un defecto de lectura.
            print("ERROR — el anuncio no nombra a la vez un ID y una salida "
                  "*.output; no se adopta nada.", file=sys.stderr)
            return 2
        job_id, log = leido
    else:
        if not args.id or not args.log:
            print("ERROR — sin --from-notice hacen falta --id y --log.",
                  file=sys.stderr)
            return 2
        job_id, log = args.id, Path(args.log)

    job = adopt(JobLedger(Path(args.ledger)), job_id, log, args.marker)
    print(f"adoptado {job.label}")
    print(f"  salida   {job.log}")
    print(f"  marcador {job.marker}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
