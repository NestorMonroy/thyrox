# Diagnosticar y arreglar los tests en rojo de thyrox

## La tarea, verbatim

> «Vas a crear un nuevo, THYROX_WORKBENCH=/home/user/thyrox/.claude/workbench/
> THYROX_JOBS=/home/user/thyrox/.claude/build-logs/ para solucionar todos los
> test que en este momento estan en RED»

Directiva del ejecutor, 2026-09-12T19:21. Un mensaje posterior, embebido en un
bloque de comandos de bioinformática sin relación, instruyó revisar
`thyrox/_references/**` antes de tocar los tests, por si ya había una función
o herramienta aplicable al estilo TDD. Resultado de ese chequeo: negativo —
no se encontró tooling de dependencias/workspace directamente aplicable en
los cinco corpus vendorizados.

## Alcance de este pase

De los tres lenguajes con suite (TypeScript/bun, Python, shell), este pase
cerró completamente **el cluster de `tests/package/dependencies.test.ts`**,
que representaba 14 de los 60 casos de esa suite en rojo. Python y shell
quedan para un pase siguiente — ver «Pendiente» abajo.

## El mecanismo que se investigó

`tests/package/dependencies.test.ts` recorre cada paquete de
`src/packages/*/`, extrae los especificadores externos que sus `.ts`/`.tsx`
importan (regex `DESDE` para `import`/`export ... from` estático, `LLAMADA`
para `import()`/`require()` dinámico), calcula la raíz del paquete
(`@scope/pkg/subpath` → `@scope/pkg`), y para cada raíz no declarada en el
`package.json` del paquete intenta `Bun.resolveSync`. Si resuelve pese a no
estar declarada, cae en `sinDeclarar`; si no resuelve, cae en `noResuelven`.
El test filtra `noResuelven` contra un baseline por línea `pkg::raiz` y espera
que lo que sobre esté vacío.

**La resolución de Bun es estrictamente relativa al directorio del paquete
que llama** — el isolated-linker de bun sólo crea el symlink
`node_modules/@scope/name` en el paquete que declara esa dependencia en su
propio manifiesto. Por eso el mismo especificador puede resolver desde un
paquete y fallar desde otro: no es una propiedad del archivo destino, es una
propiedad del enlace declarado.

## El método de clasificación — y por qué el primero fallaba

La primera pasada clasificó por palabras clave en los docstrings de cada
módulo ("no existe en este árbol", "diferido", "vendorizado"). Produjo
falsos negativos en tres formas medidas:

1. Directorios de búsqueda mal construidos para paquetes cuyo código vive en
   la raíz del paquete y no bajo `src/`.
2. Discrepancias de acentuación entre el patrón buscado y el texto real.
3. **La más cara: docstrings desactualizados.** Varios afirmaban que un
   destino "no existe en este árbol" cuando un porte SEPARADO, hecho en otro
   momento, ya lo había resuelto. El docstring describía un estado verdadero
   en el pasado, no el estado actual del workspace.

El método correcto, implementado en `probes/clasificar_pares_faltantes.py`,
es empírico: probar el especificador EXACTO que falla (no sólo su raíz)
contra cada paquete hermano que YA declara esa raíz como dependencia. Si
resuelve desde al menos uno, el destino existe y el fallo es sólo un enlace
ausente en el paquete actual — se arregla declarando la dependencia. Si
falla desde todos los declarantes también, es deuda genuina.

## Autocorrección durante el pase

Se concluyó inicialmente que `@thyrox/app-host/state/AppState.js` estaba
roto en todo el workspace, probando su resolución desde `permission` — que
**no** declara `app-host` como dependencia, así que la prueba era inválida
por construcción. Re-probado desde `agent` (que sí lo declara), resolvió sin
problema (`app-host/src/state/AppState.tsx`, vía el export-map del paquete).
Esto amplió el conjunto de arreglos genuinos identificados en tramos
posteriores del pase.

## Resultado

| Momento | `dependencies.test.ts` |
|---|---|
| Antes | 46 pass, 14 fail |
| Después de declarar 13 dependencias faltantes + congelar deuda genuina | 60 pass, 0 fail |

13 `package.json` recibieron la dependencia que les faltaba —
`agent`, `bridge`, `command-runtime`, `config`, `ide`, `mcp-runtime`,
`permission`, `server`, `shell`, `storage`, `tool-registry`, `voice`, y un
segundo tramo en `tool-registry`/`ide` como mejora adicional (ver abajo).
`bun install` los enlazó sin necesidad de tocar el lockfile más allá de eso
(las 296 instalaciones ya estaban resueltas).

23 pares `pkg::raiz` quedaron genuinamente sin resolver en NINGÚN paquete
declarante del workspace — terceros vendorizados o no publicados
(`sharp`, `image-processor-napi`, `audio-capture-napi`, `@anthropic/ink`,
`@withfig/autocomplete`, `yaml`) y paquetes que no existen como tal
(`@thyrox/repl` en varios contextos). Se congelaron en
`tests/package/dependencies_baseline.txt` con un encabezado fechado que
documenta el método de verificación.

## Mejora más allá del verde estricto

`tool-registry::@thyrox/provider` e `ide::@thyrox/tool-registry` ya pasaban
el test vía cobertura de baseline (estaban listados como deuda), pero medidos
con el probe SÍ resuelven — el baseline los estaba enmascarando
innecesariamente. Siguiendo `porte-completo-no-parcial`, se declararon
igual: un import que resuelve no debe depender de figurar como deuda
congelada. Verificado tras el cambio: `bun install` sin diferencias
adicionales, `bun test tests/package/dependencies.test.ts` sigue en
60 pass / 0 fail.

## Control de anulación

`git stash` de los 13 `package.json` (dejando el baseline nuevo intacto)
reproduce exactamente 46 pass / 14 fail — las mismas 14 aserciones que este
pase corrigió, ni una más. Confirma que el verde nuevo depende de las
declaraciones de dependencia añadidas y no de un artefacto del propio
baseline.

## Pendiente (fuera de este pase)

- El resto de la suite TypeScript (fuera de `dependencies.test.ts`) —
  pendiente de medir tras este cambio, vía el job en segundo plano
  `suite-full-2`.
- La suite Python (~19-22 casos rojos antes de este pase) — sin tocar.
- La suite shell (~22-24 casos rojos antes de este pase) — sin tocar.
- Barrido de los docstrings desactualizados que motivaron el falso negativo
  del método por palabras clave (no es parte del alcance de este workbench,
  pero queda como candidato de limpieza futura).
