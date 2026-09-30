# ProjectConfig y la migración de aprobación MCP

## El encargo

Continuar el plan hasta cero y, para el ejemplo concreto
`migrateEnableAllProjectMcpServersToSettings.ts`, usar los mecanismos de
`.claude/workbench`, `.claude/jobs`, `.claude/cache`, `.claude/build-logs` y
los wrappers de `bin/` antes de inventar una solución.

## La premisa corregida al primer comando

La propiedad no es una capacidad nueva. El archivo de migración ya porta una
lectura, copia a `localSettings` y eliminación de tres claves heredadas. Dos
de ellas (`enabledMcpjsonServers`, `disabledMcpjsonServers`) estaban en
`ProjectConfig`; `enableAllProjectMcpServers` faltaba aunque el mismo módulo la
lee dos veces y la retira al final. El significado es «dato legado que debe
caber hasta migrarse», no «setting de proyecto vigente».

También se midió un defecto del entorno: el `.env` versionado todavía apuntaba
a `/home/user/thyrox`. La primera invocación de `bin/thyrox-bg` ejecutó en el
checkout correcto, pero asentó la evidencia bajo el hogar antiguo. Se ejecutó
`bin/write-env --force`; el segundo job quedó correctamente bajo este checkout.
Una sesión nueva debe regenerar `.env` antes de lanzar jobs, tal como declara
el propio wrapper.

## Las piezas

| archivo | qué hace |
|---|---|
| `outputs/red-typecheck.txt` | conserva los cuatro diagnósticos que prueban la ausencia del contrato |
| `outputs/green-global-config.txt` | prueba las tres claves legadas mediante `satisfies ProjectConfig` y la conducta del registro |
| `outputs/green-typecheck.txt` | conserva el nuevo censo completo y permite atribuir el delta |

## Los resultados

La corrección añade una propiedad optional y deprecated al provider; no añade
un default, porque la ausencia significa que no existe nada por migrar. El
control Bun publica 8 casos verdes. El typecheck completo pasó de 5 236 diagnósticos en 1 037 archivos a 5 225 en 1 033. Los cuatro diagnósticos del contrato MCP y los ocho diagnósticos de estado de migración desaparecieron; el test de contrato añadió un rojo antes de la implementación, de modo que el delta neto del árbol es -11. No se infirió desde el test local.

*Métrica:* cabeceras `error TS####`, no líneas del log, y presencia de los
cuatro diagnósticos del sujeto antes/después.

*Ciega a:* integración con un settings file real y a los errores de otros
providers que el mismo typecheck enumera.
