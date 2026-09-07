# Evidencia — mcp-runtime resuelve, y los dos rojos que quedaban

El `.log` de estas corridas esta gitignored (`.gitignore:29 *.log`), asi que
vive lo que viva el contenedor. Lo que sostiene una afirmacion se transcribe
VERBATIM aqui, que es lo que `build-logs.md` exige.

## 1 — La medicion que abrio el hilo

`dependencies.test.ts` reportaba «+ Received + 7» para `@thyrox/mcp-runtime` y
el diff imprimia CINCO entradas. No eran siete raices: el `+7` cuenta tambien
los dos renglones de corchete. Enumerados con el mismo recorrido del control
(`Bun.resolveSync` desde el directorio del paquete), son **18 especificadores
en 5 raices**:

```
@thyrox/app-host/bootstrap/state.js      src/headersHelper.ts, src/roots.ts
@thyrox/app-host/state/AppState.js       src/appStateHooks.ts, src/macOsKeychainHelpers.ts
@thyrox/config/mcpConfigSchema.js        src/types.ts
@thyrox/config/platform                  src/xaaIdpLogin.ts
@thyrox/config/settings                  src/xaaIdpLogin.ts
@thyrox/config/utils/envExpansion.js     src/envExpansion.ts
@thyrox/provider/authAlias.js            src/claudeai.ts, src/client/auth.ts
@thyrox/provider/claude.js               src/dateTimeParser.ts
@thyrox/provider/oauthConstants          src/claudeai.ts, src/macOsKeychainHelpers.ts
@thyrox/provider/systemPromptType.js     src/dateTimeParser.ts
@thyrox/shell/execFileNoThrow.js         src/headersHelper.ts
@thyrox/storage/browser.js               src/xaaIdpLogin.ts
@thyrox/storage/imageResizer.js          src/mcpValidation.ts
@thyrox/storage/secureStorage.js         src/xaaIdpLogin.ts
```

## 2 — El hallazgo: NO son una clase, y yo habia afirmado la contraria

Medido archivo a archivo, **cuatro de los catorce modulos EXISTEN**:

```
EXISTE  app-host/src/bootstrap/state.ts
EXISTE  storage/src/browser.ts
EXISTE  storage/src/imageResizer.ts
EXISTE  storage/src/secureStorage.ts
AUSENTE app-host :: state/AppState
AUSENTE config   :: mcpConfigSchema, platform, settings, utils/envExpansion
AUSENTE provider :: authAlias, claude, oauthConstants, systemPromptType
AUSENTE shell    :: execFileNoThrow
```

El docstring que yo mismo habia escrito en `mcpValidation.ts` decia que
`imageResizer.ts` «no existe en @thyrox/storage, medido, no supuesto». **Era
falso**: existe y exporta `compressImageBlock` (verificado con `ls` y `grep`).
Corregido en el mismo pase — la afirmacion llevaba la palabra «medido» sin
haber medido, que es exactamente lo que `evidencia-antes-de-afirmar.md` veta.

Lo que falta en esos cuatro no es el modulo sino la **ARISTA DE PAQUETE**:

```
storage en deps de mcp-runtime: False
ccnmt mcp-runtime deps: []          <- la FUENTE tampoco declara ninguna
ccnmt raiz workspaces: ['packages/*', 'packages/@ant/*']
thyrox raiz workspaces: None
```

La fuente resuelve por el `workspaces` de su raiz. Este arbol no lo declara, y
resuelve por symlinks ad-hoc dentro de `node_modules` de cada paquete — que
esta gitignored. Es decir: **resuelve aqui y no en un clon fresco**, la forma
que el propio docstring de `dependencies.test.ts` llama «la mas cara de ver».

## 3 — Por que NO se cablearon los symlinks ni el `workspaces`

Se probo `workspaces: ['src/packages/*']` en la raiz y **no cambia nada** sin
un `bun install`:

```
FALLA @thyrox/storage   :: Cannot find module from src/packages/mcp-runtime
FALLA @thyrox/app-host  :: Cannot find module from src/packages/mcp-runtime
FALLA @thyrox/shell     :: Cannot find module from src/packages/mcp-runtime
OK    @thyrox/config    -> src/packages/config/index.ts
OK    @thyrox/provider  -> src/packages/provider/src/index.ts
```

Y ese install podria borrar los symlinks ad-hoc de los que dependen las 5
aristas que HOY si resuelven — symlinks gitignored, no restaurables desde git.
Revertido. La declaracion + install es la tarea **#239**, y aterriza junto con
su medicion, no a ciegas antes de un commit.

Las 5 raices quedan en `dependencies_baseline.txt`, fechadas y CLASIFICADAS en
sus dos clases, porque cada una se paga distinto.

## 4 — El segundo rojo: el mapa de `exports` de la raiz

`exports.test.ts` reportaba 5 modulos que no resuelven a si mismos:

```
src/packages/headless-sdk/src/index.ts
src/packages/headless-sdk/testing/index.ts
src/packages/memory/src/index.ts
src/packages/memory/testing/index.ts
src/packages/swarm/src/index.ts
```

Causa: `<dir>/index.ts` deriva el subpath `<dir>`, y el comodin `./*` lo lleva
a `<dir>.ts`, que no existe. El mapa ya trae 24 entradas explicitas de esa
forma exacta (`./packages/output/src` -> `./src/packages/output/src/index.ts`);
faltaban las de los paquetes portados despues de derivarlo. Anadidas las 5 con
la misma forma, y el destino verificado con `is_file()` antes de escribirlo.

### Control de anulacion — el arreglo es lo que hace pasar el control

Retirada UNA entrada (`./packages/memory/src`), cae EXACTAMENTE ese modulo y
ninguna otra asercion:

```
+ [
+   "src/packages/memory/src/index.ts",
+ ]
 6 pass
 1 fail
```

Restaurada: `7 pass, 0 fail, 101 expect() calls`.

## 5 — Suite completa, en serie
```

 5636 pass
 4 skip
 0 fail
 12904 expect() calls
Ran 5640 tests across 347 files. [30.01s]
EXIT=0
```

Punto de partida de la sesion: **14 rojos**. Estado tras el pase: **0**.

*Metrica:* `bun test` sobre los 347 archivos del arbol, en serie.
*Ciega a:* el clon fresco — las 5 aristas que hoy resuelven lo hacen por
symlinks gitignored, asi que este verde NO prueba que la suite pase tras un
`git clone` limpio. Eso lo cierra #239, y hasta entonces es una incognita
declarada, no un supuesto.
