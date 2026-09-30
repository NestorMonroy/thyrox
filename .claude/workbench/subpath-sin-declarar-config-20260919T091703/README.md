# subpath sin declarar — config

`TASK-THYROX-0226` (board #534). Hallazgo: `H-THYROX-126`.

## Qué se preguntaba

`@thyrox/config/managedPath` no resolvía. La pregunta previa a tocar nada era
**cuál de los dos lados está mal**: el importador que escribe ese specifier, o
el manifiesto que no lo declara. Las dos hipótesis explican el síntoma y llevan
a arreglos opuestos.

## La fuente lo decide, y decide contra nosotros

Medido en `ccnmt: packages/config/package.json`:

| Eje | La fuente | Nosotros (antes) |
|---|---|---|
| entradas de `exports` | **133** | 12 |
| wildcards | **uno**, y acotado: `./migrations/*.js` | dos, genéricos: `./*` y `./*.js` |
| `./managedPath` | `./settings/managedPath.ts`, explícita | ausente |
| importadores de `config/managedPath` | **7 archivos** | — |

La fuente **enumera**; no delega en un wildcard genérico. Nuestro importador
escribía el mismo specifier que los 7 suyos, así que **el importador era
correcto y el manifiesto era el hueco**. Ese es el veredicto que había que
medir antes de editar: el arreglo simétrico —reescribir el import a
`@thyrox/config/settings/managedPath`— habría divergido de la fuente en 7
sitios a cambio de resolver uno.

## Por qué el wildcard no lo tapaba, y es estructural

Un `*` en `exports` sustituye el **segmento** de ruta, nunca el sufijo:

- `"./*": "./*.ts"` con `./managedPath` da `./managedPath.ts` — que no existe,
  porque el módulo vive en `settings/`.
- `"./*.js": "./*.ts"` **no** convierte `.js` en `.ts`: el `.js` del patrón es
  un literal que tiene que estar presente en el specifier.

De ahí que el hueco sea invisible a simple vista: el manifiesto *parece*
cubrirlo todo con dos líneas, y no cubre ni un módulo que esté un directorio
más abajo.

## El resultado, medido con el MISMO instrumento en los dos estados

| Estado | specifiers | entradas `exports` | sin resolver |
|---|---|---|---|
| HEAD (antes) | 121 | 12 | **8** |
| árbol (después) | 120 | 20 | **0** |

Los ocho, y su desenlace:

| Specifier | Dónde vive el módulo | Cómo se cierra |
|---|---|---|
| `managedPath` | `settings/managedPath.ts` | entrada explícita |
| `applySettingsChange` | `settings/applySettingsChange.ts` | entrada explícita |
| `changeDetector` | `settings/changeDetector.ts` | entrada explícita |
| `pluginOnlyPolicy` | `settings/pluginOnlyPolicy.ts` | entrada explícita |
| `lazySchema.js` | `internal/lazySchema.ts` | entrada explícita (la fuente declara la forma con `.js`) |
| `sync` | `sync/index.ts` | entrada explícita |
| `testing` | `testing/index.ts` | entrada explícita |
| `applySettingsChange.js` | — | **el importador**: la fuente NO declara esa forma, y ninguno de sus importadores la escribe |

**Siete de ocho son hueco del manifiesto; uno es del importador.** El universo
baja de 121 a 120 por ese último: al perder el sufijo, `applySettingsChange.js`
se funde con `applySettingsChange`, que ya estaba contado.

`./lazySchema.js` **sí** se declara y `./applySettingsChange.js` **no**: es lo
que la fuente hace, y lo hace porque uno de sus importadores escribe la forma
con sufijo y el otro no. No se inventó simetría donde la fuente no la tiene.

## Cuatro defectos del propio instrumento, y el cuarto causó una edición falsa

La sonda publicó tres cifras falsas antes de una verdadera, y una cuarta cifra
falsa **sobrevivió a las tres correcciones** y llegó a provocar un cambio en 19
archivos. Los cuatro se registran porque son reusables al escribir el siguiente
censo.

### 1. Desempate de wildcard por la base sola — publicó 64

`"./*"` y `"./*.js"` comparten base `./`. Rankeando por la base, el genérico
ganaba y `feature-flags.js` «resolvía» a `feature-flags.js.ts`. La
especificidad de un wildcard es el **par** `(base, sufijo)`, no la base:

```python
rank = (len(head), len(tail))
```

Artefacto de la versión defectuosa: `outputs/artefacto-sonda-desempate-por-base.txt`.

**Qué lo destapó:** leer las líneas, no el conteo. Un `x.js.ts` en la columna
de destino no es plausible como ruta real.

### 2. Filtro de línea `^import` — publicó un 0 falso

Un import multilínea cierra con `} from '...'`, que no empieza por `import`.
El filtro descartaba specifiers reales y el universo caía de 130 a 104: un
**0 con el denominador encogido**, que es el sub-patrón D con el instrumento
como sujeto — el verde no distinguía «no quedan defectos» de «dejé de mirar
donde estaban».

**Qué lo destapó:** listar los descontados en vez de confiar en el conteo.

### 3. `find -name "sync.ts"` — dijo AUSENTE dos módulos que existen

`sync` y `testing` no son archivos: son **directorios con `index.ts`**, igual
que en la fuente. `outputs/particion-clases.txt` conserva las dos líneas
`AUSENTE` porque es evidencia fechada del defecto, no del árbol.

**Qué lo destapó:** medir el manifiesto de la fuente antes de concluir «sin
portar». La fuente los declara (`./sync` → `./sync/index.ts`).

### 4. El que costó una edición: prosa contada como specifier

Los artefactos `rojo-config.txt` (136 specifiers, 19 sin resolver) y
`particion-clases.txt` **no los produjo el instrumento final**. Su regex
todavía no exigía comillas, así que contaba como specifier una **cita en prosa
dentro de un comentario** — `` * `@thyrox/config/env/utils.ts` sólo porta
isEnvTruthy `` —, que nombra un ARCHIVO y no resuelve nada porque nadie la
resuelve.

De ahí salió una «clase A» de 12 «defectos del importador» que **no existe**.
Medido con el instrumento final sobre los dos estados del árbol:

```
formas con sufijo .ts entre comillas —  en HEAD: 0  |  en el árbol: 0
```

Y el precio: se aplicó una sustitución sobre el literal, que alcanzó **24
líneas en 20 archivos, de las que 23 eran prosa y 1 era código**. Cada una de
esas 23 degradaba una cita correcta: `env/utils.ts` **es** el nombre del
archivo; `env/utils` no nombra nada. Los 19 archivos que sólo tenían prosa se
revirtieron.

**El control de que la reversión es segura:** `bun run typecheck` da **5684**
errores con la prosa editada y **5684** tras revertirla. Las 23 líneas eran
inertes para el compilador, así que el delta de −20 pertenece entero al
manifiesto más ese único `require()`.

**Qué lo destapó:** ni el conteo ni una relectura, sino comparar los dos
estados del árbol **con el mismo instrumento** — 121 en HEAD contra 120 ahora,
con una sola forma desaparecida donde la historia de la «clase A» exigía doce.

**La lección del cuarto, que no es la de los otros tres:** los tres primeros
publicaron una cifra equivocada y se corrigieron sin dejar rastro en el árbol.
El cuarto publicó una cifra equivocada **de una versión anterior del
instrumento**, y esa cifra se siguió leyendo como válida después de arreglar el
instrumento. Un artefacto de un banco lleva la fecha de su producción, no la
del instrumento que lo produjo: comparar dos cifras de un banco exige
comprobar antes que salieron del mismo.

## La sonda

`probes/census_unresolved_subpaths.py`. Toma un paquete como argumento; sin
argumento recorre todos.

*Métrica:* specifiers `@thyrox/<paquete>/<subpath>` **entre comillas** en
`src/packages/**/*.ts{,x}` y `tests/**/*.ts`, resueltos contra el `exports` del
manifiesto del paquete destino, con el desempate de wildcard por
`(base, sufijo)`.
*Ciega a:* un subpath que resuelve a un archivo que **existe y está vacío o
roto** —mide declaración, no contenido—; un specifier construido en tiempo de
ejecución; y el `exports` condicional por `import`/`require`, que este árbol no
usa hoy y que la sonda aplanaría.

## Lo que este banco NO cierra

- **Los demás paquetes.** Sólo se midió y arregló `config`. Sucesor:
  **TASK-THYROX-0227**.
- **Un TS2345 revelado, no introducido.** Al resolver `changeDetector`, el
  parámetro `source` de `cli/src/headless/sdk/session/run.ts:179` deja de ser
  `any` implícito y aflora un desajuste real en la línea siguiente: nuestro
  `AppStateLike` (índice desnudo) no es asignable al `SettingsChangeTarget` que
  `applySettingsChange` declara. **Nuestro porte es fiel** —los tres tipos son
  byte a byte los de la fuente—; lo que difiere es el compilador: `ccnmt`
  declara `"strict": false`, que hace bivariantes las posiciones de parámetro,
  y nosotros `"strict": true`. Es una adaptación a modo estricto, no un defecto
  de porte, y la línea ya estaba roja antes (TS2307). Sucesor:
  **TASK-THYROX-0228**.
