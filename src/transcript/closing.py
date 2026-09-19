"""Como cerro una sesion — y las DOS cifras que hacen falta para saberlo.

Un transcript pesa 2.0 MB de mediana y 21.8 MB en el maximo (medido sobre las
472 filas con telemetria del store). Versionarlos todos serian ~1.13 GB sobre
un `.git` que ya pesa 310 MB y donde `git gc` ya murio out of disk. Asi que
este modulo NO copia el transcript: lo destila a lo que responde la pregunta
—como cerro— y descarta el cuerpo, que es lo que pesa.

**Publica dos `stop_reason`, y la segunda no es redundante.** El extractor de
`register_session.py:349-350` resuelve el cierre por el ULTIMO valor NO NULO
entre los mensajes assistant. Eso es una regla, no un hecho: cuando el ultimo
mensaje no declara `stop_reason`, la regla publica el de un mensaje ANTERIOR y
la fila queda diciendo que el turno cerro de una forma que nunca ocurrio.

Con una sola cifra el defecto es invisible. Con las dos, `rule_diverges` lo
declara, y entonces la pregunta de TASK-THYROX-0155 se puede decidir:

    coinciden  -> la regla es fiel, y `tool_use` al cerrar es normal;
                  lo que esta mal es la expectativa escrita.
    difieren   -> la regla arrastra un cierre ajeno, y el defecto es suyo.

No sabe de agentes, ni de tareas, ni del store: toma una ruta de JSONL y
devuelve un registro. Quien lo persista decide donde.

*Metrica:* los mensajes `type=assistant` con `message.role=assistant`.
*Ciega a:* el CUERPO de los bloques —guarda sus tipos, no su texto—, a un
transcript truncado (publica el mismo cierre que uno completo), y a las lineas
que no parsean como JSON, que se saltan sin contarse.
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path


class TranscriptNotFound(FileNotFoundError):
    """No hay transcript donde se pidio leerlo.

    Existe como clase propia por la misma razon que `StoreNotFound`: devolver
    un cierre vacio colapsaria «cerro sin declarar» con «no pude leer», y esas
    dos no son el mismo hecho. Un `None` ahi es un cero que miente.
    """


@dataclass(frozen=True)
class Closing:
    """El cierre destilado de un transcript. Lo que cabe versionado."""

    #: El `stop_reason` del ULTIMO mensaje assistant, sea o no nulo.
    last_stop_reason: "str | None"
    #: El ultimo `stop_reason` NO NULO — la regla que el extractor aplica hoy.
    last_declared_stop_reason: "str | None"
    #: Los TIPOS de bloque del ultimo mensaje (`text`, `tool_use`, …), sin su
    #: contenido: es lo que separa «cerro hablando» de «cerro llamando».
    last_block_types: "list[str]" = field(default_factory=list)
    #: El denominador. Sin el, un transcript truncado publica la misma cifra
    #: que uno completo y nadie puede notarlo.
    assistant_messages: int = 0

    @property
    def rule_diverges(self) -> bool:
        """La regla del extractor publica un cierre que el ultimo no declara."""
        return self.last_stop_reason != self.last_declared_stop_reason


def read(transcript_path: "str | Path") -> Closing:
    """Destila el cierre de un transcript. Lee; no escribe nada."""
    path = Path(transcript_path)
    if not path.exists():
        raise TranscriptNotFound(f"no hay transcript en {path}")

    read_last, read_declared, read_blocks, read_count = None, None, [], 0
    with open(path, "r", encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
            except ValueError:
                continue
            if obj.get("type") != "assistant":
                continue
            msg = obj.get("message") or {}
            if msg.get("role") != "assistant":
                continue
            read_count += 1
            read_last = msg.get("stop_reason")
            if read_last:
                read_declared = read_last
            read_blocks = [b.get("type") for b in (msg.get("content") or [])
                           if isinstance(b, dict)]
    return Closing(last_stop_reason=read_last,
                   last_declared_stop_reason=read_declared,
                   last_block_types=read_blocks,
                   assistant_messages=read_count)
