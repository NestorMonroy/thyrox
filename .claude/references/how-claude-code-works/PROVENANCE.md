# `hccw` — procedencia y derechos

Creado: 2026-08-20T15:08:40
Origen: directiva del ejecutor 2026-08-20 — *"todos los que no tengan `LICENSE`
se van con [la declaración de derechos]"*.

## Este directorio NO lleva `LICENSE`, y su caso es el intermedio de los tres

No es el caso de `ccb` —cadena rota, ninguna licencia en ninguna parte— ni el de
`ccdoc`, que declara términos comerciales propios. Aquí hay una licencia
**afirmada** y **no portada**, que es una tercera cosa:

| Corpus | Qué declara la fuente | Qué llevamos |
|---|---|---|
| `ccb` | nada; paquete raíz `UNLICENSED` | nada — correcto |
| `ccdoc` | ToS comercial de Anthropic (para el SDK) | nada |
| **`hccw`** | **MIT © 2025 Windy3f3f3f3f** | **nada** — la afirmación, sin el archivo |

## Lo que se sabe de la cadena de procedencia

- Nuestro propio `index.md:14-15` declara la fuente y su licencia:
  `github.com/Windy3f3f3f3f/how-claude-code-works` · **MIT** · © 2025
  Windy3f3f3f3f. Es un hecho **registrado en el pase de vendorización**
  (2026-08-07), no re-verificado contra el upstream en este pase.
- **No se copió el archivo `LICENSE`** del upstream. Medido:
  `grep -rilE "licen[sc]e|copyright|all rights reserved"` sobre los 6 archivos
  del directorio → **0 archivos**. La única mención de la licencia en todo el
  árbol es la línea de `index.md`, que es prosa nuestra.
- El corpus vendorizado es **parcial**: 6 archivos de los 21 capítulos que el
  `index.md` declara. Lo que no está aquí no está bajo ninguna afirmación.

*Métrica:* archivos del directorio que mencionan licencia o copyright.
*Ciega a:* qué dice hoy el `LICENSE` del repositorio upstream — no se consultó
en este pase, así que la afirmación MIT vale como **registro de lo que se leyó
el 2026-08-07**, no como verificación de hoy.

## Consecuencia operativa

Aunque MIT sea permisiva, **una licencia que no viaja con el archivo no
acompaña al archivo**: MIT exige conservar el aviso de copyright y el texto de
la licencia en toda copia, y aquí no están. Por tanto, y hasta que se porte el
`LICENSE` con su aviso:

**Tratar la redistribución y todo reuso aguas abajo como sujetos a revisión
manual de derechos**, hasta que —y sólo si— se añada una licencia clara.

Aquí el corpus se usa como **referencia de lectura dentro del repositorio**: se
cita con el alias `hccw:` para fundar decisiones de diseño, igual que se cita
`odoo19c:`. Eso no es redistribución, pero tampoco es un permiso: si alguna vez
este material sale del repo, la revisión va **antes**.

**El cierre de este caso es barato y está nombrado:** portar el `LICENSE` MIT
del upstream con su aviso `© 2025 Windy3f3f3f3f`. No se hace en este pase
porque exige consultar el upstream, y este pase no lo consultó — declararlo
portado sin haberlo leído sería exactamente el defecto de :ref:`h-docs-146`.

## La premisa que hay que desmontar

**Visibilidad pública no es concesión de derechos de reuso.** La guía de
licenciamiento de GitHub lo dice explícitamente: un repositorio sin licencia
queda bajo las **reglas de copyright por defecto**, que son restrictivas — no
permisivas. Y su recíproca, que es la que aplica aquí: **una licencia permisiva
sin su aviso portado tampoco es un permiso portado.**

## Alcance de este documento

Este archivo **registra procedencia y riesgo**. No es asesoría legal ni
sustituye la revisión de un profesional calificado.
