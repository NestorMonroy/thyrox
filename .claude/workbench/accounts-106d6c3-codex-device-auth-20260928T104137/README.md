# #106d-6c-3 — código de dispositivo de codex

Porte TDD de `omniroute: src/lib/oauth/codexDeviceFlow.ts`: el «deviceauth»
propio del CLI de codex (código de usuario → sondeo → intercambio con el
verificador PKCE que genera el servidor).

| Archivo | Qué |
|---|---|
| `red-106d6c3.txt` | la mitad roja |
| `annul-106d6c3.sh` | 20 anulaciones |
| `results-106d6c3.txt` | veredicto: las 20 discriminan |

## Divergencias declaradas

- **El client id sale de `THYROX_CODEX_OAUTH_CLIENT_ID`** vía
  `requireClientId`; el literal que la referencia incrusta no se copia.
- **Espera y reloj inyectados** (`delay`, `monotonicNow`): el sondeo se prueba
  sin esperas reales; el valor por defecto es una espera interrumpible por la
  señal y `performance.now()`.
- **El mensaje del 404** no nombra el flujo de la interfaz de la referencia
  («Adicionar»); nombra el inicio por localhost, que es lo que existe aquí.
Typecheck: build 0 errores; tests sólo los dos TS6059 preexistentes. `__tests__/accounts`: 221 tests, 0 fail (job tsc-106d6c3-20260928T104404).
