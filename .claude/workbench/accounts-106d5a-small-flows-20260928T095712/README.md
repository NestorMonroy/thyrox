# #106d-5a — flujos de Trae, Devin, Zed, Qoder, Kilo Code y Cline

Porte (`omniroute:`, MIT) a `src/packages/provider/src/accounts/oauth/flows/`:

| Módulo | Porte de |
|---|---|
| `importedTokenFlows.ts` | `src/lib/oauth/providers/trae.ts`, `devin-desktop.ts`, `zed.ts` |
| `qoderFlow.ts` | `providers/qoder.ts` + `QODER_CONFIG` |
| `kilocodeFlow.ts` | `providers/kilocode.ts` + `KILOCODE_CONFIG` |
| `clineFlow.ts` | `providers/cline.ts` + `CLINE_CONFIG` (también para `clinepass`) |

`OAuthProviderFlow` (#106c) declara ahora `validateImportToken` opcional:
Devin y Zed lo tenían en la referencia fuera del contrato de su registro.

## Divergencias

1. **Qoder sin variables rehúsa nombrando las que faltan**, en vez de
   devolver `null` desde `buildAuthUrl`. Las variables son las de la
   referencia con prefijo `THYROX_` (`THYROX_QODER_OAUTH_*`).
2. **El texto de importación lo declara cada flujo** (`importTokenHint`): la
   referencia tiene el de Devin y el de Zed en el despachador y ninguno para
   Trae. El de Zed nombra el llavero sin las rutas del tablero, que este
   árbol no tiene.
3. **Devin y Zed comparten un constructor** (`bareTokenFlow`) que sólo
   difiere en la longitud mínima; la referencia repite el cuerpo.
4. **El código de Cline que no decodifica devuelve `null`** en vez de lanzar
   dentro de un `try` para caer al intercambio: la conducta es la misma.
5. **El reloj de Cline se inyecta** (`now`) para medir la caducidad sin reloj
   real.
6. **Trae sin `TRAE_CONFIG` completo**: los endpoints de SOLO, el esquema de
   autorización y las rutas del almacén de Trae son del ejecutor; sólo la vida
   del token (14 días) es del flujo.

## Verificación

Rojo persistido en `red-106d5a.txt`. Anulaciones: `annul-106d5a.sh`,
`results-106d5a.txt`.

## Anulaciones 11 y 12 — re-medidas

- **12 (relleno base64) era código muerto:** `Buffer` decodifica base64 sin
  relleno, así que retirar el relleno no cambiaba nada. Se retiró del puerto.
- **11 (`decodeURIComponent`) no discriminaba** porque el token de prueba no
  producía `+` ni `/` en su base64. Con `accessToken: '>>>???'` el código lleva
  `%2B`/`%2F` y la anulación tumba exactamente el caso de Cline (1 fail).
- Typecheck: build 0 errores; tsconfig de tests sólo los dos TS6059
  preexistentes. `__tests__/accounts`: 133 tests, 0 fail (job tsc-106d5a-20260928T100114).
