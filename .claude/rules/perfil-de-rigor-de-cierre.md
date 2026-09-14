# El rigor de cierre es un parámetro, no una constante — el cableado es del consumidor

Origen: directiva del ejecutor 2026-09-13 — *"no existe una única medida para
determinar si una solución de programación es buena; depende del contexto...
no vamos a quitar `porte-completo-no-parcial.md`, `principio-rector-rup-
arquitectura.md`, `hallazgos-documentacion-obligatoria.md`, sino crear nuevas
para poder elegir una u otra"*, corregida en el mismo intercambio: *"eso ya lo
decide el CONSUMER, el PROVIDER solo da las HERRAMIENTAS"*.

## El problema que esta regla resuelve

Tres reglas —hoy vividas en `kaupamex-*`, no en este árbol— exigen un piso de
evidencia y completitud caro en tokens: `porte-completo-no-parcial.md` (todo
símbolo se porta o declara su divergencia), `principio-rector-rup-
arquitectura.md` Cláusula 5 (prohíbe "PARCIAL JUSTIFICADO" sin barrido de 8
capas) y `hallazgos-documentacion-obligatoria.md` (cita PROVEN por archivo).

Su prosa se lee como universal y no lo es: la Cláusula 4/5 enumera **rutas
concretas de un producto concreto** (`docs/source/requisitos/casos-uso/`, …), y
`porte-completo-no-parcial.md` presupone una **referencia externa canónica**
(Odoo, vía `odoo-tools`) contra la que medir completitud. Ese rigor es correcto
donde existe esa referencia y el costo de un error es alto (un SaaS de
producción con dinero real). THYROX es el proveedor de metodología para
**cualquier** dominio que un consumidor decida construir — no todos tienen una
referencia externa que gobierne cada decisión, y forzar el mismo piso ahí
gasta tokens sin comprar la garantía que los justifica.

## La regla

**El rigor de cierre es un eje declarado, `:rigor:`, ortogonal a `:flow:`
(DEC-R-01).** Dos valores:

| Valor | Qué exige |
|---|---|
| `estricto` (default si no se declara nada — ningún consumidor actual cambia de comportamiento) | Las tres reglas citadas aplican tal cual, sin relajación. |
| `exploratorio` | Ver la tabla de abajo — cada relajación es explícita, no "menos rigor" genérico. |

Bajo `exploratorio`:

- **`porte-completo-no-parcial.md`** — un símbolo no portado no exige
  declarar los tres desenlaces de esa regla en el mismo pase; basta un
  comentario `// pendiente: <qué falta, por qué>` en el archivo. Sigue
  prohibido omitirlo en silencio — la diferencia es la forma de declarar, no
  si se declara.
- **`principio-rector-rup-arquitectura.md` Cláusula 5** — "PARCIAL
  JUSTIFICADO" es un cierre válido si nombra qué falta y la condición que lo
  completaría (mismo criterio que esa regla ya admite para un `DESCONOCIDO`
  con condición de cierre — se extiende a un cierre en general, no sólo a un
  hallazgo). El barrido de 8 capas dejar de ser obligatorio para cerrar.
- **`hallazgos-documentacion-obligatoria.md`** — un hallazgo puede
  registrarse con un resumen de una línea y sin cita `file:line` exhaustiva
  por archivo; sigue habiendo registro (no desaparece la trazabilidad),
  cambia su costo de producción.

## El cableado es DEL CONSUMIDOR — thyrox no lo fija

Dónde se declara `:rigor:` (CLAUDE.md del repo, metadata de la iniciativa
junto a `:flow:`, ambos con uno sobreescribiendo al otro, o cualquier otro
mecanismo) **no lo decide esta regla**. Es el mismo principio que DEC-04 ya
aplica a otros mecanismos de este árbol ("su cableado es parámetro del
consumidor, no del proveedor"): cada consumidor tiene su propia forma de
resolver dónde vive un parámetro de sesión, y thyrox sólo garantiza que el
*valor* `exploratorio` signifique lo mismo en cualquiera de ellos.

**Ausencia de declaración = `estricto`.** Es el default seguro: ningún
consumidor existente (kaupamex-api con odoo-tools como referencia) cambia de
comportamiento por la sola existencia de este archivo. Un consumidor nuevo,
sin referencia externa que gobierne sus decisiones, es candidato a declarar
`exploratorio` — la decisión de si aplica es suya, no de thyrox.

## Relación con otras reglas

- `principio-rector-rup-arquitectura.md` Cláusula 7 ya reconoce fronteras de
  aplicación por marco (RUP rector sólo en trabajo design-heavy); esta regla
  es el mismo principio aplicado al eje de completitud/evidencia en vez de al
  de metodología.
- `metadata-standards.md` DEC-R-01 (`:flow:`) es el precedente directo: un
  eje declarado, con default y valores canónicos, resuelto por el consumidor.
- No deroga ni edita `porte-completo-no-parcial.md`,
  `principio-rector-rup-arquitectura.md` ni `hallazgos-documentacion-
  obligatoria.md` — las tres siguen vigentes sin cambios; esta regla es la
  llave que las hace condicionales, leída junto a ellas.
