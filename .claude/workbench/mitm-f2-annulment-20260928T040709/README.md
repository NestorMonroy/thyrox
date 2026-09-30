# Anulación de los handlers MITM (F2)

Tres controles sobre `@thyrox/mitm`, cada uno retirando una causa y
restaurándola después. `results.txt` guarda la salida literal.

| Anulación | Caso que debe caer | Cayó |
|---|---|---|
| A1 — `claudeCode` sin `dropTrailingAssistantTurns` | el que exige quitar TODOS los turnos finales del asistente | sí, sólo ése |
| A2 — `x-thyrox-agent` fijo | el de copilot, que comprueba la cabecera | sí, sólo ése |
| A3 — sin `reader.cancel()` al cerrar el agente | ninguno | **no discriminaba** |
| A3b — ídem, con el caso nuevo | `cancels the upstream source` | sí, sólo ése |

A3 no discriminaba porque el caso heredado mide «se deja de leer pronto», y
eso ya lo cumple la bandera `downstreamClosed` por sí sola. Salir del bucle
no cancela el origen: `releaseLock` lo deja vivo. El caso nuevo mide el
`cancel` que recibe el origen.
