# Imagen de ejecución de un consumidor (TASK-THYROX-0760)

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
