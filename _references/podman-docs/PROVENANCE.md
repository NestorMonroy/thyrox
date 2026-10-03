# `podman-docs` — procedencia y para qué sirve

Creado: 2026-10-03T02:28:00
Origen: el ejecutor lo entregó en la sesión `333534ce-407f-55f0-b451-e1feb02581ab`
como `podman-main-docs.7z` (621 677 bytes; 606 archivos al descomprimir), con
el encargo de analizar la comunicación entre contenedores.

## Qué es

El directorio `docs/` de la rama principal de Podman: páginas de manual en
Markdown (`source/markdown/`, con sus archivos de opciones compartidos en
`options/`), los tutoriales (`tutorials/basic_networking.md`,
`rootless_tutorial.md`, `socket_activation.md`, `performance.md`) y el soporte
de Kubernetes. Licencia del proyecto Podman (Apache-2.0).

## Por qué vive aquí

Es la referencia contra la que se decide cómo materializa la primitiva
(`@thyrox/podman-execution`) redes, pods y montajes; no es producto ni estado.
Rama `main`: lo que describe puede ser posterior a la versión instalada en el
anfitrión (Podman 4.9.3), y cada uso se contrasta con el comportamiento medido.

Primer uso: `.claude/workbench/podman-inter-container-communication-20261003T022754/`.
