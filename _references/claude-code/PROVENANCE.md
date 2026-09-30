# `ccdoc` — procedencia y derechos

Creado: 2026-08-20T15:08:02
Origen: directiva del ejecutor 2026-08-20 — *"todos los que no tengan `LICENSE`
se van con [la declaración de derechos]"*.

## Este directorio NO declara licencia — pero la ausencia NO significa lo mismo que en `ccb`

`ccb` no tiene licencia **porque su cadena de procedencia está rota**. Aquí es
distinto, y la diferencia cambia el veredicto en la dirección **más**
restrictiva, no menos: **el propio corpus declara los términos que lo
gobiernan**.

Medido en el corpus, no de memoria (`.claude/references/claude-code/overview.md:78-80`):

```
## License and terms

Use of the Claude Agent SDK is governed by [Anthropic's Commercial Terms of
Service](https://www.anthropic.com/legal/commercial-terms), including when you
use it to power products and services that you make available to your own
customers and end users, except to the extent a specific component or
dependency is covered by a different license as indicated in that component's
LICENSE file.
```

*Métrica:* `grep -rilE "licen[sc]|copyright|all rights reserved"` sobre los 18
archivos del directorio → **1 archivo** (`overview.md`).
*Ciega a:* términos que apliquen a la **documentación** y no al SDK. La cita de
arriba gobierna el uso del *Claude Agent SDK*; **no** consta que sea la licencia
del texto de los documentos, que es lo que este directorio contiene.

## Lo que se sabe de la cadena de procedencia

- El corpus es la **documentación oficial de Claude Code**, copiada de
  `code.claude.com` (declarado en `index.md:13`). No es obra propia ni de un
  tercero anónimo: su titular es Anthropic.
- **No se copió ningún archivo `LICENSE`** con los documentos, y ninguno de los
  18 archivos declara una licencia para el **texto**.
- Lo único que el corpus declara son los **términos comerciales de servicio**
  citados arriba, y aplican al **SDK**, no necesariamente a la documentación.

## Consecuencia operativa

**Tratar la redistribución y todo reuso aguas abajo como sujetos a revisión
manual de derechos**, hasta que —y sólo si— se añada una licencia clara.

Aquí el corpus se usa como **referencia de lectura dentro del repositorio**: se
cita con el alias `ccdoc:` para fundar decisiones, igual que se cita `odoo19c:`.
Eso no es redistribución, pero tampoco es un permiso: si alguna vez este
material sale del repo, la revisión va **antes**.

## La premisa que hay que desmontar

**Visibilidad pública no es concesión de derechos de reuso.** La guía de
licenciamiento de GitHub lo dice explícitamente: un repositorio sin licencia
queda bajo las **reglas de copyright por defecto**, que son restrictivas — no
permisivas. Que una página sea legible sin autenticación no cambia quién es su
titular.

## Alcance de este documento

Este archivo **registra procedencia y riesgo**. No es asesoría legal ni
sustituye la revisión de un profesional calificado.
