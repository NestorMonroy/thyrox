# ventana-congelada-de-hallazgos

`TASK-THYROX-0224` (banco hermano de `izar-dependencias-a-la-raiz`).

## El encargo

`.claude/CLAUDE.md` declara que un hallazgo del consumidor tiene **dos caras**
—el `.rst` es el artefacto de gobierno, la fila del store es su índice de
búsqueda— y que *«la ventana entre registrar la fila y escribir el archivo es
legítima mientras dura. Congelada, esa ventana es deuda»*.

Medido al abrir este banco: **36** filas `H-THYROX` del store sin ningún
`.rst` en todo `pm/`, la más antigua de hace semanas. Ventana congelada.

## Lo que se hizo

Un generador, no 36 archivos a mano — por tres razones, no por comodidad:

1. **El contenido ya estaba escrito**, en `summary` y `content` de cada fila.
   Reescribirlo a mano es transcripción, y la transcripción es de donde salió
   el 1693 de :ref:`h-thyrox-129`, en el banco hermano y el mismo día.
2. **36 escrituras con `date -u` por archivo** es el contexto de lote que
   `timestamps-iso8601-obligatorios.md` marca como de alto riesgo de
   fabricación. Aquí la fecha sale del `created_at` de la fila, que es la real.
3. El generador **rehúsa con exit 2** ante una fila cuyo `initiative` no tenga
   `hallazgos/` en el consumidor, en vez de crear el directorio. Disparó: tres
   filas llevaban un **slug de banco** en esa columna —`porte-ccnmt-a-thyrox`,
   `porte-sessionstorage-no-carga`, `subpath-sin-declarar-config`— y se
   repuntaron a mano antes de emitir.

## Dos controles que NO discriminaron, y cómo se vieron

Los dos son del sub-patrón **D** de `metrica-decide-la-conclusion.md`, con
este mismo pase como sujeto.

**1. La «tabla exhaustiva» que se enganchó.** La primera versión decidía si
añadir una fila a la tabla del índice comparando *número de `:ref:`* contra
*número de archivos*. Medido mal por un `grep -c` con la comilla invertida mal
escapada, publiqué «tabla=21» cuando `findall` da **92** — y 92 contra 89
archivos converge a igualdad en cuanto se escriben tres archivos, así que a
partir del cuarto la condición se quedó pegada en verdadera: **26 de 28**
recibieron fila y dos no, sin criterio.

Medido de nuevo **por conjunto de identificadores**, que es el instrumento que
sí discrimina: `construir-harness-propio` lista **21 de 50** hallazgos
`H-THYROX`, y `actualizar-agentic-ai-thyrox` lista **0 de 4** porque su tabla
enumera los `H-DOCS`. La tabla es un subconjunto **curado** en los cinco
índices; el `toctree` es 1:1 con los archivos en los cinco.

Desenlace: se revirtieron los cinco índices y el generador **ya no toca la
tabla**. Sostiene sólo el invariante del `toctree` —el que Sphinx exige— y
deja la curación a quien la mantiene. Verificado sobre **todo** `pm/`: 0
índices con huérfanos y 0 con entrada fantasma.

**2. El repunte masivo de `source_ref` que iba a borrar 90 punteros.** Con el
`.rst` escrito, la fuente de verdad de una fila es el `.rst`, así que las filas
se repuntaron a él. El `update` tocó **126**. Comparado contra la versión del
store en `HEAD` —no contra lo que el update dijo haber hecho— resultó que sólo
los **36** emitidos (más otros cuatro) llevan la referencia original dentro,
en su línea `**Fuente:**`. Los otros **90** habrían perdido su único puntero
legible a la evidencia.

Desenlace: 90 devueltas a su `source_ref` original; **40** apuntan a su `.rst`.
El control que lo vio no fue releer el update — fue **comparar contra el estado
anterior**, que es el único instrumento que puede fallar aquí.

## Lo que este banco NO cierra

- **El cuerpo de los 36 es el `content` de su fila**, no un análisis nuevo. Cada
  uno cita su fuente original y lo declara en una nota. Enriquecerlos es trabajo
  por hallazgo, no de este pase.
- **La tabla de los cinco índices sigue siendo un subconjunto.** Que deba serlo
  o no es una decisión de curación que este pase no toma; lo que sí deja es la
  medición que la hace decidible.
- **El gate no existe.** Nada impide que la ventana vuelva a congelarse: sería
  un check de «fila sin `.rst`» corriendo en el audit. Sucesor:
  **TASK-DOCS-0433** (reconciliar el estado del índice de hallazgos con el
  `:estado:` de cada archivo), que es el eje vecino y el sitio natural.

## Tercer control que no discriminó, y es el mismo defecto de 129

La primera versión de esta sección citaba `TASK-THYROX-0256`, rellenando a
cuatro dígitos el ordinal `#256` del tablero. **No resuelve**: el sujeto vive
en el store como `TASK-DOCS-0433`. Es el defecto de :ref:`h-thyrox-129`
repetido **el mismo día, en el banco siguiente**.

Y no fue una: al escribir la corrección cité `TASK-DOCS-0286` para el gate,
que en el store nombra *«Las formas de USO no cierran solas»* — otro sujeto,
otro relleno del ordinal `#124`. **Tres en una sesión** deja de ser un
descuido y pasa a ser una forma.

El gate que la ataja es **TASK-DOCS-0392** («rechazar el ordinal de board como
cita de sucesor»), abierto. El instrumento que la ve hoy es resolver **cada**
cita contra el store antes de publicarla, y es lo único que la atrapó las tres
veces — releer el texto no la vio ninguna.

*Métrica:* filas `H-THYROX-N` de `findings_history` sin un
`hallazgo-H-THYROX-N-*.rst` en ninguna raíz de `pm/`; y, por índice, el
conjunto de identificadores de su tabla contra el de sus archivos.
*Ciega a:* un `.rst` que exista con el id en el cuerpo pero no en el nombre del
archivo —el emparejamiento es por nombre—; y a si el contenido de cada fila es
correcto, que es otro eje y lo decidió quien lo escribió.
