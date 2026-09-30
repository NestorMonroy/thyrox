# Anulación del estado persistente del AgentBridge (F0)

Controles sobre `src/packages/mitm/src/state/`, con la salida literal en
`results.txt`.

| Anulación | Casos que caen |
|---|---|
| A1 — `replaceUserBypassPatterns` sin transacción | el de la sustitución fallida que conserva los patrones previos |
| A2 — la copia a alias sin la guarda de agentes con clave propia | el que exige `{}` para `codex` |
| A3 — el upsert que reescribe la fila entera | los dos que dependen de no pisar campos ausentes |

Dato de la referencia que la prueba corrigió: `INSERT OR IGNORE` también
ignora la violación del `CHECK`, así que `addCustomHost` con un `kind`
desconocido no lanza — no inserta nada.
