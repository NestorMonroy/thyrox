# analizar-qwen-code-para-thyrox

## El encargo

> analiza qwen-code y si consideras que tiene codigo o implementaciones que nos
> pueda ayudar para nuestra implementacion de thyrox, integralo, claro esta
> usando thyrox no queremos dependender de qwen-code

## La premisa, si se corrigio al primer comando

qwen-code (`NestorMonroy/qwen-code@ffea2d0`, Apache-2.0) es un fork de Gemini
CLI. thyrox porta el contrato de Claude Code 2.1.275 y el binario gana, así que
qwen-code sólo aporta donde (a) el binario no tiene contrato, o (b) es un
mecanismo autocontenido que no cambia el contrato. Apache-2.0 permite copia con
atribución; aun así nada de qwen-code entra como dependencia.

## Las piezas

| archivo | que hace |
|---|---|
| `missing-exports.txt` | los 25 módulos con exportaciones ausentes (tsc, paso 52) |
| `partial-ports.txt` | los 89 archivos que declaran porte parcial |

Cuatro subagentes de lectura compararon por área (contexto, sesión y mensajes,
permisos y shell, utilidades y skills). Sus tablas son testimonio de nivel 3;
lo de abajo es lo que sobrevivió a la verificación contra el árbol.

## Los resultados

| Candidato del agente | Verificación | Veredicto |
|---|---|---|
| `splitCommands`/`detectCommandSubstitution` (shell-utils.ts) | **Refutado**: thyrox ya porta el parser bash del binario (`shell/src/bash/commands.ts`, `ast.ts`, `treeSitterAnalysis.ts`) | no se integra — sería regresar a regex |
| `yaml-parser.ts` para el shim `agent/yaml.ts` | **Refutado**: `config/yaml.ts` ya existe; sólo la cabecera del shim está vieja | no se integra |
| `computeThresholds` (chatCompressionService.ts:210) | Cierto, pero qwen declara que copia `autoCompact.ts` de Claude Code; thyrox ya tiene 20 000 / 13 000 del binario (`agent/loop/context/autocompact.ts:30,37`) | no se integra — el binario es la fuente primaria |
| `StreamEvent`/`createEventMapper` para `handleMessageFromStream` | Forma de eventos de Gemini; el contrato es `LKe`/`i3n` de 2.1.275 | sólo lectura |
| `PermissionManager` para `hasPermissionsToUseTool` | Modelo de reglas y modos distinto; el contrato es 2.1.275 | sólo lectura |
| `LoopDetectionService` (loopDetectionService.ts, 1730 líneas) | **Brecha real**: 0 detectores en thyrox; el binario 2.1.275 tampoco tiene uno (sus `tengu_*loop*` son programación, keepalive y bucle de eventos) | candidato — decisión del ejecutor: añade conducta que Claude Code no tiene |

*Métrica:* símbolos y literales buscados por nombre en `src/packages` de
thyrox y en el corpus de 2.1.275; archivos de qwen-code leídos en su línea.
*Ciega a:* un mecanismo equivalente con otro nombre en cualquiera de los dos
árboles, y a la calidad de las partes de qwen-code que ningún agente abrió.

## Deriva 2.1.275 → 2.1.281 en las guardas de lectura/escritura (2026-09-24T20:36:58)

Medido con `binary.ts symbol` sobre `chunk-mm8vme0b.js` (2.1.281) y
`chunk-9apg35nm.js` (2.1.275); los volcados están en este banco:
`read-*.txt`, `write-*.txt`, `helpers-2.1.281.txt`,
`landing-2.1.281.txt`, `resolve-2.1.281.txt`.

- **Portado** (`9d19b369`): `UH` → `isKernelResolvedPath` y sus tres
  comprobaciones en `ULn`; de paso, la rama `/net/<host>` que el porte de
  `k_n` omitía (H-THYROX-174).
- **Pendiente, alcance medido:** la resolución de rutas cambió de forma.
  `getPathsForPermissionCheck` (`On`) pasa a ser `vt(e,"permission")`
  (`Aa`), que devuelve `{requested, spellings, landing, unresolved,
  leafIsSymlink}` recorriendo cada salto (`ue`/`Ce`). Encima se apoya
  una capa de «aterrizaje» del enlace: `sot`, `WVe`, `sen`, `ien`,
  `Nr`, `KY`, `Ir`, `Or` y `jLn`. `xr` (≙ `Bs`) toma el objeto
  resuelto y niega si `unresolved`; `Jv`/`ib` niegan con `Or` una
  ruta cuyo destino no se pudo determinar, y en escritura añaden
  `blockedPath` y `personOnly` (`classifierApprovable:false`).
  Es una subiniciativa, no un parche: toca el resolvedor de `storage` y
  sus cinco consumidores de permisos.
