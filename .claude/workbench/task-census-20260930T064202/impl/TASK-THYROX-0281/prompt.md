# TASK-THYROX-0281

Fuente: `/home/user/thyrox/.claude/workbench/packages-20260930T052338/p3-permission-policy-ports.md`

## La tarea

## [18] TASK-THYROX-0281 — Auditar la deriva 2.1.275 → 2.1.281 en los portes de permisos (UH y guardas)

Status on board: in_progress

Hecho: UH/ULn portados (9d19b369, H-THYROX-174). Pendiente, alcance medido en el banco analizar-qwen-code-para-thyrox-*: el resolvedor vt(e,'permission') de 2.1.281 ({requested,spellings,landing,unresolved}) y la capa de aterrizaje de enlaces (sot/WVe/sen/ien/Nr/Ir/Or/jLn, xr≙Bs) que usan Jv/ib.

## Estado medido por el censo: parcial

Evidencia (cada línea salió de un comando; vuelve a medir lo que uses):

- UH/ULn portados: commit 9d19b369f 'Port 2.1.281 network-read guards for file tools' (pathSafety.ts, fileToolPermissions.ts, networkPathRead.test.ts) es ancestro de HEAD e77250e82 — git merge-base --is-ancestor 9d19b369f HEAD → exit 0
- isKernelResolvedPath (≙ UH): src/packages/permission/src/pathSafety.ts:277, usado en :720 y :794 — rg -n isKernelResolvedPath src/packages/permission/src
- checkNetworkPathRead ≙ k_n (2.1.281: ULn) declarado en src/packages/permission/src/fileToolPermissions.ts:9 — rg -n '≙ `(Bs|Jv|ib|UH|ULn)`'
- Prueba de UH/ULn: 8 pass, 0 fail — cd src/packages/permission && bun test src/__tests__/networkPathRead.test.ts
- Resolvedor estructurado NO portado: 0 archivos con leafIsSymlink|stoppedAt|carriedOut|landingOutside|spellingInside en src/packages — rg -n ... src/packages --glob '!node_modules/**' (salida vacía)
- Resolvedor vigente sigue devolviendo string[]: src/packages/storage/src/fsOperations.ts:325 export function getPathsForPermissionCheck(inputPath: string): string[] — sed -n 300,380p
- Consumidores en permission que reciben string[]: filesystem.ts, pathValidation.ts, pathSafety.ts, internalPaths.ts, fileToolPermissions.ts (5 no-test) — rg -c getPathsForPermissionCheck src/packages
- Porte de Bs (denyOutsideWorkingDirectories) toma pathsToCheck: readonly string[] y no tiene rama `unresolved`: src/packages/permission/src/fileToolPermissions.ts:146-163 — sed -n 140,170p
- Portes de Jv/ib (checkReadPermissionForTool :443, checkWritePermissionForTool :556) llaman getPathsForPermissionCheck(path) y aceptan precomputedPathsToCheck?: readonly string[] — sed -n 443,462p; sed -n 556,572p
- Capa de aterrizaje ausente: 0 hits de 'which is outside the allowed working directories', 'Write to the link's target path', carriedOut en src/packages — rg -n (sólo blockedPath en tipos y BashTool/PowerShell pathValidation, que es el mecanismo previo)
- Alcance medido en banco: /home/user/thyrox/.claude/workbench/analizar-qwen-code-para-thyrox-20260924T201614/README.md:44-66 (resolve-2.1.281.txt:3 vt(e,n) → {unresolved,requested,spellings,landing,leafIsSymlink}; landing-2.1.281.txt:6 WVe; resolve-2.1.281.txt:14 sot; helpers-2.1.281.txt:18 jLn) — sed -n 40,75p README.md; rg -n 'vt\(e|landing|WVe|jLn|sot' <banco>
- En 2.1.283 la misma forma persiste y crece: Rt(e,n) con Ua(e)=Rt(e,'permission') y H6(e)=Rt(e,'screen'), campos {unresolved,requested,spellings,landing,leafIsSymlink,stoppedAt}, más n5e/ect/Zlt/kl (≙ WVe/sot/Or/xr) — rg -o en _references/claude-code-bin/2.1.283/bunfs-root/chunk-zkn0228z.js:15 y chunk-d310mfjt.js:107
- Baseline de las suites que el porte restante extendería: fileToolPermissions.test.ts 18 pass/0 fail; fsOperations.test.ts 23 pass/0 fail — bun test desde src/packages/permission y src/packages/storage

