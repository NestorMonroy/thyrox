# Distancia a cero errores — medición del 2026-09-24T17:48:03

Medido sobre `feature/thyrox-l6` con `bash tests/run.sh` (job
`suite-completa-20260924T172616`) y `src/verify/check-cli-typecheck.sh`
(job `tsc-conteo-20260924T172617`). Cada cifra sale de esos logs o de
correr la suite aislada; ninguna se estima.

## Resumen

| Eje | Rojo | Verde / total | Sin medir |
|---|---|---|---|
| tsc (errores únicos) | **2324** | — | — |
| TypeScript (archivos de test) | **19** | 974 / 993 | 0 |
| Python (suites) | **2** | 221 / 224 | 1 |
| shell (suites) | **4** en la corrida (**1** aislada) | 104 / 110 | 2 |

*Métrica:* archivos o suites que el corredor marca `ROJO`, y líneas `error TS`
únicas de tsc.
*Ciega a:* lo que un test bloqueado en su import esconde detrás: 13 de los 19
rojos de TypeScript no llegan a ejecutar ninguna aserción.

## tsc: 2324, no 4648

`check-cli-typecheck.sh` mide dos proyectos (`tsconfig.json` y
`tsconfig.tests.json`) e imprime cada error una vez por proyecto: 4648 líneas
son 2 × 2324 errores únicos. Por código: TS2345 463 · TS2339 418 · TS18046 383 ·
TS2322 268 · TS18048 179 · TS7006 126 · TS2305 90. Exports ausentes (TS2305/TS2724):
**60** pares módulo/símbolo. Detalle en `tsc-por-codigo.txt`,
`tsc-por-paquete.txt` y `exports-ausentes-hoy.txt`.

## TypeScript: 19 archivos en rojo

| Primera causa | Archivos |
|---|---|
| falta `discoverSkillDirsForPaths` en `loadSkillsDir.ts` | 13 |
| falta `normalizeMessagesForAPI` en `messages.ts` | 1 |
| aserción de `automodeAntAlignment` (necesita `hasPermissionsToUseTool`) | 1 |
| smoke: `repl-smoke` nombra el mismo import de `loadSkillsDir` | 1 |
| smoke: `headless`, `bg-cycle`, `plugin-hooks`: arranque completo, causa **desconocida** | 3 |

Lista por archivo en `ts-rojos.tsv`.

## Python: 2 en rojo, 1 sin medir

- `test_installed_hooks_resolve`: el hook `PreToolUse` se escribe
  `PYTHONPATH=… python3 …` y el verificador no reconoce un intérprete precedido
  por una variable de entorno.
- `test_env_contract_keys`: `THYROX_VERSION` se lee en
  `permission/src/internalPaths.ts` sin declararse. **Regresión introducida en
  esta sesión** al portar ese archivo.
- Sin medir: `test_censo_contraparte` rehúsa porque faltan los clones `api` y
  `odoo-tools` (condición del entorno).

## shell: 4 en rojo en la corrida, 1 aislado

Corridas una a una (`shell-aislado.txt`): `test-workbench-sh`,
`test-bg-memfree` y `test_package_root_resolution` salen **0**. Rojo bajo carga
y verde aislado; una corrida no basta para llamarlo inestable, queda como
pendiente de repetir. Rojo real: `test-script-naming`, 15 identificadores en
español (13 en `generate_bin.py` y su test, congelados a propósito hasta el
final; 2 en `test_censo_contraparte.py`). Sin medir: `test-premise-drift` y
`test-verificar-premisa`, que rehúsan sin el clon de la aplicación.

## Cuántas faltan

- **Tests con causa conocida y arreglable aquí:** 19 (TS) + 2 (Python) + 1
  (shell) = **22**. Un solo símbolo, `discoverSkillDirsForPaths`, desbloquea
  la entrada de 13; lo que hay detrás no está medido.
- **Por repetir bajo carga:** 3 de shell.
- **No medibles en este entorno:** 3 (faltan clones ajenos).
- **tsc:** 2324 errores únicos, 60 de ellos exports ausentes.

## Viabilidad del plan «ciclo agente-compilador»

Viable, con cuatro correcciones medidas:

1. **La cifra de partida es 2324, no 4648.** Las cuentas por código y por archivo
   del plan están duplicadas (TS18046 766 = 2 × 383; `sessionStorage.ts` 198 = 2 × 99).
   El mayor concentrador real es `src/headless/sdk/session/run-streaming.ts`
   (183), ausente del plan.
2. **La cascada simulada no es evidencia.** Sus fracciones (0.25, 0.15, 0.10) son
   supuestas; la prioridad debe salir de medir cada cambio, no del script.
3. **La regla «si no baja, revertir» es demasiado estricta.** Tipar un `unknown`
   de un contrato expone errores nuevos donde antes TS no podía mirar: el total
   puede subir con un arreglo correcto. Criterio más fiel: baja el grupo atacado,
   el total no crece más que lo que el grupo destapa, y el subconjunto de tests
   derivado sigue verde.
4. **El patrón con `throw` cambia el comportamiento.** En un porte fiel al
   binario la corrección de TS18046 es de tipos (`import type`, contratos
   tipados), no un guard que lanza en tiempo de ejecución.

Causa raíz confirmada del mayor grupo de TS18046: `prev` (37 + 26 como
`prev.mcp`) sale de contratos que declaran
`setAppState: (f: (prev: unknown) => unknown)` (`mcp-runtime/src/api.ts:200,220`,
`contracts.ts:142,147`). Una iteración completa de tsc (dos proyectos) tardó
86 s con la suite corriendo a la vez.
