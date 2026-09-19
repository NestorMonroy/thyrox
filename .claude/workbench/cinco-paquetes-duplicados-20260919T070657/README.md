# Los cinco paquetes de `@ant/` existian dos veces

## La pregunta que lo destapo

*«¿por que el `thyrox/bun.lock` aun tiene `"@thyrox/app-host": "workspace:*",
"@thyrox/config": …, "react": "^19.0.0"`?»*

**Ese bloque no esta mal.** Pertenece a `@thyrox/tool-registry` y a
`@thyrox/voice`, y `@thyrox/*` es nuestro propio alcance: son dependencias de
workspace legitimas. Lo que la pregunta destapo es otra cosa.

## Lo que si estaba mal: el arbol, no el manifiesto

Los cinco paquetes de `@ant/` llegaron **dos veces el mismo dia**:

| commit | ruta | nombre |
|---|---|---|
| `bfdf943e` *Port the thirteen remaining ccnmt packages under @thyrox* | `src/packages/<n>` | `@thyrox/<n>` |
| `6021edfa` *Bring the five @ant packages into the tree, scope intact* | `src/packages/@ant/<n>` | `@ant/<n>` · `@anthropic/ink` |

Los dos globos de la raiz —`src/packages/*` y `src/packages/@ant/*`— recorren
ambos, asi que `bun.lock` indexaba **10 de sus 48 workspaces** como los cinco
paquetes por duplicado. El lockfile era **fiel**: reflejaba un arbol con cinco
duplicados.

## La direccion la decide la FUENTE, no el board

La propuesta inicial era mover `src/packages/@ant/ink` → `src/packages/ink`.
Medido contra ccnmt, es **la direccion contraria**:

| eje | `src/packages/ink` (plano) | `src/packages/@ant/ink` |
|---|---|---|
| nombre | `@thyrox/ink` | `@anthropic/ink` — el de ccnmt, con 772 importadores |
| ruta en la fuente | no existe | `packages/@ant/ink` |
| indentacion del manifiesto | 2 espacios (reformateado) | 4 espacios — la de la fuente |
| dependencias | faltan 4 que su codigo **si importa** | completas (`3d0952d5`) |

La fuente pone los cinco en `packages/@ant/<n>` y **ninguno** en la ruta plana.

## Lo que la copia plana aportaba: nada

Normalizando el alcance con el mapa leido de los propios manifiestos,
**234 de 239** archivos son identicos byte a byte. Los 5 que difieren son los
`package.json`, y en los 5 el de `@ant/` es el fiel.

## Lo hecho

- **613 sustituciones en 359 archivos** de `src/packages/repl`, el consumidor
  real, mas su manifiesto: `@thyrox/ink` → `@anthropic/ink` y los cuatro
  `@thyrox/computer-use-*` / `claude-for-chrome-mcp` → `@ant/*`. Solo se
  reescribe el nombre cuando no le sigue otro caracter de nombre.
- Retiradas las cinco copias planas (239 archivos) y sacadas de la lista de
  `src/packages/package.json` (42 → 37).
- `bun install` una vez: **48 → 43 workspaces**, cada uno de los cinco indexado
  **una vez**, y **0** entradas desincronizadas entre lockfile y disco (eran 3,
  dos de ellas las 10 deps declaradas para `@ant/computer-use-mcp` despues de
  que el lockfile se escribiera).

## Los bancos y los jobs NO se reescribieron

12 archivos de `.claude/workbench/` y `.claude/jobs/` nombran los nombres
planos. Son **evidencia fechada** de lo que se midio cuando se midio;
reescribirlos falsificaria el registro. Mismo criterio con que
`referencia-odoo-gobierna-las-decisiones.md` conserva sus citas historicas.

## Los dos controles, y su anulacion

`tests/package/package_identity.test.ts` gana dos casos que miden **ejes
distintos**, y por eso hacen falta los dos:

- **caso 3** — ningun basename de workspace se repite. Rojo antes con las 5
  colisiones exactas; verde despues.
- **caso 4** — todo specifier `@thyrox/X | @ant/X | @anthropic/X` resuelve a un
  paquete declarado. Verde antes; se habria puesto rojo al retirar si el
  reapuntado no se hubiera hecho.

Anulados por separado, **cada uno tira solo lo suyo**:

| anulacion | cae | sigue verde |
|---|---|---|
| restaurar `src/packages/ink` desde HEAD | caso 3, nombrando `ink: @ant/ink \| ink` | caso 4 |
| devolver UN import a `@thyrox/ink` | caso 4, nombrando `@thyrox/ink (1)` | caso 3 |

*Metrica:* workspaces del lockfile y sus bloques de dependencia contra el disco;
archivos identicos por par tras normalizar el alcance; basename repetido;
specifier sin paquete que lo declare.
*Ciega a:* dos copias con basename distinto; un specifier de **otro** alcance
que tampoco resuelva —el ajeno que `@ant/ink` importa queda fuera por
construccion, TASK-THYROX-0198—; un subpath inexistente dentro de un paquete
que si existe; y, sobre el eje de RESOLUCION, ver la correccion de abajo.

## Correccion: la afirmacion de «0 enlaces» era falsa

Este README y el mensaje de `1b9bb97c` afirmaron que `node_modules` sigue con
**0** enlaces de workspace, y que por tanto el veredicto del typecheck no
cambia. **Las dos mitades estaban mal, y la segunda se sigue de la primera.**

Lo que se midio fue `ls node_modules/@thyrox | wc -l` — el `node_modules` de la
**raiz**. Bun no enlaza los workspaces ahi: los enlaza en el `node_modules` de
**cada paquete**. Medido correctamente:

| alcance | raiz | por paquete |
|---|---|---|
| `@thyrox` | 0 | **296** |
| `@ant` | 0 | **9** |
| `@anthropic` | 0 | **13** |

Y por conducta, no por conteo:

```
src/packages/repl/node_modules/@anthropic/ink -> ../../../@ant/ink
```

`@anthropic/ink` **si resuelve** desde su consumidor. Es el sub-patron C de
`metrica-decide-la-conclusion.md` con este banco como sujeto: se midio el
significante —un directorio que no es donde vive el fenomeno— y se concluyo
sobre el significado. Y el veredicto real, medido en
`.claude/jobs/tscli3-20260919T072043/`: **3942 → 3768** errores (−174), con
**TS2307 322 → 268** y los que nombran a los cinco paquetes **62 → 24**. El
paquete sigue sin compilar, pero la retirada **no fue neutra**: es exactamente
lo contrario de lo que la afirmacion corregida decia.

Lo destapo un residuo, no una relectura: `src/packages/computer-use-mcp` y
`computer-use-swift` sobrevivieron al `git rm` como cascaras con solo su
`node_modules` dentro —gitignorado, por eso `git status` salia limpio— y ese
`node_modules` es precisamente el que la medicion de la raiz no veia.

*Metrica:* enlaces bajo `src/packages/*/node_modules/<alcance>/` y el destino
real del symlink, contra `ls` de la raiz.
*Ciega a:* si el enlace apunta a un paquete cuyo `exports` declare el subpath
que el importador pide — eso es TS2305, otro eje.
