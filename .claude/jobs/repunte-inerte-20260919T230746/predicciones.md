# Predicciones ANTES de tocar el mecanismo

Escritas antes de implementar: una prediccion redactada despues del
resultado no puede fallar, y un control que no puede fallar no discrimina.

## Lo medido que las origina

El typecheck del consumidor quedo en **974** tras el repunte corregido, y
se atribuye asi:

| cubo | errores |
|---|---|
| PROPIO (cli) | 416 |
| AJENO: agent | 323 |
| AJENO: config | 167 |
| AJENO: permission | 68 |

`agent` es esperado — rehusa emitir y sigue resolviendo a fuente. `config` y
`permission` **si** estan repuntados, asi que sus 235 son el defecto.

### D1 — permission: emit y repunte derivan el rootDir por separado

`emit_package` ensancha a `.` cuando todos los escapes caen dentro del
paquete, y tsc escribe en `dist/src/**`. `repoint_manifest` recomputa
`_project_shape` por su cuenta, obtiene `src`, y escribe `./dist/*.d.ts`.

Medido: `dist/src/components/FallbackPermissionRequest.d.ts` EXISTE y
`dist/components/FallbackPermissionRequest.d.ts` no. El `types` apunta a un
archivo que no existe, tsc cae al `default`, y el repunte es inerte.

### D2 — config: el comodin de raiz se descarta, y 5 declaraciones no se emiten

`config` declara `"./*": "./*.ts"`. Su directorio es `.`, y la rama de
colapso de `_project_shape` filtra `d != "."`, asi que el comodin no aporta
nada: el include queda en 7 directorios nombrados y `plugin/**` no esta
entre ellos (solo `plugin/core/**`).

Medido: de los 22 archivos de `plugin/` que el consumidor compila, **5 no
tienen `.d.ts`** —`headlessPluginInstall`, `installCounts`,
`parseMarketplaceInput`, `pluginFlagging`, `zipCacheAdapters`— y cuatro de
los cinco tienen importadores por specifier.

La cascada: un subpath sin declaracion cae al `default`, que es fuente; un
import RELATIVO desde ese `.ts` resuelve `.ts` antes que `.d.ts`, y arrastra
a sus vecinos. De ahi que los 17 que SI tienen declaracion tambien den error.

## Lo que se predice

1. **Corregido D1, `permission` cae a ~0** en el cubo del consumidor. Si
   sigue aportando, el rootDir no era la unica causa.
2. **Corregido D2, los 5 AUSENTE pasan a existir** y `config` cae a ~0.
3. **El total aterriza en ~739** (416 propio de cli + 323 de agent). Si cae
   en otra cifra, se movio algo mas y hay que medirlo antes de concluir.
4. **El gate de verificacion de destino atrapa los dos HOY**: corrido contra
   el arbol actual, antes de arreglar nada, publica INERTE para `permission`
   y para `config`. Si publica verde, no mide lo que dice medir.

## Lo que este pase NO cierra, y es mas grande que los 974

**`dist/` esta en `.gitignore:44` y tiene 0 archivos versionados.** Asi que
los 974 son una propiedad de ESTE contenedor, no del arbol: un clon nuevo no
tiene ninguna declaracion, todo `types` apunta al vacio, cada repunte es
inerte y el gate publicaria 2821 como si fuera el codigo.

Eso no lo arregla este pase. Lo que exige es que el gate **rehuse** cuando
`dist/` falta, en vez de publicar el conteo resuelto-a-fuente como medicion.
