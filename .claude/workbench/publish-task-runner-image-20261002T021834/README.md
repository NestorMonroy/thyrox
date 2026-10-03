# publish-task-runner-image

## El encargo

> «expuesto, no debe usarse hasta rotarlo ? usalo» (ejecutor, 2026-10-02):
> autoriza publicar con la credencial de publicación aunque esté marcada
> expuesta.

TASK-THYROX-0724: que el entorno de build no quede grabado en la imagen, que es
lo que impedía publicarla.

## La premisa, si se corrigio al primer comando

La credencial no era el único bloqueo. La promoción (`promoteCandidate`)
rehúsa una imagen cuyo historial graba `HTTPS_PROXY=…`, y `build-image` pasaba
el proxy como `--build-arg`: Podman lo graba con su valor en la historia de
cada RUN. Además `build-image` fijaba siempre `lifecycle=cache`, y sólo una
candidata `permanent` se promueve.

Primer intento descartado: `--omit-history` en `buildImage`. Quita el proxy,
pero una imagen así no sirve de base de otra: `FROM` sobre ella falla con
`history lists 0 non-empty layers, but we have 4 layers on disk`
(`outputs/relabel.log`).

## Las piezas

| archivo | que hace |
|---|---|
| `src/packages/podman-execution/executionCommand.ts` | el proxy deja de ser argumento de build (`podman build --http-proxy`, activo por defecto, lo reenvía a cada RUN sin grabarlo); `--lifecycle cache|permanent` |
| `src/packages/podman-execution/__tests__/executionCommand.test.ts` | 4 casos de `build-image` |
| `probes/publish_image.ts` | `promoteCandidate` → `publishPromotedImage` con la credencial del `.env` |
| `probes/verify_anonymous.ts` | HEAD anónimo del manifiesto por etiqueta y pull por ese digest |

## Los resultados

- RED: 3 de los 4 casos nuevos fallan antes del cambio; GREEN: podman-execution 196 de 196.
- Build real por la primitiva con egreso: exit 0; líneas de historia con un
  valor de proxy: **0** (`outputs/candidate.history.txt`); ciclo de vida `permanent`.
- Validación en una unidad: 12 herramientas presentes, bun 1.3.11, uv 0.8.17,
  Python 3.12.3 (`outputs/validation.log`).
- Publicada: `docker.io/th3rox/thyrox-task-runner:ubuntu24.04-bun1.3.11-uv0.8.17`
  → `sha256:1cced65c16b40c7ac5fc73a6908ce0353ec450618251cac1893ef8c82ad25ba5`.
- Verificación anónima: el registro sirve ese digest para la etiqueta, el pull
  por digest funciona y la imagen corre por digest en una unidad
  (`outputs/anonymous-verification.json`, `outputs/run-by-digest.log`).
- Hallazgo lateral H-THYROX-312: `resolve` del registro OCI devolvió
  `sha256:e6981bd…`, el digest del almacén local, que el registro no sirve
  (404). Sucesor: TASK-THYROX-0756.

*Metrica:* exit de build, `podman history` buscando `NOMBRE=` de proxy,
`docker-content-digest` del registro.
*Ciega a:* una variable de entorno de build distinta del proxy; la imagen
`localhost/thyrox-task-runner:dev` sigue siendo la vieja y la primitiva la usa
por defecto: no se cambió la imagen por defecto.
