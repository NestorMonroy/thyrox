# Las 19 dependencias externas que `repl` importa y su manifiesto no declara

`TASK-THYROX-0223` · hallazgos **H-THYROX-121** y **H-THYROX-122**

## La pregunta

La suite de `repl` estaba roja con `Cannot find package 'figures'` y
`Cannot find package 'chalk'`. La pregunta no era «¿falta instalar `figures`?»
—esta en el lock— sino **cuantas dependencias mas tiene `repl` en esa misma
situacion**, que es un eje que un rojo suelto no publica.

## El instrumento — y por que tiene DOS filtros

`probes/census_undeclared_deps.py`. Censa los specifiers de import/export/
require de un paquete, los reduce a nombre de paquete, y resta los que su
`package.json` declara.

El segundo filtro no es cosmetico. Sin el, el recorrido por expresion regular
captura la palabra `from` dentro de una cadena o de un fragmento de codigo en
una plantilla, y publica basura como si fuera una dependencia:

| | candidatos |
|---|---|
| sin filtro de forma | **33**, de los que 13 eran texto (`'OC & Bulk Overages copy'`, `'Jump to bottom'`, bloques de JSX) |
| con filtro de forma npm | **20** |

Lo descartado **se publica aparte**, no se tira en silencio.

### Su ceguera, declarada y luego ejercida

El docstring declara: *«un nombre con forma valida que en realidad sea texto»*.
Ocurrio. De los 20, uno es `downloading`, capturado de un comentario:

```
NativeAutoUpdater.tsx:138:  // distinguish "checking" from "downloading" in the footer.
```

Sobrevive al filtro de forma —es una palabra en minusculas sin espacios— y no
es una dependencia. Es el unico que queda tras el arreglo, y queda a proposito:
el censo lo publica como `NO esta en el lock`, que es la señal que lo separa.

## El ROJO

```
373 pass · 9 fail · 5 errors
error: Cannot find package 'figures' from .../uiHelpers/treeify.ts
error: Cannot find package 'chalk'   from .../terminalSetup.ts
```

`outputs/rojo-suite-repl.txt`, `outputs/rojo-censo-repl.txt`.

**Censo del rojo: 26 declaradas contra 45 importadas — 19 sin su linea, el
42 %.** `bun` resuelve un specifier por el paquete del **importador**, asi que
sin esa linea el import no resuelve aunque el paquete este instalado en otro
sitio del workspace.

Es la misma forma que los nueve casos cerrados antes en esta sesion —los seis
bloqueadores de `voice`, `@anthropic/ink`, `@thyrox/repl`, `@types/ws`—: el
paquete esta, la linea no.

## De donde sale la VERSION de cada una — no de la referencia

La referencia iza sus 19 a la raiz (`ccnmt: package.json`) y su `packages/repl`
declara **cero** dependencias. Copiar sus rangos habria sido medir el arbol
equivocado: el lock resolvio **nuestras** versiones.

Y leer *una* entrada del lock por nombre tampoco sirve — es el **sub-patron A**,
una columna con dos cosas dentro:

```
chalk    4.1.2  5.6.2  6.0.0     <- tres, resueltas POR PAQUETE
strip-ansi      6.0.1  7.2.0
```

`outputs/versiones-resueltas-en-el-lock.txt` lista **todas** las resoluciones;
`outputs/versiones-de-hermanos.txt`, lo que cada hermano declara. `repl` toma
`chalk ^5.6.2`, que es la de `@anthropic/ink` —su capa de render— y la que la
referencia declara.

### Los dos cubos

| cubo | n | de donde sale la version |
|---|---|---|
| ya resueltas en el lock | **15** | el hermano dominante de este arbol |
| sin resolver (exigieron descarga) | **4** — `fuse.js`, `marked`, `asciichart`, `chokidar` | la referencia, unica fuente disponible |
| texto, no dependencia | **1** — `downloading` | no se declara |

La descarga fue real: `10 packages installed`, y los cuatro aparecen ahora en
el lock (`fuse.js@7.5.0`, `marked@17.0.6`, `asciichart@1.5.25`,
`chokidar@5.0.0`).

## El VERDE

```
504 pass · 5 fail · 1 error        (venia de 373 / 9 / 5)
censo: 19 sin declarar -> 1        (y ese 1 es el falso positivo declarado)
```

`outputs/verde-suite-repl.txt`, `outputs/verde-censo-repl.txt`.

**Los dos rojos que quedan tienen OTRO sujeto** y no se persiguen aqui:

- `SyntaxError: Export named 'getCurrentProjectConfig' not found in module
  '@thyrox/config/index.ts'` — un export ausente del puerto de `config`.
- `Cannot find module '@thyrox/agent/localAgentTask.js'` — un modulo ausente
  del puerto de `agent`.

## El control de anulacion FALLO primero — y ese fallo es el segundo hallazgo

Revertir el manifiesto y reinstalar dio **504 pass otra vez**. El control no
discriminaba, y la causa no era el sujeto sino el instrumento:

```
$ git checkout HEAD -- src/packages/repl/package.json bun.lock
$ bun install
  Checked 386 installs across 348 packages (no changes)
$ ls src/packages/repl/node_modules | grep -E '^(chalk|figures|react|fuse.js|marked)$'
  chalk figures fuse.js marked react        <- siguen ahi
```

