# bloqueo-real-de-permission

## El encargo

<!-- verbatim, sin parafrasear -->

> realizar las implementaciones pendientes de claude-code-nestor-monroy-tools
> para thyrox, considera analizar, actualizar o implementar en TDD

Entrada concreta: la tarea #250, «Completar permission: 110 de 133 siguen
fuera, y 88 son un bloque decidible».

## La premisa, si se corrigio al primer comando

Se corrigio, y tres veces:

1. **El denominador excluia `.tsx`.** Faltan **69 de 106**, no 24 de 61:
   `find -name '*.ts'` no ve los componentes. Sub-patron A por segunda vez en
   la misma tarea — la correccion previa ya habia mandado declarar si el
   conteo incluye `__tests__`, y no declaro la extension.
2. **«88 son un bloque decidible» es falso.** Hoy **ninguno** de los 69 es
   portable. Los dos que salen libres son stubs de tres lineas de la propia
   fuente.
3. **El bloqueo no es de este paquete.** Es de react (convencion invertida,
   TASK-THYROX-0098), de seis hermanos sin enlazar, y del arbol de
   tool-registry, provider, agent y shell.

## Las piezas

| archivo | que hace |
|---|---|
| `probes/measure_permission_blockers.py` | resuelve cada specifier de cada modulo ausente contra el arbol de thyrox, en cuatro ejes: DEP, LINK, SIBLING, TREE |
| `outputs/blockers.txt` | su salida, modulo por modulo |
| `probes/census_sibling_links.py` | generaliza el eje LINK a los 28 paquetes |
| `outputs/sibling-links.txt` | su salida: 24 paquetes, 78 aristas ausentes |

## Los resultados

*Metrica:* specifiers de importacion —`from`, `import()` dinamico y
`require()`— de los 69 modulos que la fuente tiene sin test y el puerto no,
resueltos contra el `node_modules` del importador, el `exports` del destino
con sus comodines expandidos por especificidad, y el arbol.

*Ciega a:* el SIMBOLO. Que `provider/model.ts` exista no prueba que exporte lo
que le piden. Ciega tambien a los tres `.txt` que `yoloSystemPrompt` hace
`require`, que no entran en el conteo de 106 y tambien hay que portar.

**CUATRO defectos del propio instrumento, cada uno invertia veredictos, los
cuatro corregidos aqui:** no expandia los comodines de `exports` (10 MANIFEST
falsos); `./*` ganaba sobre `./*.js` y componia `x.js.ts` (22 TREE falsos,
entre ellos `agent/eventMetadata`, que si existe); no veia el `import()`
dinamico (1 LIBRE falso); y media el `exports` del destino sin preguntar si el
importador lo ve (66 aristas LINK repartidas entre TREE y «resuelve»).

El cuarto se destapo verificando por conducta **despues** de haber escrito la
afirmacion contraria en el `package.json`. Se corrigio en el mismo pase.

## Lo que el cuarto defecto generalizo

El eje LINK no es de `permission`: **24 de 28 paquetes importan un hermano de
workspace que no tienen enlazado**, 78 aristas. Cuatro enlazan **cero** y aun
asi lo importan — `daemon`, `headless-sdk`, `output`, `context-compression`.

Ningun gate lo ve porque el defecto vive en el manifiesto del **importador**,
no del destino: falla en ejecucion con `Cannot find module`, no al validar
manifiestos. Registrado como `H-THYROX-61` y `TASK-THYROX-0099`.
