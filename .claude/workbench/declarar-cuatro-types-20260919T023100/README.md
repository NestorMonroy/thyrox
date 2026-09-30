# Declarar los cuatro @types que los 50 TS7016 nombran — TASK-THYROX-0202

## El sujeto

Los 50 TS7016 del arbol se reparten en **6 modulos raiz**, no en 50 causas:

    35 lodash-es · 10 react-reconciler · 2 proper-lockfile · 1 picomatch
     1 '..'      ·  1 @thyrox

Los cuatro primeros son **un solo mecanismo**: el paquete de runtime esta
enlazado y su `@types/*` no.

## La referencia NO dice lo mismo de los cuatro

Medido sobre `ccnmt: package.json` (0 dependencies, 136 devDependencies):

| Paquete | La referencia | Aqui, antes |
|---|---|---|
| `@types/react-reconciler` | `^0.33.0` | ausente |
| `@types/proper-lockfile` | `^4.1.4` | ausente |
| `@types/picomatch` | `^4.0.3` | ausente |
| `@types/lodash-es` | **AUSENTE** | en 2 paquetes de 8 |

Los tres primeros son deuda nuestra pura — la referencia los tiene y el porte
no los trajo. Las versiones se copian verbatim de ella.

El cuarto es **DIVERGENCIA DECLARADA**. La referencia no lo declara en ningun
sitio, y no por descuido: `ccnmt: CLAUDE.md` fija *«Don't try to fix all tsc
errors»* y cablea `verify-tsc-errors` como ratchet sobre ~3300 errores de
descompilacion. Su postura es convivir con ellos; la nuestra es llevar la
cuenta a 0. Ademas `config` y `local-observability` ya lo declaraban
localmente, asi que el tipo ya se habia considerado correcto en este arbol —
lo que faltaba es que lo vieran los otros seis que declaran `lodash-es` sin el
(bridge, ink, mcp-runtime, provider, tool-registry, updater).

Van en `devDependencies` de la **raiz**, que es la forma de la referencia y la
direccion A de TASK-THYROX-0098. Se aplica **solo a estas cuatro entradas**:
izar el resto sigue siendo decision del ejecutor.

## El CONTROL discrimina — y su mitad negativa es la que lo prueba

| Modulo | Antes | Despues | |
|---|---|---|---|
| `lodash-es` | 35 | **0** | declarado |
| `react-reconciler` | 10 | **0** | declarado |
| `proper-lockfile` | 2 | **0** | declarado |
| `picomatch` | 1 | **0** | declarado |
| `..` | 1 | **1** | **SOBREVIVE** — no declarado |
| `@thyrox` | 1 | **1** | **SOBREVIVE** — no declarado |

Caen **exactamente** los cuatro declarados y ninguno mas. Los dos que
sobreviven son los que hacen del control un control: son otra clase —una ruta
relativa y un hermano de workspace, no un paquete de npm sin tipos— y su
supervivencia prueba que la caida se debe a la declaracion y no a que esos
archivos dejaran de ser alcanzables.

## La PREDICCION acerto el mecanismo y fallo el signo neto

La tarea predijo: *«el total puede SUBIR. Un import que hoy es `any` implicito
deja de serlo al tipar el modulo, y entonces sus usos se miden de verdad»*.

El total **bajo** —7018 -> 6872, -146— asi que el signo neto fallo. Pero el
mecanismo ocurrio y es medible: **15 errores subieron**, y son de la clase
exacta que la prediccion nombro.

| Suben — los usos se miden de verdad | Bajan — cascada de resolucion |
|---|---|
| TS2339 +7 · TS2538 +4 · TS2459 +2 · TS2769 +1 · TS2345 +1 | TS7006 **-60** · TS7016 **-48** · TS2307 **-44** · TS7031 -6 · TS2305 -2 · TS2304 -1 |

El TS7006 -60 («Parameter implicitly has an 'any' type») es el que domina, y
no es el efecto directo: es que un callback pasado a una funcion ya tipada
infiere sus parametros. Tipar el modulo no solo quita su propio error —
devuelve informacion a todo lo que lo usa.

*Metrica:* `bunx tsc --noEmit` sobre la raiz, agrupando por codigo y, dentro
de TS7016, por el modulo raiz que el mensaje nombra.
*Ciega a:* si los 15 que suben son defectos reales o falsos positivos de una
firma que lodash tipa mas estrecha de lo que el uso necesita — el conteo no
lo distingue, y su triaje queda abierto.