## Lo que falta — tu alcance

- Portar vt(e,'permission') (2.1.283: Rt/Ua) como resolvedor estructurado que devuelva {requested, spellings, landing, unresolved, leafIsSymlink} recorriendo cada salto del enlace, en lugar del string[] de getPathsForPermissionCheck
- Portar la capa de aterrizaje: sot (landing ≠ requested), WVe ({landing, landingOutside, spellingInside, carriedOut}), sen/Nr (frase «…, which is outside the allowed working directories»), ien, Ir (mensaje ask con blockedPath), Or (deny «target could not be determined»), jLn ({landing, sentence, personOnly})
- Cambiar denyOutsideWorkingDirectories (≙ Bs → xr) para recibir el objeto resuelto y negar si unresolved
- Cambiar checkReadPermissionForTool/checkWritePermissionForTool (≙ Jv/ib) para consumir el objeto resuelto, negar con Or cuando unresolved y, en escritura, añadir blockedPath y personOnly (classifierApprovable:false)
- Adaptar los otros cuatro consumidores de getPathsForPermissionCheck en permission (filesystem.ts, pathValidation.ts, pathSafety.ts, internalPaths.ts) a la nueva forma o a un adaptador que devuelva .spellings
- Escribir pruebas de anulación: enlace con destino irresoluble (unresolved → deny), enlace cuyo landing cae fuera del cwd (carriedOut → blockedPath = landing), hoja simbólica en escritura (leafIsSymlink)

## Archivos que te pertenecen

- src/packages/storage/src/fsOperations.ts
- src/packages/permission/src/fileToolPermissions.ts
- src/packages/permission/src/filesystem.ts
- src/packages/permission/src/pathValidation.ts
- src/packages/permission/src/pathSafety.ts
- src/packages/permission/src/internalPaths.ts
- src/packages/permission/src/permissionTypes.ts
- src/packages/storage/src/__tests__/fsOperations.test.ts
- src/packages/permission/src/__tests__/fileToolPermissions.test.ts

Si el trabajo exige tocar un archivo fuera de esta lista, no lo toques: dilo en tu respuesta con el archivo y la razón.

## Pruebas

- src/packages/permission/src/__tests__/networkPathRead.test.ts: 8 pass / 0 fail (medido)
- src/packages/permission/src/__tests__/fileToolPermissions.test.ts: 18 pass / 0 fail (baseline medido; habría que extender con unresolved/landing/leafIsSymlink)
- src/packages/storage/src/__tests__/fsOperations.test.ts: 23 pass / 0 fail (baseline medido; habría que extender con la forma estructurada del resolvedor)
- Suite nueva a escribir: resolvedor estructurado y capa de aterrizaje (p. ej. src/packages/permission/src/__tests__/pathLanding.test.ts)

## Dependencias

- Decisión de qué versión del ejecutable gobierna el porte: la tarea nombra 2.1.281, pero el corpus de referencia vigente es 2.1.283, donde el resolvedor añade stoppedAt y el modo 'screen' (H6)

## Versión que gobierna el porte

El corpus vigente es 2.1.283 (`/home/user/thyrox/_references/claude-code-bin/2.1.283/`): el porte se mide y
se ajusta contra 2.1.283, incluidos `stoppedAt` y el modo `screen` del resolvedor. Donde 2.1.281 difiera,
la diferencia se declara en la tabla de veredictos; no se porta la versión anterior.
