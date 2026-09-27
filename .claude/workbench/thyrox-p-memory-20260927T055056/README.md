# La memoria de `thyrox -p`, medida contra el proxy local (TASK-THYROX-0260)

Qué se preguntó: ¿qué política de historial predice mejor el pico de RAM de
la siguiente ejecución de `headless-pool` —la última, el máximo de las
últimas k, el p90 de los ítems—? Hasta hoy sólo había 5 ejecuciones medidas,
todas de `claude -p` (`pool-history-policy-20260927T053651/`), y el ejecutor
del pool ya es `thyrox -p`.

## Cómo, y por qué sin credencial

GNU Time mide el proceso LOCAL de cada ítem; el modelo corre en el servidor.
Un servidor de loopback con la forma de la Messages API basta:

```bash
HEADLESS_POOL_HISTORY_DIR=<banco>/history bash bin/pool-calibrate \
    --prompt <banco>/prompt.md --model claude-sonnet-5 --runs 12 --width 4 \
    --out <banco>/out < <banco>/items.txt
uv run --frozen python <banco>/probe_policies.py <banco>/out
```

`pool-calibrate` retira del entorno la credencial del anfitrión y pasa un
marcador local como clave. El proxy registró las 96 peticiones (12 × 8) con
`auth=x-api-key`, ninguna con `authorization`.

## Resultado (`result.txt`)

- pico por ejecución: 224–229 MB; pico / mediana dentro de una ejecución,
  mediana 1.01 y máximo 1.02; mayor salto entre ejecuciones, 1.02×.
- sin margen, todas las políticas quedan por debajo alguna vez —last 5 de
  11, max_5 2 de 11, p90 6 de 11—, siempre por ~1 %.
- lo que el pool aplica, el pico de la última × 2, cubre 11 de 11 con
  sobrecoste 2.00×. Con `claude -p` el salto medido fue 1.22×: también
  dentro del margen.

## Decisión: no se cambia la política

Con una dispersión de ~2 % la elección entre last, max_k y p90 no cambia
ninguna admisión bajo el margen 2: el margen, no la política, es lo que
protege. Implementar max_k o p90 sería código que ninguna medida pide. El
margen ya es parámetro (`--margin` de `pool_history derive`); bajarlo es
decisión del consumidor y exigiría medir la carga real, no ésta.

*Métrica:* RSS pico por ítem (GNU Time, `%M`) de `thyrox -p` con respuestas
mínimas de un proxy local; 12 ejecuciones × 8 ítems, anchura 4.
*Ciega a:* el tamaño de una respuesta real y lo que añaden las herramientas
de un turno real —la cifra es un piso—; y a otra máquina, otra versión de
bun y otra plantilla.
