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

## Segundo tramo — el resto de la suite TypeScript

`suite-full-2` (post-fix de `dependencies.test.ts`, pre-esta-sección) midió
71 fail / 5 errores en TypeScript — mucho más que los 14 originales. Se
investigó cada uno en vez de asumir que eran ajenos:

- **`permission::@thyrox/storage`** — el mismo defecto del primer tramo,
  encontrado al re-correr la suite completa: faltaba declarar la
  dependencia, y estaba enmascarado en el baseline VIEJO (de 2026-09-07,
  previo a este pase). Al arreglarlo, la suite de `permission` sola pasó de
  210 pass/39 fail/5 errors a 381 pass/0 fail — ese solo enlace faltante
  producía 39 fallos y 5 errores en cascada.
- Dos pistas falsas descartadas por re-medición aislada, no por descarte a
  ojo: fallos de PDF atribuidos por defecto a `storage` resultaron ser de
  `tool-registry` (0 fail en ambos paquetes corridos solos — contaminación
  cruzada de correr la suite entera junta) y una alarma de "Invalid hook
  call" de React en `tool-registry/hooks/appState.test.ts` resultó ser ruido
  de consola de un caso de prueba intencional (4 pass, 0 fail en aislado).

`suite-full-3` (post-fix) confirmó la mejora: 8300 pass / 9 fail (bajado de
71 fail/5 errores).

## Tercer tramo — de 9 a 4, con causa raíz de cada uno

Se diagnosticaron los 9 restantes uno por uno en vez de agruparlos:

1. **`command-runtime::getGoalConditionMaxLength` ya no lanza — FIX del
   test.** El primer tramo declaró `@thyrox/agent` como dependencia de
   `command-runtime`; ese require diferido en
   `internal/pendingCrossPackageDeps.ts` está DISEÑADO para empezar a
   resolver quien tal declaración exista (lo dice su propio docstring). El
   test seguía afirmando lo contrario. Corregido para afirmar el valor real
   (`4000`, verificado contra `agent/goalStopHook.ts:115`).
2. **Committer del merge sintético — bug real en `branchIntegration.ts`,
   no del test.** `GIT_COMMITTER_NAME`/`GIT_COMMITTER_EMAIL` heredadas del
   proceso (el harness las fija para preservar la identidad humana de la
   sesión) ganan sobre `git config user.name/email` del repo — precedencia
   de git, no del código. El `git()` interno del módulo heredaba el
   entorno completo sin despojarlas, así que CUALQUIER uso real de
   `integrate()` habría fusionado con el committer de la sesión en vez del
   configurado en el repo destino. Corregido: `gitEnv()` filtra las cuatro
   variables antes de invocar git.
3. **T-035 (gate real bajo el harness) — premisa de test incompleta, no
   bug.** El gate elegido como ejemplo (`check_hallazgo_submodulo.py`)
   declara su baseline como PARÁMETRO DEL CONSUMIDOR (DEC-04); thyrox es
   el proveedor y no tiene `source/gestion/pm/` propio, así que rehusaba
   por diseño. El test necesitaba declarar un baseline vacío para su
   propio universo (0 hallazgos bajo thyrox) — lo hace ahora con
   `HALLAZGO_SUBMODULO_BASELINE` apuntando a un archivo temporal.
4. **El mismo fix #3 destapó un bug real en el tool `Bash`.** Fijar
   `process.env.X` en el mismo proceso y esperar que `Bun.spawn` (sin
   `env` explícito) lo vea NO funciona — Bun usa la foto del entorno al
   arrancar, no `process.env` en vivo (medido con un script aislado:
   `FOO=` vacío sin `env:`, `FOO=hello123` con `env: process.env`).
   Cualquier mutación de entorno hecha durante una sesión (una bandera,
   un flag) nunca habría llegado a un comando `Bash` real. Corregido en
   `@thyrox/tools: registry.ts::shell()`.
5. **`exports.test.ts` bloques 2 y 3 — 44 módulos `index.ts` nuevos sin su
   entrada en el mapa `exports` de la raíz, y un puntero colgante.** Los 44
   son consecuencia mecánica de crecimiento del árbol (paquetes/submódulos
   nuevos cuyo `index.ts` nunca se declaró) — se recalcularon en vivo con
   la MISMA lógica del test (no de memoria) y se añadieron. El puntero
   colgante (`./packages/harness/src`) se retiró: apunta a un directorio
   verificado como inexistente, sin prejuzgar la reestructuración mayor en
   curso (ver abajo) — sólo quita una entrada rota.

**Los 4 que quedan NO son bugs de código — dos son deuda ya rastreada, dos
son límites del entorno de este contenedor:**

- **`tests/task/extraction.test.ts` (2 fallos) — parte de una
  reestructuración en curso, ya registrada.** `HARNESS = src/packages/harness`
  no existe. El histórico del board (`.claude/workbench/session-task-dump-
  20260910T070654/outputs/board/172.json` y `205.json`) muestra que la
  partición del paquete `harness` es una decisión YA TOMADA por el ejecutor
  (opción B, cerrada 2026-09-08) cuyo porte sigue `in_progress`, bloqueado
  por otras tareas (198/199/200). Inventar el paquete ahora, sin ese
  contexto completo, arriesga contradecir la forma ya decidida. Se deja
  como estaba — no es deuda silenciosa, ya tiene dueño y tarea.
- **`tests/reference/triple.test.ts` (dentro de los 3 "ausentes") —
  dependiente del entorno, no del código.** `ccb`/`ccnmt` resuelven por
  defecto a `treeRoot()/claude-code-nestor-monroy-tools` y `ui-core` a
  `treeRoot()/-progress` — los DOS son clones hermanos de thyrox que **no
  están en el alcance de repos de esta sesión** (verificado: `ls -d
  /home/user/*/` no los lista). El propio código lo documenta como
  decisión pendiente del ejecutor (vendorizar el corpus completo choca con
  su licencia `UNLICENSED`, sucesor #207).
- **`src/packages/binary/__tests__/bunfs.test.ts` — build sin medir, por
  diseño del propio test.** El binario vivo en este contenedor es
  `2.1.270`; el test rehúsa explícitamente ante una build no presente en
  su tabla `MEASURED` en vez de saltarse en silencio (comentario propio:
  *"Una build desconocida FALLA, no se salta"*). Requiere extraer las
  cifras de fidelidad de esa build específica y añadir su fila — trabajo
  de medición dedicado, no un fix de una línea.

## Resultado final del pase (TypeScript)

| Momento | pass | fail | error |
|---|--:|--:|--:|
| Estado de partida (post primer tramo, `suite-full-2`) | — | 71 | 5 |
| Tras `permission::@thyrox/storage` (`suite-full-3`) | 8300 | 9 | 0 |
| Tras los 5 fixes del tercer tramo (verificado 2× consecutivas) | 8305 | 4 | 0 |

Los 4 restantes están clasificados con su causa exacta arriba — dos
tienen dueño y tarea ya registrados, dos son límites verificados del
contenedor. Ninguno se "arregló" ocultando la causa.

## Pendiente (fuera de este pase)

- La suite Python (~19-22 casos rojos antes de este pase) — sin tocar.
- La suite shell (~22-24 casos rojos antes de este pase) — sin tocar.
- Barrido de los docstrings desactualizados que motivaron el falso negativo
  del método por palabras clave (no es parte del alcance de este workbench,
  pero queda como candidato de limpieza futura).