**`bun install` no poda un enlace cuyo manifiesto ya no lo declara.** El
resolutor lee el enlace del disco, no el manifiesto, asi que el import seguia
resolviendo. Un verde ahi no distingue «la declaracion no era la causa» de «el
enlace sigue ahi»: el sub-patron **D**, con el propio instrumento de anulacion
como sujeto.

La anulacion **valida** revierte el manifiesto **y borra el `node_modules` del
paquete**. Asi si discrimina:

| | resultado |
|---|---|
| con la declaracion (21 enlaces) | **504 pass · 5 fail · 1 error** |
| sin ella (2 enlaces) | **373 pass · 9 fail · 5 errors**, con los `Cannot find package` de vuelta |

`outputs/anulacion-declaracion-repl.txt` lleva los dos intentos, el fallido
primero. Registrado como **H-THYROX-122**, porque invalidaria en silencio
cualquier anulacion futura sobre un cambio de declaracion.

Restaurado el estado: `391 installs (no changes)`, 21 enlaces, 504 pass.

## Lo que este banco NO decide

- **El izado a la raiz del workspace — board #448.** La referencia declara las
  19 en su raiz y cero en su `packages/repl`; este arbol declara por paquete,
  con `mcp-runtime`, `updater`, `provider`, `local-observability`, `app-host`,
  `permission`, `swarm` y `bridge` como precedente. Aqui se **sigue** la
  convencion vigente, no se decide el eje. Lo que este pase aporta a esa
  decision es una cifra: `repl` necesito 19 lineas que la referencia no tiene.
- **Los dos rojos de otro sujeto** (export de `config`, modulo de `agent`).
- **Promover `census_undeclared_deps.py` a `src/verify/`.** Es candidato —
  medido contra un paquete, util contra los 28— y promoverlo en este pase
  seria cerrar un eje de paso. Queda declarado como candidatura.

---

## El instrumento tenia DOS cegueras mas, destapadas al correrlo sobre los 28

Al extender el censo del paquete al arbol entero, su primera pasada publico
**125** dependencias sin declarar en 25 paquetes. La cifra era falsa por dos
motivos, los dos del propio instrumento:

### 1. Once builtins de Node fuera de la lista

`async_hooks`, `cluster`, `dgram`, `diagnostics_channel`, `domain`, `http2`,
`inspector`, `repl`, `sys`, `trace_events`, `wasi`. Un `import 'async_hooks'`
sin prefijo `node:` se contaba como dependencia externa. Añadidos.

### 2. Una linea de COMENTARIO no es un import — el sub-patron C

El recorrido veia `* import … from '@claude-code-how-works/tool-registry/…'`
dentro de un docstring y lo publicaba como import roto. Medido: **7 archivos**
citan ese alcance, y los **siete** son prosa que documenta la procedencia del
porte:

```
agent/coordinatorMode.ts:19:      *  `import … from '@claude-code-how-works/tool-registry/…'` haria fallar la
app-host/src/state/store.ts:3:    *  `export * from '@claude-code-how-works/repl/stateStore.js'`
bridge/src/initReplBridge.ts:35:  *  El `require('@claude-code-how-works/agent/assistant/index.js')` de la
```

Esa distincion —el literal **nombra** nuestro paquete (defecto) contra el
literal **cita** la procedencia (correcto)— ya estaba resuelta en
`tests/package/package_identity.test.ts`, que la documenta y la mide. El censo
la ignoraba, y por eso publicaba como roto lo que aquel control da por bueno.
`package_identity` esta en **5 pass, 0 fail**: no era el ciego, lo era el censo.

Filtro añadido: una linea que empieza por `*`, `//` o `/*` no aporta
specifiers.

### Control de anulacion del filtro

`outputs/anulacion-filtro-de-comentario.txt`. Sustituido
`if COMENTARIO.match(linea)` por `if False`:

| paquete | con filtro | sin filtro |
|---|---|---|
| `bridge` | **0** | 1 — reaparece `@claude-code-how-works/agent`, de un docstring |
| `repl` | **0** | 1 — reaparece `downloading`, de un comentario |
| `app-host` | **4** | 7 |
| `agent` | **11** | 13 |

Reaparecen exactamente los que viven en prosa, y ninguno mas. El filtro mide lo
que dice medir.

**Efecto sobre `repl`:** su unico residuo —el falso positivo `downloading`—
tambien era de un comentario, asi que el censo del paquete queda en **0**, no
en 1.

## El censo del arbol, ya honesto

`outputs/censo-todos-los-paquetes.txt`: **90** dependencias externas sin
declarar, en **20** de los 28 paquetes. Los mayores: `cli` 15, `agent` 11,
`command-runtime` 9, `config` 9, `tool-registry` 9.

No es una lista homogenea — hay al menos tres clases dentro, y mezclarlas seria
el sub-patron A otra vez:

| clase | ejemplo | que es |
|---|---|---|
| dependencia externa real sin su linea | `react`, `chalk`, `figures` en `cli` | lo mismo que este pase cerro en `repl` |
| **auto-import** | `@thyrox/agent` dentro de `agent`, `@thyrox/cli` dentro de `cli` | un paquete importandose por su propio nombre: otro defecto, otro arreglo |
| texto que sobrevive al filtro de forma | `src`, `github.com`, `list`, `bun`, `typescript` | ceguera declarada del filtro npm |

El barrido de las 90 **no se hace en este pase**: es otro sujeto, con su propio
triaje por clase. Queda medido, que es lo que faltaba para poder decidirlo.

Sucesor del barrido, con su triaje por clase: **TASK-THYROX-0224**.
