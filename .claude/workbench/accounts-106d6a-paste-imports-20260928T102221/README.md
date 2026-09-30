# #106d-6a — pegado de credenciales, auth.json de Grok y ZIP de JSON

Porte TDD de `omniroute: src/lib/oauth/{credentialBlob,pasteCredentials}.ts` y
de `utils/{grokCliAuthJson,jsonZipExtract}.ts`. `claudeAuthZipExtract.ts` y
`codexAuthZipExtract.ts` son en la referencia alias de `extractJsonZip`; los
importadores de 6b y 6c lo usan directamente. `codexConnectionSelection.ts`
ya está portado en #106b (`connectionIdentity.ts::pickCodexConnectionForUser`).

| Archivo | Qué |
|---|---|
| `red-106d6a.txt` | la mitad roja |
| `annul-106d6a.sh` | 23 anulaciones, una por mitad de juicio |
| `results-106d6a.txt` | veredicto por anulación: las 23 discriminan |

## Divergencias declaradas

- **Prefijo del blob:** `thyrox-cred-v1.` en vez de `omniroute-cred-v1.`: el
  blob lo emite el ayudante local de thyrox, y el prefijo es su nombre. Un blob
  de OmniRoute se rehúsa por su prefijo, como cualquier otro formato ajeno.
- **Validador del pegado de Grok:** la comprobación de «no es objeto o es
  arreglo» era inalcanzable — sólo se analiza lo que empieza por `{`, y eso da
  un objeto o un error de análisis — y se retiró.
- **ZIP:** `fflate` es dependencia de la raíz del árbol, igual que en
  `@thyrox/config`.

Typecheck: build 0 errores; tests sólo los dos TS6059 preexistentes. `__tests__/accounts`: 180 tests, 0 fail (job tsc-106d6a-20260928T102430).
