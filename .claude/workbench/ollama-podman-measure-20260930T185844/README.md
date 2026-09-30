# ollama-podman-measure

## El encargo

> «medir el pull real de la imagen de Ollama; levantar Ollama como servicio
> Podman [...] benchmarkear candidatos con tool calling en CPU; escoger el
> modelo por esas mediciones» — directiva del ejecutor, TASK-THYROX-0662.

## La premisa, si se corrigio al primer comando

La premisa implícita era que un contenedor con la red propia de Podman
(bridge) alcanza el registro de modelos. Es falsa en este entorno: el proxy
de salida escucha en `127.0.0.1:46021`, y el loopback del contenedor en modo
bridge no es el del anfitrión.

## Las piezas

| archivo | que hace |
|---|---|
| `probes/pull_image.sh` | descarga `docker.io/ollama/ollama:0.35.0` y mide tiempo, tamaño y digest |
| `probes/network_modes.sh` | levanta Ollama en modo bridge y en modo host, y pide `qwen2.5:0.5b` en cada uno |
| `outputs/pull_image.out` | salida verbatim de la descarga |
| `outputs/network_modes.out` | salida verbatim de los dos modos de red |

## Los resultados

| Medición | Valor |
|---|---|
| pull de la imagen | exit 0, **89 s**, 5 513 676 936 bytes, `sha256:2a6e883b…` |
| API en modo bridge | responde (`0.35.0`) |
| pull de modelo en modo bridge | **falla**: `proxyconnect tcp: dial tcp 127.0.0.1:46021: connect: connection refused` |
| pull de modelo en modo host (`OLLAMA_HOST=127.0.0.1:11534`) | **éxito en 8 s**, 397 821 319 bytes (`qwen2.5:0.5b`, Q4_K_M) |

Consecuencia para el servicio `thyrox-ollama`: `--network host` con
`OLLAMA_HOST` en loopback y la CA del proxy montada. No es una excepción de
anfitrión (ADR-007): Podman sigue siendo el runtime; sólo cambia el modo de
red.

*Metrica:* código de salida y reloj de pared de cada paso, en este
contenedor, un intento por modo.
*Ciega a:* un entorno sin proxy de salida (ahí bridge funcionaría), la
variación entre intentos (n = 1) y el comportamiento con GPU NVIDIA.
