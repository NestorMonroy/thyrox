# TASK-THYROX-0281 — el resolvedor estructurado y la capa de aterrizaje de enlaces

Fuente que gobierna: `/home/user/thyrox/_references/claude-code-bin/2.1.283/`
(sólo lectura: `bin/binary symbol`, `rg -o`). La tarea nombra 2.1.281; el
corpus vigente es 2.1.283 y es contra el que se mide. Donde 2.1.281 difería
se declara en la tabla de veredictos.

Estado de partida (medido antes de tocar nada):

| Suite | Resultado |
|---|---|
| `storage/src/__tests__/fsOperations.test.ts` | 23 pass / 0 fail |
| `permission/src/__tests__/fileToolPermissions.test.ts` + `networkPathRead.test.ts` | 26 pass / 0 fail (18 + 8) |

*Métrica:* salida de `bun test` por paquete, 2026-09-30T08:4x.
*Ciega a:* cualquier otra suite del árbol que importe estos módulos y no
haya corrido aquí (la regla de alcance derivado la acota a lo tocado).

## Símbolos consultados en 2.1.283

Todos en `bunfs-root/`; «chunk» y «línea» son los del volcado; el rango
`[a,b)` es el que `bin/binary symbol` imprime.

### El resolvedor (`chunk-zkn0228z.js`, línea 15)

| Símbolo | Rango | Qué hace | Veredicto |
|---|---|---|---|
| `Rt(e,n)` | [43140,…) | Resolvedor estructurado. Expande `~`, corta sin tocar disco si la ruta es UNC no-WSL, automontaje o `/Network`, y si no interpreta el walker `de` sobre el fs activo. Devuelve `{unresolved:false, requested, spellings, landing, leafIsSymlink}` o `{unresolved:true, requested, spellings, stoppedAt, leafIsSymlink}`. Dos modos: `permission` y `screen`. | **Portado** como `resolvePathForPermission` (≙ `Ua`) y `resolvePathForScreen` (≙ `H6`), dos entradas sin argumento selector sobre un núcleo común (`runPathWalk`). |
| `Ua(e)` | — | `Rt(e,"permission")`. | Portado: `resolvePathForPermission`. |
| `H6(e)` | — | `Rt(e,"screen")` → `{paths: spellings, vetted: !unresolved}`. | Portado: `resolvePathForScreen`. Su consumidor (la criba de rutas de Bash) queda fuera de esta lista de archivos. |
| `To(e)` | [47787,47987) | Adaptador: `Ua(e).spellings`; si `unresolved`, añade el `resolvedPath` de `Bo` (≙ `safeResolvePath`) cuando es canónico o enlace y no estaba. | **Portado** como el nuevo cuerpo de `getPathsForPermissionCheck`: mismo nombre y `string[]`, así los cuatro consumidores que sólo necesitan grafías (`pathValidation`, `pathSafety`, `internalPaths`, `filesystem` vía binding) siguen correctos sin cambio de contrato. |
| `u9e(e)` | — | Resultado trivial `{landing:e, spellings:[e]}`. | No portado: sin consumidor en este alcance. |
| `Gn(fs,at,rest)` | [47590,47696) | `realpathSync(at)`; si difiere, lo devuelve unido a `rest`. | Portado: `realpathVariant`. |
| `hxe(fs)` | — | Ancestro común entre el cwd de lanzamiento (`O9e`: null si la sesión es `bg`) y `fs.cwd()`. | Portado: `launchAncestryOf` con `THYROX_CODE_SESSION_KIND === 'bg'` y `getOriginalCwd` de `sessionPaths.ts`. |
| `Be(gen, fn)` | — | Intérprete síncrono del walker: cada `yield` es una petición al fs; una excepción se convierte en `{errno}`. | Portado: `interpretWalk`. |
| `de(e,n)` | [39334,42015) | El walker por saltos: `lstat` por componente, `readlink` en cada enlace, `opendirNofollow` como segunda oportunidad ante un error que no sea ENOENT/ENOTDIR/ENAMETOOLONG, ancestros de lanzamiento no legibles tolerados (`NYn`), detección de ciclos por `(ruta, resto)`, tope de 64 saltos, colapso a raíz de red (`ue`), `\0unverified-ancestry` (`Fh`) cuando la ascendencia no se pudo verificar. | **Portado en las ramas que `Rt` alcanza**: `unreadableAncestry:'unverified'` siempre, sin `anchors`, sin `surfaceNetworkRaw`, sin `literalLinkText:'opaque'` (`g1t`). Esas tres opciones sólo las pasan `pf`/`Rde`/`Bo`, otros consumidores; se declaran como divergencia y no se portan a ciegas. La rama `S=!1 … /dev/fd` es código muerto en la fuente (constante `false`). |
| `St(errno,opts,hops,dots,trailing)` | [36883,37117) | Veredicto ante un error de `lstat`/`readlink`: ENOENT/ENOTDIR → sin veredicto (la ausencia es un `outcome`); ENAMETOOLONG sin saltos, sin `.`/`..` y sin punto/espacio final → sin veredicto; el resto → `Fh`. | Portado: `unverifiedVerdict`. |
| `ue(head,rest,cb)` | [36155,36326) | Colapso a raíz de red: si `rest` está vacío o alguien lleva `.`/`..`, avisa por `cb` con la ruta unida y devuelve la raíz normalizada (`zn`/`Un`: raíz de automontaje o `normalize`). | Portado: `collapseToNetworkRoot`. |
| `NYn(a,b)` | [35687,35873) | ¿Es `a` ancestro estricto de `b` (misma raíz, prefijo por segmentos)? | Portado: `isStrictAncestor`. |
| `Ot/oe/ae/le/M/xt/At/q6` | [37117,37531) | Los anclajes (`anchors`) y los predicados de red por anclaje. Con `anchors` indefinido —lo que `Rt` pasa— `ae`/`xt` son `false` y `le`/`M` son `true`. | No portados como tales: sus valores con `anchors` indefinido están plegados en el walker. |
| `Fh` / `g1t` | [36359,36385) | Los dos centinelas (`\0unverified-ancestry`, `\0opaque-link-text`). | `Fh` portado como `UNVERIFIED_ANCESTRY`; `g1t` no (rama no alcanzada). |
| `xn(t)` | `chunk-yqm14hey.js` [7133,7157) | Identidad en esta build. | Se omite: no hay nada que portar. |

