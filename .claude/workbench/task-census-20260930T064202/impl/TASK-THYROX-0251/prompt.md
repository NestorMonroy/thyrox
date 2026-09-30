# TASK-THYROX-0251

Fuente: `/home/user/thyrox/.claude/workbench/packages-20260930T052338/p3-permission-policy-ports.md`

## La tarea

## [15] TASK-THYROX-0251 — Portar la rama de productores de plugin de Lu (isSensitivePath)

Status on board: pending

Lu de 2.1.275 marca sensible un archivo bajo un directorio productor de comandos de plugin (eqr: sourceProducerPath/previousProducerPaths de installed_plugins.json) o bajo la raíz de un plugin en línea (QGr: inlinePlugins/inlinePluginsNoMcp del anfitrión), con canonicalización PS/LRn de chunk-gfewy5rb. thyrox no registra rutas productoras ni tiene la API de plugins en línea. Condición de cierre: el esquema de plugin instalado con esas dos claves y la API de raíces en línea, más la canonicalización PS.

## Estado medido por el censo: pendiente

Evidencia (cada línea salió de un comando; vuelve a medir lo que uses):

- isSensitivePath (≙ Lu) portado sin la rama de productores; la cabecera lo declara divergencia con sucesor TASK-THYROX-0251: src/packages/permission/src/pathSafety.ts:19-27 y :572-620 — `sed -n 1,60p; sed -n 540,690p src/packages/permission/src/pathSafety.ts`
- commit que dejó la divergencia declarada: 85a6bcfac 'Port the auto-edit path safety check from 2.1.275' — `git log --oneline -S'TASK-THYROX-0251' -- src/packages/permission/src/pathSafety.ts`; el archivo no ha recibido la rama desde entonces (últimos 5 commits: ef9bdacbf, f0796cef1, 446382c45, 580500b02, cecb184f9) — `git log --oneline -5 -- src/packages/permission/src/pathSafety.ts`
- sourceProducerPath/previousProducerPaths: 0 hits en src/ y tests/ fuera del comentario de pathSafety.ts — `git grep -n -E 'sourceProducerPath|previousProducerPaths|inlinePluginsNoMcp|producerPath' -- src tests`
- esquema de plugin instalado sin claves productoras (scope, projectPath, installPath, version, installedAt, lastUpdated, gitCommitSha): src/packages/config/plugin/schemas.ts:1532-1556 — `sed -n 1530,1565p src/packages/config/plugin/schemas.ts`
- API de plugins en línea existe a medias: getInlinePlugins/setInlinePlugins en src/packages/app-host/src/bootstrap/state.ts:1621-1626; inlinePluginsNoMcp: 0 hits en src/ — `git grep -n -i NoMcp -- src`
- la rama sigue viva en 2.1.283 (no obsoleta): sourceProducerPath/previousProducerPaths en bunfs-root/chunk-f4e2prfk.js:11 (esquema con .passthrough() y getter que añade cada ruta canonicalizada a un Set) y chunk-csayct82.js:3415-3422; inlinePluginsNoMcp en chunk-nvht7ckf.js:11 (extensionsConfig.inlinePluginsNoMcp/replaceInlinePluginsNoMcp) — `rg -o -n ... /home/user/thyrox/_references/claude-code-bin/2.1.283/`
- canonicalización: realpathOrUndefined existe (pathSafety.ts:177) pero sólo la usan los predicados de red (:496, :514), no isSensitivePath — `grep -n -i -E 'realpath|canonical|normalize\(' src/packages/permission/src/pathSafety.ts`
- suite actual verde sin ningún caso de la rama: 18 pass / 0 fail / 35 expect, 0 líneas con producer|inline en el test — `cd src/packages/permission && bun test src/__tests__/pathSafety.test.ts`; `grep -c -i -E 'producer|inline' src/__tests__/pathSafety.test.ts`

## Lo que falta — tu alcance

- Añadir sourceProducerPath (string opcional) y previousProducerPaths (array de strings opcional, filtrando no-strings) a PluginInstallationEntrySchema en src/packages/config/plugin/schemas.ts, con passthrough para no romper installed_plugins.json existentes
- Escribir el registro de rutas productoras (≙ eqr de 2.1.275 / gHr de 2.1.283): leer installed_plugins.json, recorrer cada instalación, canonicalizar cada ruta y devolver el conjunto
- Añadir inlinePluginsNoMcp junto a inlinePlugins en app-host state (set/get) y una función que devuelva las raíces de plugins en línea (≙ QGr)
- Añadir en isSensitivePath, antes de los predicados de red, la comprobación de que la ruta canonicalizada (realpath con fallback lexical, ≙ PS/LRn) cae bajo una ruta productora o bajo una raíz de plugin en línea
- Retirar la divergencia declarada en la cabecera de pathSafety.ts:19-27 y documentar la nueva correspondencia
- Casos de prueba: archivo bajo sourceProducerPath → sensible; bajo previousProducerPaths → sensible; bajo raíz de plugin en línea → sensible; fuera de todas → no cambia; y control de anulación (retirada la rama caen exactamente esos casos)

## Archivos que te pertenecen

- src/packages/permission/src/pathSafety.ts
- src/packages/permission/src/__tests__/pathSafety.test.ts
- src/packages/config/plugin/schemas.ts
- src/packages/config/plugin/installedPluginsManager.ts
- src/packages/app-host/src/bootstrap/state.ts
- src/packages/cli/src/entry/run-program.ts

Si el trabajo exige tocar un archivo fuera de esta lista, no lo toques: dilo en tu respuesta con el archivo y la razón.

## Pruebas

- src/packages/permission/src/__tests__/pathSafety.test.ts: 18 pass / 0 fail hoy (bun test); habría que añadir ~4 casos de la rama productora/en línea más su anulación
- src/packages/config/__tests__/ (nuevo o existente de schemas): parseo de una entrada con sourceProducerPath/previousProducerPaths y con entradas no-string en el array

## Dependencias

- TASK-THYROX-0281 (auditoría de deriva 2.1.275→2.1.281 de los portes de permisos): la rama en 2.1.283 (gHr) añade commandProducerDirsDenied/WSL respecto a eqr de 2.1.275; conviene fijar contra qué versión se porta antes de escribir
