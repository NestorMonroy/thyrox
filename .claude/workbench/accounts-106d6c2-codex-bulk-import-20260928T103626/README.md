# #106d-6c-2 — importación masiva de codex y JSON de sesión

Porte TDD de `omniroute: src/lib/oauth/services/codexImport.ts`
(normalizar, preservar el estado de una reimportación, aplanar lo subido) y
`utils/codexSessionImport.ts` (el JSON copiado de `chatgpt.com/api/auth/session`).

| Archivo | Qué |
|---|---|
| `red-106d6c2.txt` | la mitad roja |
| `annul-106d6c2.sh` | 28 anulaciones |
| `results-106d6c2.txt` | veredicto: 27 discriminan; la 22 era código muerto (abajo) |

## Divergencias declaradas

- **Reloj inyectado** (`nowMs`) para la caducidad por defecto y el vencimiento
  de la sesión.
- **Un solo decodificador de JWT** (`accounts/jwtPayload.ts`) en vez de la
  copia local de la referencia; `decodeJwtExp` no se exporta: sus usos leen
  `exp` del mismo decodificador.
- **`looksLikeCodexSessionJson` sin el filtro `startsWith('{')`**: la anulación
  22 lo retiró sin que cambiara ningún resultado — lo que no es un objeto ya
  falla la comprobación de objeto tras analizarlo. Era un atajo, no una mitad
  de juicio, y se retiró.

Typecheck: build 0 errores; tests sólo los dos TS6059 preexistentes. `__tests__/accounts`: 213 tests, 0 fail (job tsc-106d6c-20260928T103905, común a 6c-1 y 6c-2).