### Predicados de forma de ruta (`chunk-yqm14hey.js`)

| Símbolo | Qué hace | Veredicto |
|---|---|---|
| `Ln` [7157,7205) | UNC: `^[\\/]{2}` o espacio de dispositivo (`_N`). | En `permission` ya existe como `isUncPath`; `storage` no puede importar `permission` (la dependencia va al revés: `pathSafety.ts` importa `fsOperations.ts`), así que el resolvedor lleva su copia mínima `isUncSpelling` con esa razón declarada. |
| `Il` [13532,13659) | `\\wsl$\<distro>` local. | Idem: `isLocalWslSpelling`. |
| `Wi=Yi=G_e!==null` [10544,11151) | Raíz de automontaje `/net/<host>` o `/Network/Servers/<host>`. | Idem: `automountRootOf` (misma forma que `automountRoot` de `pathSafety.ts`, sin la caché). |
| `nS` [11550,11748) | `/net` exacto (el mapa). | Idem: `isAutomountMap`. |
| `yN=Pt` [11748,12089) | Primer segmento `network` (`/Network`, macOS). | Idem: `isNetworkBrowseRoot`. |
| `N_` [7815,8111) | `/.vol`, `/.file`, `/.nofollow`, `/.resolve` como primer segmento. | Idem: `isKernelResolvedSpelling` (misma forma que `isKernelResolvedPath`). |
| `NA` [12089,12113) | Constante `false` en esta build. | Se omite. |
| `rl` [7489,7551) | ¿Lleva algún segmento `.`/`..` (con punto/espacio final tolerado)? | Portado: `hasDotSegment`. |
| `jF=Pyn` [7625,7765) | Igual que `rl` pero estricto (sin la cola `[. ]*`), en linux. | Portado: `hasStrictDotSegment`. |
| `Ne/Wh` [7205,7259) | Un texto de enlace con `..` interior (tras quitar los `..` iniciales de uno relativo). | Portado: `linkTextClimbs` (sólo modo screen). |

