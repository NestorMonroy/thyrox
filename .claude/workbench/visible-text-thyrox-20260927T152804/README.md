# Fase C de TASK #67: el texto visible dice thyrox

Decisión del ejecutor 2026-09-27: todo texto visible dice thyrox, y el archivo
de instrucciones es `THYROX.md` con `CLAUDE.md` de respaldo.

## `/init`, portado de 2.1.283 y rebautizado

El porte llevaba un prompt anterior: le faltaba la «Phase 0» y la oferta de
importación. La fuente está en `claude_strings.txt` (el bundle principal, fuera
de `bunfs-root`, donde `bin/binary literal` da 0 — `literal-init-prompt.txt`).

| Pieza | Símbolo | Archivo |
|---|---|---|
| prompt original | `lWo` | `lWo.txt` |
| prompt por fases | `dWo` | `dWo.txt` (líneas 1-156 de `dWo-window.txt`) |
| oferta de importación | `RFe` | `RFe.txt` |
| selectores | `aWo` (`CLAUDE_CODE_NEW_INIT` o `tengu_slate_harbor_experiment`), `lme` (`tengu_import`) | `init-selectors.txt` |
| el comando | `cWo`: `aWo()?dWo():lWo()`, sin marcar onboarding | `dWo-window.txt:156` |

`gen_init_prompts.py` escribe `app-host/src/commands/initPrompts.ts`: el
texto verbatim más un mapa de nombres explícito, en orden. Rehúsa escribir si
queda el nombre del producto, así que el mapa incompleto no produce archivo.

Tampoco el mercado `claude-plugins-official` en `/plugin install x@claude-plugins-official`:
es el identificador de un recurso externo y thyrox instala de él
(`config/plugin/schemas.ts`, `officialMarketplaceGcs.ts`).

Lo que NO se rebautiza, porque thyrox sigue leyéndolo ahí: `.claude/settings`,
`.claude/skills/`, `.claude/worktrees/`. `.claude/rules/` pasa a
`.thyrox/rules/` al escribir y se nombran los dos al leer.

Única divergencia de contenido: la fase 0 busca `THYROX.md` y, si falta, el
heredado `CLAUDE.md`, y escribe el resultado en `THYROX.md` conservando lo que
decía. Sin eso, un proyecto con sólo `CLAUDE.md` lo perdería: el cargador
prefiere `THYROX.md`.

Pendiente declarado: `/import` y `thyrox import` no están portados; la rama
que los nombra sólo aparece con la bandera `tengu_import`, apagada por defecto.

## Controles

- `initPrompts.test.ts` (8) y `initCommand.test.ts` (2).
- Anulación: el generador sin su mapa rehúsa («quedó el nombre del producto»);
  con el mapa sin `${RFe}` en `lWo`, cae el caso de `tengu_import` (medido al
  escribirlo: la rama referenciaba un `RFe` inexistente).

## El resto del texto visible: `src/verify/renameProductInText.ts`

Una herramienta sobre el AST de TypeScript que sólo edita literales de cadena,
plantillas y texto JSX (nunca identificadores ni comentarios) y lleva el
nombre a `PRODUCT_NAME`. Suite: `tests/verify/renameProductInText.test.ts`.
Anulación del resguardo de guiones: cae exactamente su caso.

Casos que el mapa resuelve aparte, cada uno con su prueba: nombres de modelo
(se queda la familia y su versión), la API y el SDK del proveedor, dominios
(`….ai`, `….com` no cambian), identificadores de protocolo (`X-Session`), y
atributos JSX (pasan a `{`…`}`).

`repl-dry-run.txt` y `rest-dry-run.txt` son la simulación previa a escribir.
Los literales que se comparan (`===`, `endsWith`, …) se revisaron a mano
(`rest-compared.txt`): los que detectan el archivo de instrucciones se
cambian por `isInstructionsFileName`, no por el nombre nuevo.

## Lo que la primera pasada sobre el resto rompió, y cómo se evita

La herramienta renombró también los literales que NOMBRAN el archivo heredado
a propósito: `LEGACY_INSTRUCTIONS_FILE_NAME = 'CLAUDE.md'` pasó a `THYROX.md`
y el cargador dejó de leer los proyectos sin migrar (cayeron 14 casos de
storage, 5 de config y 3 del prompt del bucle). También cambió las claves
remotas de `SYNC_KEYS` y la fase 0 generada de `/init`.

Se restauraron los tres archivos y la herramienta respeta ahora tres señales,
cada una con su prueba: el nombre de la declaración dice `legacy`; la
sentencia lleva `// renameProductInText: keep`; el archivo es generado
(«Generado por» en su cabecera: se corrige el generador, no el archivo).

Pruebas que fijaban el texto viejo se actualizaron al nuevo (meterState,
createPermissionRequestMessage, pathSafety, cronPromptBuilders,
messageContractStrings, subscriptionHelpers). El pie de PR perdió el enlace a
la página del producto ajeno: thyrox no publica una propia.
