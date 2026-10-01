# Inventario de ListAgents (2.1.284) contra thyrox — TASK-THYROX-0600

Instrumentos, en este orden y por su ayuda (`bin/binary`: cabecera de
`src/packages/binary/bin/binary.ts`; `bin/parallel_map --help`):

```bash
R=_references/claude-code-bin/2.1.284/bunfs-root
bash bin/binary literal 'Formatted list of reachable agents'   # la herramienta
bash bin/binary declarations chunk-7h1n9jsx.js --root $R        # 33 declaraciones
bash bin/parallel_map 'bash bin/binary symbol $(echo {}) --root '$R \
    :::: symbols-by-chunk.txt > dependency-definitions.txt      # 44 de 44 resueltos
bash bin/parallel_map '<git grep por literal>' :::: probe-literals.txt
```

La extracción renombra los chunks: el `chunk-8xzbdmg9.js` / `chunk-mk0qbzxv.js`
del ejecutable vivo son aquí `chunk-hgxdsm9q.js` (herramienta) y
`chunk-7h1n9jsx.js` (implementación, reexportada por `chunk-1maf5a56.js`).
`map-imports.sh` se escribió a mano antes de usar `symbol`, que ya sigue los
import/export: queda como registro, no como instrumento.

## Superficie a portar

| Pieza | Símbolos | En thyrox |
|---|---|---|
| Herramienta `ListAgents` (alias `ListPeers`), esquema `channel`/`q` inertes, salida `listing`, `maxResultSizeChars` 1e4 | `x`, `d`, `S`, `p` | **no** — `getListPeersTool = () => null` (`tool-registry/.../BuiltInToolsProvider.ts:144`) |
| Listado: `listAllPeers` | `clr` | **no** |
| Formato para el modelo / para `/list-agents` | `aYo`, `ulr` y sus 21 auxiliares (`q z V Y J Q F M X v I j D E C B y w H R U`) | **no** |
| Extras del llamador (equipo, identidad propia) | `dlr`, `U` | **no** |
| Tabla de candidatos con `[ref]` | `tj`, `M6`, `DUe`, `oBo` (+ `R`, `Me`, `se`, `re` internos) | **no** |

## Dependencias ya portadas

| Símbolo | Qué es | Dónde |
|---|---|---|
| `KMt` | `SessionRecordsUnreadableError` | `local-observability/src/uds/liveSessionRegistry.ts:55` |
| `uOr` | endpoint propio ensombrecido | `hasConflictingMessagingSocketOwner` (`liveSessionRegistry.ts:444`) |
| `gq` | socket de mensajería del entorno | `messagingSocketEnvOverride` |
| `yK` | `tengu_session_stable_address` | `stableAddressEnabled` (`sessionRegistryState.ts:38`) |
| `Wv`, `dRr` | nombre registrado / elegido por humano | `registeredSessionName` |
| `qs` | puerta `tengu_harbor_kite` | `inboundGate.ts`, `peerFiles.ts` |
| `Jy`, `oT`, `fa` | archivo y contexto de equipo | `swarm/src/core/teamHelpers.ts:212`, `teammateContextAlias.ts` |
| `Ir`, `jne` | normalización y saneado de nombres | `unicodeSanitize.ts`, `sessionNameState.ts` (verificar paridad byte a byte) |
| `Zt` | duración `mostSignificantOnly` | `@thyrox/output` |

## Pendiente de otra tarea

- `pOr` — listado de pares locales con vivacidad `gone`/`recycled` y barrido: es
  D3, **TASK de la tarjeta #256** (en curso). ListAgents lo consume, no lo porta.

## Remote Control / nube — decisión del ejecutor

`D4e fon mon nHt gon aRr rHt cat kLe f8 PBt sRr rjn OUe nWr oHt` y las filas
`cloud`/`bridge`/`did`. Tres literales no aparecen en thyrox
(`[bridge:population]`, `primePeerIdentityOwner`, `listBridgePeerSessions`,
`hasCloudPeerAccess`); `@thyrox/bridge` sí existe (`peerSessions.ts`). Portar
esas ramas o declararlas vacías es alcance, no se decide aquí.

*Métrica:* símbolos importados por `chunk-7h1n9jsx.js` (44, resueltos por
`bin/binary symbol`) y literales distintivos buscados con `git grep` sobre lo
versionado en `src/packages`, sin `dist` ni `__tests__`.
*Ciega a:* un porte que exista con otro literal o sin cita del símbolo; la
paridad de conducta de lo que figura como portado, que exige su prueba.