### La capa de aterrizaje (`chunk-d310mfjt.js`, línea 107)

| Símbolo | Rango | Qué hace | Veredicto |
|---|---|---|---|
| `ect(r)` | [244464,244562) | `landing` si difiere de `requested` tras plegar alias (`tl`); null si `unresolved` o si son la misma. | Portado: `landingBeyondRequested`. |
| `tl(e)=H0t(xn(resolve(e)))` | [244562,244599) | Pliega los seis alias de macOS (`/private/tmp`→`/tmp`, …, `/usr/sbin`→`/sbin`) cuando `realpathSync(alias)` confirma el par. | Portado: `aliasFoldedPath` con la misma tabla, calculada una vez. En este contenedor sólo `/usr/bin`→`/bin` y `/usr/lib`→`/lib` confirman (merged-usr). |
| `n5e(r,ctx,dirs)` | [244289,244464) | `{landing, landingOutside, spellingInside, carriedOut}`: la grafía pedida está dentro y el aterrizaje fuera. | Portado: `symlinkLanding`. |
| `cln(path,landing)` | [244812,244932) | «X resolves through a symlink to Y[, which is outside the allowed working directories]». | Portado: `landingSentence`. |
| `Tl(a,b)` | [245587,245662) | «A resolves through a symlink to B». | Portado: `resolvesThroughSymlink`. |
| `dln(e)` | [245662,245824) | Razón «Where X leads on disk could not be determined (…)». | Portado: `unresolvedTargetReason`. |
| `xl(op,path)` | [245317,245587) | Deny «Refusing to read/write X: where it leads on disk could not be determined (…)». | Portado: `denyUnresolvedTarget`. |
| `Ml(op,path,r,ctx)` | [244932,245317) | El `ask` final fuera del trabajo: sin aterrizaje, `workingDir` a secas; con `carriedOut`, la frase, `blockedPath: landing` y —en escritura— `safetyCheck` con `classifierApprovable:false`. | Portado: `outsideWorkingDirectoriesAsk`; la diferencia lectura/escritura va en un descriptor `FileOperation` (`READ_OPERATION`/`WRITE_OPERATION`) en vez de un argumento selector. |
| `WGn(path,r,ctx)` | [244599,244812) | Para la guarda de seguridad de escritura: `{landing, sentence, personOnly}` con `personOnly = safe(requested sólo) || carriedOut`. | Portado: `writeSafetyLanding`. |
| `Zlt(path,r)` | [243919,244289) | Deny «Refusing to write X: it is a symbolic link. Write to the link's target path instead: Y». Con `blockedPath: landing` si se resolvió. | Portado y exportado: `denySymlinkLeafWrite`. Sus llamadores (`chunk-csayct82.js:529,3440,3449`: `checkPermissions` de Write/Edit/NotebookEdit, `h.behavior==="deny"?h:Zlt(s,g)??h`) están en `tool-registry`, fuera de la lista; se declara. |
| `kl(path,r,ctx,internal,reason,dirs)` | [222233,222696) | ≙ `Bs`/`xr`: niega si `unresolved` (con `dln`); si dentro o interno permite, null; si no, deny con la frase de aterrizaje cuando `carriedOut` y `blockedPath` = landing o la ruta. | Portado: `denyOutsideWorkingDirectories` recibe ahora el objeto resuelto. |
| `ete(e)` | [164594,164630) | Ruta para mostrar: caracteres de control/formato → U+FFFD (`Bm`), recorte a 160 (`Mo`) con «… [+N chars]». | Portado: `displayPath`. Divergencia: la pasada `wt`/`sf` (normalización repetida hasta punto fijo) no se porta; sólo la sustitución y el recorte. |
| `IE(tool,input,ctx,pre?)` | [239513,241441) | ≙ `Jv`: guarda de lectura. `h = pre ?? Ua(path)`; fuera del modo restringido, `unresolved` → `xl`; cierra con `Ml`. | Portado sobre `checkReadPermissionForTool`; el cuarto parámetro pasa a ser `ResolvedPermissionPath`. Ningún llamador del árbol lo pasa hoy (medido: 7 llamadas en `tool-registry`, todas con 3 argumentos). |
| `Lb(tool,input,ctx,pre?)` | [241441,243919) | ≙ `ib`: guarda de escritura. Tras las negaciones de almacenes, `unresolved` → `xl`; la consulta de seguridad lleva `WGn`; cierra con `Ml`. | Portado sobre `checkWritePermissionForTool`. |
| `BGn` | [233380,236966) | ≙ `ULn`: sigue tomando `string[]` (`s ?? To(g)`). | Sin cambio en `checkNetworkPathRead`. |
| `r5e` | [245824,246246) | ≙ `gyt`: usa `To` (grafías). | Sin cambio en `generateSuggestions`. |
| `YBr` | `chunk-379zyrv7.js` | «Path is outside allowed working directories». | Ya estaba inline; pasa a constante. |
| `zy`/`eAe`/`kw` | [221162,221941) | ≙ `isPathInWorkingDirectories`/`workingDirSpellings`/`workingDirectoriesOf`, sobre `To`. | Sin cambio. |

