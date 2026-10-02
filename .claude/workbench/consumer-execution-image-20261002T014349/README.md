# Imagen de ejecución de un consumidor (TASK-THYROX-0775)

## El encargo

<!-- verbatim, sin parafrasear -->

> No reintroduzcas `--model` en el consumidor.
> La política declarativa debe seguir siendo la única autoridad sobre el modelo permitido.
> 3. No dejes pendiente el hallazgo de hunspell/xelatex
> Éste no es un problema del modelo.
> Has medido que la ExecutionUnit no tiene todavía el toolchain necesario para ejecutar completamente el contrato de `ES_MX_TRANSLATION_PLAN.md`.
> Eso significa que hoy podemos ejecutar el modelo en una unidad, pero no podemos verificar completamente su resultado dentro de esa misma frontera.
> Eso debe corregirse antes de P8.
> Implementa ahora, como trabajo de proveedor, el soporte necesario para que la imagen de ejecución tenga las herramientas deterministas requeridas por el consumidor.
> Como mínimo investiga y cierra:
>
> ```
> hunspell + diccionario es_MX
> xelatex
> fuentes necesarias por el corpus
> dependencias que V4/V6 realmente invocan
> ```
>
> No metas herramientas “por si acaso”.
> Derívalas del call path real de:
>
> ```
> translation_loop
> → verifier
> → V0…V7
> ```
>
> y añade sólo las que son necesarias.
> Hazlo con TDD y prueba dentro de una ExecutionUnit real.
> 4. La prueba que quiero para el toolchain no es sólo “binario encontrado”
> Demuestra:

## La premisa, si se corrigio al primer comando

Ninguna: el encargo se ejecutó tal como se pidió.

## Las piezas

| archivo | que hace |
|---|---|
| `probes/p5a/finish.sh` | borrador del cambio, tal como se aplicó |
| `probes/p5a/impl.py` | borrador del cambio, tal como se aplicó |
| `probes/p5a/tests.ts` | borrador del cambio, tal como se aplicó |
| `outputs/` | 3 salidas: rojos, verdes y anulaciones |

## Los resultados

Medido: la imagen de ejecución de thyrox no trae `hunspell` ni `xelatex`, y 29
pruebas del ciclo es-MX fallan dentro de una unidad. Meterlos en la imagen
base cargaría TeX Live a toda tarea de thyrox. La selección por consumidor ya
existía (`run` lee `THYROX_EXEC_IMAGE`, y el runner la hereda del pool y de
`thyrox-bg`); lo que faltaba es que el consumidor pudiera CONSTRUIR su imagen
sin citar una TASK de thyrox: `build-image` sólo aceptaba `--task`.

- `build-image --work CONSUMIDOR:ID`, excluyente con `--task`. La imagen lleva
  `thyrox.execution-reference=work:…`; la de una tarea conserva `thyrox.task`.

| Anulación (sed, sintaxis comprobada) | Cae |
|---|---|
| etiqueta por referencia | «--work construye bajo la identidad del consumidor» |
| una sola referencia | «--task y --work juntos» |

Mitad roja: `outputs/red.txt` (2 fallos).

*Metrica:* aserciones rojas antes y las que caen al retirar cada guarda.
*Ciega a:* el contenido de la imagen del consumidor: lo mide el banco de equivalencia de ai-course-notes.
