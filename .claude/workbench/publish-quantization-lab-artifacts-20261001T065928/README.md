# publish-quantization-lab-artifacts

## El encargo

> «no consideres los GGUF como imágenes ejecutables. Separa PermanentRuntimeImage
> de PermanentArtifact […] después de publicar: resolver el manifest por digest;
> verificar acceso anónimo de lectura; verificar blob por blob contra el sha256
> declarado, en flujo y descartando cada blob; probar que un consumidor sin
> acceso al almacenamiento de Podman de esta sesión puede materializar el
> artefacto; sólo entonces permitir borrar la copia local, que pasa a ser caché.»
> — TASK-THYROX-0728. Y: «podman-execution-primitive es la vía obligatoria de
> ejecución para implementar»; «¿no consideras que la IP tiene que ser también
> con una variable en .env?».

## La premisa, si se corrigió al primer comando

El trabajo de verificación no alcanza el exterior con red `bridge` ni
`slirp4netns`: el proxy de salida escucha en el loopback del anfitrión. La
primitiva ganó el modo `host` (`490d3d0ea`), explícito y nunca por defecto, y
la dirección del proxy se declara en `.env` (`THYROX_JOB_EGRESS_PROXY_URL`,
heredando `HTTPS_PROXY` vacía), no como literal (`a786c51dc`).

## Las piezas

| archivo | qué hace |
|---|---|
| `probes/record.json` | registro permanente: modelo, revisión, método, herramientas, procedencia; cada dato con su evidencia en los logs del volumen |
| `outputs/publication.json` | registro de publicación que escribe `bin/artifact-registry-publish-artifact`: referencia por digest y verificación |

Comando (vía `thyrox-bg`):

```bash
bash bin/artifact-registry-publish-artifact --volume thyrox-quantization-lab-artifacts \
  --repository th3rox/thyrox-quantization-lab-artifacts \
  --tag qwen2.5-0.5b-instruct-7ae5576-q8-q4km \
  --record-file <banco>/probes/record.json \
  --artifact-type application/vnd.thyrox.model-artifact.v1 \
  --out <banco>/outputs/publication.json
```

## Los resultados

| corrida | qué publicó | veredicto | causa |
|---|---|---|---|
| 1 | nada | `refused` (exit 2) | la admisión recibió un nombre y espera un PID (`a44339d94`) |
| 2 | nada | colgada, detenida | un `PUT` con cuerpo en flujo no recibe respuesta por el proxy (H-THYROX-303, `b1fa6665c`) |
| 3 | logs y `model-F16.gguf` (994 MB, 12,8 min) | `unpublished` (401) | venció el token Bearer de Docker Hub durante la subida (`8d195e025`) |
| 4 | variante Q4_K_M | **`verified`** | — |

Por directiva del ejecutor el artefacto es la **variante** que un consumidor
ejecuta, no el volumen: `outputs/publication-q4_k_m.json`.

```text
docker.io/th3rox/thyrox-quantization-lab-artifacts@sha256:5fc241502bc2db459c265adca0c9e9244944aba7d92dfc454fc0a2052bc013af
tag: qwen2.5-0.5b-instruct-7ae5576-q4_k_m
convert.log            31 400 bytes  verificado y descartado
model-Q4_K_M.gguf 397 807 712 bytes  verificado y descartado
quantize-Q4_K_M.log    65 130 bytes  verificado y descartado
pico de disco medido de la verificación: 397 897 728 bytes
```

El pico medido es el blob mayor más 90 016 bytes: la admisión por el blob
mayor (más el piso de 2 GiB) es el modelo correcto del método.

**Lo que esto autoriza y lo que no.** Sólo `model-Q4_K_M.gguf` y sus dos logs
son ya caché local. `model-F16.gguf`, `model-Q8_0.gguf` y `quantize-Q8_0.log`
siguen existiendo sólo en el volumen, así que el volumen **no** se puede
borrar hasta publicar y verificar esas variantes.

*Métrica:* estado del comando, digest publicado y la lista de blobs que el
trabajo de verificación materializó y comprobó contra su sha256.
*Ciega a:* la legibilidad desde otra red o cuenta: el consumidor es anónimo y
sin el almacenamiento de esta sesión, pero sale por el mismo proxy.