### Deriva 2.1.281 → 2.1.283 (lo que la tarea nombra por su nombre de 2.1.281)

| 2.1.281 | 2.1.283 | Diferencia |
|---|---|---|
| `vt(e,n)` | `Rt(e,n)` | 2.1.283 añade `stoppedAt` al resultado `unresolved` y el modo `screen` (`H6`) con la re-resolución de textos de enlace con `..` (`H`, tope 8). Se porta 2.1.283. |
| `sot` | `ect` | Misma forma. |
| `WVe` | `n5e` | Misma forma. |
| `sen`/`Nr` | `cln`/`Tl` | Misma forma. |
| `ien` | `dln` | Misma forma. |
| `Ir` | `Ml` | Misma forma. |
| `Or` | `xl` | Misma forma. |
| `jLn` | `WGn` | Misma forma. |
| `xr` | `kl` | Misma forma. |
| `KY` | `Zlt` | Misma forma. |

*Métrica:* comparación del cuerpo de cada símbolo de 2.1.283 con el volcado
de 2.1.281 del banco `analizar-qwen-code-para-thyrox-20260924T201614/`.
*Ciega a:* un cambio de conducta dentro de un helper que ninguno de los dos
volcados incluye por completo.

## Decisiones de diseño

- **El resolvedor vive en `storage`** (donde estaba `getPathsForPermissionCheck`),
  y `permission` lo consume. Los predicados de forma de ruta que el walker
  necesita se copian mínimos en `storage` porque la dependencia va de
  `permission` a `storage` y no puede invertirse sin tocar archivos ajenos.
- **Sin argumento selector**: `Rt(e, mode)` se parte en dos entradas; lo que
  el modo decidía está en cada una, y lo común en `runPathWalk`.
- **`getPathsForPermissionCheck` conserva nombre y tipo** como el adaptador
  `To`; así los consumidores que sólo necesitan grafías no cambian, y el
  binding de `agentHostBindings.ts` (fuera de la lista) sigue válido.
- **`FsOperations` gana `openDirNoFollowSync`** (`O_DIRECTORY|O_NOFOLLOW`),
  como `ph` en 2.1.283. El único implementador del tipo en el árbol es
  `NodeFsOperations` (medido: `rg ': FsOperations'` fuera de
  `local-observability`, que tiene su propio tipo).

