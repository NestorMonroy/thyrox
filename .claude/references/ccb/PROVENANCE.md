# `ccb` — procedencia y derechos

Creado: 2026-08-13T18:54:56
Origen: directiva del ejecutor 2026-08-13, que **revierte** la licencia MIT
añadida horas antes en este mismo directorio.

## Este directorio NO declara licencia, y la ausencia es deliberada

No es un descuido pendiente de arreglar. Es el estado correcto mientras los
derechos no estén aclarados, y borrar el `LICENSE` que había es parte de la
corrección, no un olvido.

## Lo que se sabe de la cadena de procedencia

- El repositorio de origen **no declara** un archivo `LICENSE`, y su paquete
  raíz está marcado `UNLICENSED`.
- El paquete npm de Claude Code cuyo *sourcemap* sirvió de línea base **no
  expone metadatos de licencia** por la API de repositorios de GitHub.
- El fork vendorizado `bun-demincer` procede igualmente de un repositorio
  **sin licencia declarada**. El pie de su README que decía `MIT` **no estaba
  respaldado** por ningún archivo de licencia upstream, y fue retirado.

## Consecuencia operativa

**Tratar la redistribución y todo reuso aguas abajo como sujetos a revisión
manual de derechos**, hasta que —y sólo si— se añada una licencia clara.

Aquí el corpus se usa como **referencia de lectura dentro del repositorio**:
se cita con el alias `ccb:` para fundar decisiones de diseño, igual que se
cita `odoo19c:`. Eso no es redistribución, pero tampoco es un permiso: si
alguna vez este material sale del repo, la revisión va **antes**.

## La premisa que hay que desmontar

**Visibilidad pública no es concesión de derechos de reuso.** La guía de
licenciamiento de GitHub lo dice explícitamente: un repositorio sin licencia
queda bajo las **reglas de copyright por defecto**, que son restrictivas —
no permisivas.

## Alcance de este documento

Este archivo **registra procedencia y riesgo**. No es asesoría legal ni
sustituye la revisión de un profesional calificado.

## Historial de la corrección

| Cuándo | Qué |
|---|---|
| 2026-08-13T18:06:49 | Se añadió `LICENSE` MIT © Nestor Monroy y cabecera `SPDX-License-Identifier: MIT` en `bgDaemon.ts`, sobre una autoría declarada en conversación. |
| 2026-08-13T18:54:56 | **Revertido por directiva del ejecutor.** `LICENSE` eliminado, cabecera SPDX retirada, y este documento en su lugar. |

