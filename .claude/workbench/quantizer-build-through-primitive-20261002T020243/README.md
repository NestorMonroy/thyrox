# quantizer-build-through-primitive

## El encargo

> «Cerrar las excepciones TASK-THYROX-0746 y TASK-THYROX-0747: migrar cada
> una, o probar que está fuera de alcance. No hay excepción justificada por
> historia.» (directiva del ejecutor, 2026-10-02)

Esta pieza cierra **TASK-THYROX-0747**: el build de la imagen del quantizer.

## La premisa, si se corrigio al primer comando

`build.sh` invocaba `podman build` directo. La primitiva ya tenía
`build-image` (`bin/podman-execution-execute build-image`), que pasa
`HTTPS_PROXY` y monta la CA del proxy en `PROXY_CA`. El `Containerfile`
esperaba `PIP_CERT` como `ARG`; ahora recibe `PROXY_CA` y lo exporta a
`PIP_CERT` sólo si está declarado.

## Las piezas

| archivo | que hace |
|---|---|
| `src/packages/model-artifacts/quantizer-image/build.sh` | construye por `thyrox_managed_execution_runner_argv build-image`, nunca `podman build` |
| `src/packages/model-artifacts/quantizer-image/Containerfile` | `ARG PROXY_CA` → `PIP_CERT` dentro del `RUN` de pip |
| `tests/lib/test-quantizer-image-build.sh` | el argv que sale hacia el runner, con un runner doble |
| `src/verify/podman_materialization_pending.txt` | se retira la excepción de `build.sh` |
| `outputs/build/` | build real, `/usr/bin/time -v` y su log |

## Los resultados

- Gate: `check_podman_materialization` → 0 fuera de la primitiva, 1 pendiente
  vigente (sólo `podman_capabilities.sh`, TASK-THYROX-0746).
- Suite: `tests/lib/test-quantizer-image-build.sh` 11 de 11.
- Build real por la primitiva (`outputs/build/build.log`, 1:58 de pared,
  `Exit status: 1`): tiró de la base `ghcr.io/ggml-org/llama.cpp` por digest,
  ejecutó el `RUN` de `apt` y el `RUN` de `pip` **entero** (venv, torch CPU,
  transformers, gguf-py) a través del proxy con `PROXY_CA`, y falló al
  **confirmar la capa** de ese paso:
  `write /var/tmp/container_images_storage…/1: no space left on device`.
  Disco tras el fallo: 3.2 G libres de la cuota de la sesión.
- Lo que el disco no deja ver: la imagen final no se materializó. No se
  borró ningún volumen ni imagen en uso para liberar espacio; sólo las dos
  capas colgantes del propio build, que liberaron 0.1 G porque comparten
  capas con la base.

Desenlace: la **migración** está hecha y su gate pasa; la **materialización**
de la imagen es `resource_unavailable` (disco), no un fallo del camino.

*Metrica:* exit y última línea del log de `build-image`; `df -h /`.
*Ciega a:* si la imagen resultante pasaría su verificación de contenido — eso
exige el build completo con ≥ 4 G libres.
