# #106d-5b-1 — codebuddy-cn, kimi-coding, muse-code y openference

Porte TDD de `omniroute: src/lib/oauth/providers/{codebuddy-cn,kimi-coding,muse-code,openference}.ts`
y de sus piezas de `open-sse` (`config/museCode.ts`, `services/museCodeAuth.ts`,
`config/providers/registry/kimi/coding/runtime.ts`, `utils/kimiDevice.ts`).

| Archivo | Qué |
|---|---|
| `red-106d5b1.txt` | la mitad roja: la suite antes de existir los módulos |
| `annul-106d5b1.sh` | 29 anulaciones, una por mitad de juicio |
| `annul-106d5b1-rerun.sh` | re-medición de 2, 3 y 27 (ver abajo) |
| `results-106d5b1.txt` | veredicto por anulación |

## Divergencias declaradas

- **Client ids sólo por variable.** `THYROX_KIMI_CODING_OAUTH_CLIENT_ID`,
  `THYROX_MUSE_CODE_OAUTH_CLIENT_ID` y `THYROX_OPENFERENCE_OAUTH_CLIENT_ID`;
  openference no tenía variable en la referencia (sólo el id incrustado), así
  que se le da una. Sin ella el flujo rehúsa nombrándola.
- **Kimi:** `KIMI_CODING_DEVICE_ID` → `THYROX_KIMI_CODING_DEVICE_ID`,
  `KIMI_CLI_VERSION` → `THYROX_KIMI_CLI_VERSION`. La ruta del id persistido la
  pasa quien compone el flujo (no se resuelve un hogar de datos global), y la
  identidad del dispositivo se inyecta. El modelo del dispositivo no se cachea
  en un global de módulo: se deriva de la descripción del sistema recibida.
- **Muse:** la rama `isMuseDcaToken(dcaToken) ? '' : dcaToken` era código
  muerto — con o sin ella el token de acceso resulta `dcaToken` cuando no hay
  clave acuñada. Se retiró; `isMuseDcaToken` queda exportada para el
  re-acuñado del refresco (#106e). `lastRefresh` y `dcaExpiresAt` salen del
  reloj inyectado.
- **Openference:** el id token se decodifica con `base64url` de `Buffer`, sin
  el relleno manual (Buffer no lo necesita).
- **CodeBuddy:** la espera (código 11217) vuelve como `ok:false` sin campo
  `error`, igual que la referencia.

## Re-medición

- **2 (código de estado) no discriminaba:** la prueba sólo traía una respuesta
  sin estado. Se añadió una con estado y `code` distinto de 0.
- **3 y 27** no tenían coincidencia única en `src/accounts`; se acotó la raíz
  al archivo.

Typecheck: build 0 errores; tsconfig de tests sólo los dos TS6059 preexistentes. `__tests__/accounts`: 154 tests, 0 fail (job tsc-106d5b1-20260928T100816).