## Verificación (2026-09-30, después del porte)

| Suite | Antes | Después |
|---|---|---|
| `storage/src/__tests__/fsOperations.test.ts` | 23 / 0 | 39 / 0 |
| `permission/src/__tests__/fileToolPermissions.test.ts` | 18 / 0 | 29 / 0 |
| `permission/src/__tests__/pathLanding.test.ts` (nueva) | — | 9 / 0 |
| `permission/src/__tests__/networkPathRead.test.ts` | 8 / 0 | 8 / 0 |
| subconjunto derivado en `permission` (21 archivos que nombran los módulos tocados) | — | 294 / 0 |
| subconjunto derivado en `storage` (2 archivos) | — | 43 / 0 |
| `check_package_typecheck --strict --no-rebuild storage` | — | 0 propios |
| `check_package_typecheck --strict --no-rebuild permission` | — | 0 propios |

*Métrica:* `pass`/`fail` de `bun test` por paquete y el conteo «propio(s)» del
typecheck. *Ciega a:* los consumidores de `tool-registry`, que importan las
guardas con tres argumentos y no se recompilaron aquí; y a que el worktree no
tiene `node_modules`: `@thyrox/storage` se enlazó a mano en
`node_modules/@thyrox/storage` (ruta ignorada por git) para que `permission`
compilara contra el `storage` de este parche y no contra el del árbol principal.

`check_lint_zero` sólo mide `.py` y `.sh`; este parche no toca ninguno.

## Controles de anulación

Cada uno: copia con `cp`, retirar la rama con `bin/replace_literal`, correr la
suite, restaurar con `cat` desde la copia y `cmp` (idénticos al final).

| Rama retirada | Cae | Esperado |
|---|---|---|
| A · `else if (resolved.unresolved)` en la guarda de lectura (≙ `xl` en `IE`) | 1: «leer un enlace irresoluble se niega…» | 1 |
| B · `carriedOut: spellingInside && landingOutside` → `false` (≙ `n5e`) | 4: lectura con aterrizaje fuera (blockedPath), lecturas bloqueadas por enlace, escritura sólo para persona, `symlinkLanding` carriedOut | 4 |
| F · la rama `unresolved` de `denyOutsideWorkingDirectories` (≙ `kl`) | 1: «en modo restringido, un enlace irresoluble se niega…» | 1 |
| E · `state.leafIsSymlink = true` en `recordLeafHop` | 3 en `storage` (hoja, colgante, ciclo) + 2 en `permission` (`denySymlinkLeafWrite` resuelto e irresoluble) | 5 |
| C · `absentRemainderClimbs` en `resolvePathForPermission` | 1: «resto ausente con `..` es irresoluble» | 1 |
| D · `index >= MAX_CLIMBING_LINK_TEXTS` en `resolveClimbingTargets` (≙ `H`) | 1: «el noveno texto que sube deja la criba sin vetar» | 1 |

Ni una aserción más cayó en ninguno de los seis.

## Lo que NO cierra este parche, declarado

- `denySymlinkLeafWrite` (≙ `Zlt`) se exporta y se prueba, pero sus tres
  llamadores de 2.1.283 (`checkPermissions` de Write, Edit y NotebookEdit,
  `chunk-csayct82.js:529,3440,3449`: `h.behavior==="deny"?h:Zlt(s,g)??h`)
  viven en `tool-registry`, fuera de la lista de archivos.
- `resolvePathForScreen` (≙ `H6`) se exporta y se prueba; su consumidor (la
  criba de rutas del Bash tool) está fuera de la lista.
- El walker no porta `anchors`, `surfaceNetworkRaw` ni `literalLinkText`:
  sólo los pasan `pf`/`Rde`/`Bo`, que no son entradas de este alcance.
- La palabra «Claude» aparece una vez en el diff de `src`, dentro del
  identificador preexistente `allowsClaudeConfigForMode` que la guarda ya
  llamaba; no es texto nuevo.
