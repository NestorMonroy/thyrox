# #106d-6e-3 — tickets de un solo uso del flujo de dispositivo

Porte TDD de `omniroute: src/lib/oauth/deviceFlowTickets.ts`: el enlace
público con que un tercero completa el flujo de dispositivo de codex en su
navegador; quien lo generó sondea el estado.

| Archivo | Qué |
|---|---|
| `red-106d6e3.txt` | la mitad roja |
| `annul-106d6e3.sh` | 17 anulaciones |
| `results-106d6e3.txt` | veredicto: 16 discriminan; la 7 era código muerto |

## Divergencias declaradas

- **Una fábrica con su propio mapa**, con reloj y generador de tokens
  inyectados, en vez de un mapa en `globalThis`: dos almacenes no comparten
  tickets (anulación 17).
- **`peek` sin comprobar la caducidad otra vez**: la anulación 7 lo retiró
  sin que cambiara ningún resultado — `peek` poda antes de leer, así que un
  ticket caducado ya no está en el mapa.
- **`size()`** expone cuántos tickets vivos hay, para probar la poda.

Typecheck: build 0 errores; tests sólo los dos TS6059 preexistentes. `__tests__/accounts`: 296 tests, 0 fail (tsc-106d6e23-20260928T110557, común a 6e-2 y 6e-3).
