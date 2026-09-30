# `jsx` en la raiz: 320 TS6142 eran el compilador negandose a leer 639 `.tsx`

`TASK-THYROX-0197` (board #506). Banco de 2026-09-19.

`TS6142` no es un error de codigo. Dice, verbatim:

    Module './ink.js' was resolved to '.../core/ink.tsx', but '--jsx' is not set.

El compilador **resuelve** el `.tsx` y **se niega a leerlo**. 320 veces.

## Lo que la medicion destapo, y NO era el sujeto del pase

El total de 5156 que los dos pases anteriores publicaron estaba medido sobre un
universo que **excluia 639 archivos `.tsx`** — el `include` de la raiz era
`src/**/*.ts` y `tests/**/*.ts`, sin `.tsx`. De esos 639 el arbol solo sabia una
cosa: que no los leia.

Es el **sub-patron A** de `metrica-decide-la-conclusion.md` aplicado a la
cifra de cabecera de esta campana: «total de errores del arbol» nombraba dos
poblaciones distintas segun si `jsx` estaba declarado. Quedo declarado aqui, no
corregido hacia atras: las cifras de `TASK-THYROX-0192` y `0195` siguen siendo
correctas **sobre su universo**, que ahora esta dicho.

## Las cuatro variantes medidas

| # | Variante | Errores | TS6142 | TS2875 | TS2307 |
|---|---|---|---|---|---|
| 0 | estado comprometido (sin `jsx`) | 5156 | **320** | 0 | 711 |
| 1 | `jsx: react-jsx` solo | 9440 | 0 | **530** | 1877 |
| 2 | (1) + `react`/`@types/react` en la raiz | 7429 | 0 | **0** | 1106 |
| 3 | (2) + `include: src/**/*.tsx` | **7592** | 0 | 0 | 1106 |

La variante 3 es la aplicada, y es la forma de la referencia:
`ccnmt: tsconfig.json` declara `"jsx": "react-jsx"` e incluye
`packages/**/*.ts` **y** `packages/**/*.tsx`.

## Por que la 1 no se podia aplicar sola

`react-jsx` hace que toda expresion JSX importe `react/jsx-runtime`. Sin
`@types/react` resoluble, cada `.tsx` con JSX emite `TS2875` — **530 medidos**.
Y `react` no resuelve desde 12 de los 19 paquetes con `.tsx`: **771** de los
1166 `TS2307` nuevos de la variante 1.

Medido, el reparto de la declaracion de `react` antes del pase:

| | paquetes con `.tsx` | declaran `react` | declaran `@types/react` |
|---|---|---|---|
| | 19 | 6 | **1** (`ide`) |

Los 6 que declaran `react` **tambien** emitian `TS2875`: declarar el runtime no
trae los tipos.

## Lo que este pase NO decide: `TASK-THYROX-0098` (#448)

Aquella tarea es **decision del ejecutor** y sigue abierta: izar las
dependencias de los 26 paquetes a la raiz (opcion A, fiel a `ccnmt`, que tiene
0 `dependencies` y 136 `devDependencies` en su raiz) contra declararlas por
paquete (opcion B).

Lo que este pase hace es **dos lineas en un archivo**: `react` y `@types/react`
en `devDependencies` de la raiz, que es donde la referencia las tiene. Va en la
direccion de A y no consume su alcance — los 26 paquetes conservan sus
`dependencies`, y el izado sigue pendiente.

## El veredicto es por codigo, y el total SUBE

`TS6142` **320 -> 0** y `TS7016` **75 -> 38**. Todo lo demas sube, y no es
regresion: son 639 archivos entrando al programa. `TS18046` +692, `TS7006` +225,
`TS2305` +350 — errores de `.tsx` que nunca se habian contado.

## Lo que la variante 3 anade sobre la 2

**33 archivos** y **+163 errores**: `.tsx` que ningun `.ts` importa. Repartidos
`repl` 12, `permission` 3, `command-runtime` 3, `agent` 3, `tool-registry` 2,
`computer-use-mcp` 2, `cli` 2, `app-host` 2, `@ant` 2, `swarm` 1, `output` 1.
Dejarlos fuera seria exactamente la ceguera que este banco acaba de destapar.

## El `TS2307` residual (1106) y sus sucesores

| Destino | n | Sucesor |
|---|---|---|
| `@thyrox/*` | 369 | `TASK-THYROX-0099` (#449) — mas pares visibles ahora que los `.tsx` entran |
| `@anthropic/ink` | 273 | `TASK-THYROX-0198` (#507) — el arbol tiene `@ant/ink`; renombre a medias, de la clase de `TASK-THYROX-0169` |
| `figures` · `lodash-es` · `chalk` · `diff` · `usehooks-ts` … | ~250 | `TASK-THYROX-0098` (#448) |
| `@claude-code-how-works/local-observability` | 18 | `TASK-THYROX-0170` (#479) |

*Metrica:* conteo de `error TS[0-9]+` por codigo sobre la salida de
`bunx tsc --noEmit` desde la raiz, con `awk`, en cuatro configuraciones.
*Ciega a:* la calidad del tipo — un conteo no separa un `any` implicito de un
contrato equivocado; los 36 paquetes sin `tsconfig` propio, que la compilacion
por paquete no alcanza; y si un error suprime otros aguas abajo.
