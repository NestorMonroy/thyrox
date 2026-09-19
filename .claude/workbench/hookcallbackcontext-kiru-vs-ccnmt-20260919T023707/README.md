# `HookCallbackContext` en Kiru contra el nuestro — dos homonimos

Directiva del ejecutor 2026-09-19: analizar
`kaioken: packages/lib/src/hooks/utils.ts` «para el tema de
`HookCallbackContext` y veas como se implementa».

## Lo primero que hay que medir es el REFERENTE, no el nombre

El repo se llama `kaioken`; su `package.json` dice **`kiru-monorepo`** y su
README abre con *«Kiru es una libreria de renderizado ligera»*. Sus hooks son
`useState`, `useEffect`, `useMemo`, `useRef`, `useReducer` — **hooks de React**.

Medido: `PreToolUse|SessionStart|lifecycle hook|hook_event` da **0 archivos**
en todo `packages/`. El sentido de «hook» que gobierna nuestro arbol —un
manejador registrado para un evento del ciclo de vida del agente— **no existe
en Kiru**.

Asi que los dos `HookCallbackContext` son **homonimos**: mismo significante,
referente distinto. No es una variante del mismo concepto que se pueda
comparar campo a campo para decidir cual es mejor.

## Aun asi, la comparacion estructural dice algo

| Eje | Kiru (`hooks/utils.ts:56-85`) | ccnmt / thyrox (`agent/types/hooks.ts:202-231`) |
|---|---|---|
| Que es un «hook» | ranura de estado por componente, en orden de render | manejador registrado para un evento |
| Firma del callback | `(context) => any` — **un** bolso nombrado, 7 campos | `(input, toolUseID, abort, hookIndex?, context?)` — **cinco** posicionales, dos opcionales |
| Genericidad | `<T>` sobre la forma del estado del hook | ninguna |
| Que lleva el contexto | **capacidades** (`update`, `queueEffect`) + **hechos de posicion** (`isInit`, `index`, `vNode`) | solo **acceso a estado** (`getAppState`, `updateAttributionState`) |
| Consumidores del tipo | el mecanismo entero: `useHook` es la unica puerta | **0** importadores, medido en los dos arboles |

### El `index` es el mismo hecho en dos sitios distintos

Kiru lo pone **dentro** del bolso, con su garantia escrita: *«puedes contar
con que es estable entre renders y unico entre hooks distintos del mismo
componente»*.

ccnmt lo pone **fuera**, como cuarto posicional, y su docstring dice para que
sirve: *«Hook index for SessionStart hooks to compute CLAUDE_ENV_FILE path»*.

Es el mismo tipo de dato —la posicion del hook en su lista— resuelto con dos
formas. La de Kiru escala: anadir un campo no cambia la aridad y el sitio de
llamada lee por nombre. La nuestra tiene cinco posicionales de los que dos son
opcionales, que es la forma que obliga a pasar `undefined` para alcanzar el
siguiente.

### Lo que Kiru nombra y nosotros no podemos expresar: `isInit`

*«Indica si es la primera vez que el hook se inicializa.»* Es un hecho de
**tiempo de ejecucion** que el callback lee.

Lo mas cercano nuestro es `once?: boolean` en `HookCommandBase`, y **no es lo
mismo**: `once` es una **declaracion** del autor del hook —«correme una sola
vez»— que consume el despachador. `isInit` es una **pregunta** que el cuerpo
del hook le hace al mecanismo. Uno se declara, el otro se consulta.

## Veredicto: NO se adopta, y la razon no es de gusto

1. **La referencia gobierna la forma.** `porte-completo-no-parcial.md` fija
   que un simbolo se porta con su nombre, su firma y su comportamiento. ccnmt
   es nuestra referencia para el harness; Kiru es otro producto. Cambiar
   `HookCallback` a la forma de Kiru haria que nuestro simbolo dejara de
   coincidir con su fuente, y la comparacion simbolo a simbolo —de la que
   dependen todos los gates de porte— arrancaria desalineada.
2. **Son homonimos.** Adoptar la forma de un concepto para otro concepto
   porque comparten palabra es exactamente el significante decidiendo sobre el
   significado.
3. **La poblacion que se beneficiaria es minuscula.** Medido: **5** hooks de
   `type: 'callback'` en ccnmt y **4** en thyrox; **0** importadores del tipo
   `HookCallbackContext` en ninguno de los dos. Y el unico sitio que pasa el
   contexto (`ccnmt: packages/agent/hooks.ts:2317`) es la **ruta rapida**, cuyo
   comentario declara su razon de ser: *«todos los hooks son callbacks
   internos... medido: 6.01us -> ~1.8us por acierto de PostToolUse (-70%)»*.
   Restructurar la firma ahi es tocar la ruta que existe **para** ser barata.

## Lo que SI queda registrado como pregunta abierta

El hueco de `isInit` es real y no depende de la forma de la firma: nuestro
mecanismo no le dice al cuerpo de un hook si es su primera invocacion. Si el
harness llega a necesitarlo —hoy no consta que lo necesite, con 4 callbacks—
la via fiel a la referencia es anadirlo **al contexto**, que ya existe y ya
viaja, no un sexto posicional.

*Metrica:* lectura de los dos tipos verbatim, mas conteo de importadores,
de sitios de llamada y de hooks `type: 'callback'` en los dos arboles.
*Ciega a:* si Kiru tiene en OTRO archivo un mecanismo de ciclo de vida que el
grep de cuatro literales no nombre; y a si los 5 callbacks de ccnmt son la
poblacion final o una etapa temprana de su propio diseno.
