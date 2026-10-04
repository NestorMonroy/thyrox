# Variable 2 — `Edit` literal: el rechazo muestra las líneas cercanas

Search Existing: `FileEditTool.validateInput` (`@thyrox/tool-registry`) resolvía `old_string` con
`findActualString` —coincidencia exacta y comillas curvas— y rechazaba con «String to replace not found»
más lo pedido. **EXTEND**: `notFoundMessage` añade hasta 3 líneas del archivo parecidas a la primera línea de
lo pedido (Dice sobre bigramas ≥ 0.6), con su número y su texto exacto. Nunca aplica una coincidencia
aproximada: el modelo tiene que reenviar el texto literal.

Desarrollado en un worktree aislado (`.thyrox/runtime/worktrees/edit-not-found-feedback`) mientras corría el
experimento de contexto, para no cambiar el código que el trabajador carga a mitad de una medición; aplicado
desde `patches/edit-not-found-feedback.patch`.

## Anulaciones (en el worktree)

| Retirado | Cae | Decisión |
|---|---|---|
| umbral 0.6 | 3 tests | se queda |
| normalizar comillas | ninguno | retirado: el parecido ya lo tolera |
| quitar barras invertidas | ninguno | retirado |

*Ciega a:* el texto del rechazo dentro de una corrida real —el stream del trabajador no registra
`tool_result`—; el efecto se mide por conducta (un `Edit` que coincide y un parche no vacío). No hay prueba
de `validateInput` (exige contexto de aplicación completo): el cableado lo cubren el typecheck y la corrida.
