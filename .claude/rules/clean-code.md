---
paths:
  - "src/**"
  - "tests/**"
  - "bin/**"
---

# Clean code — lo que el código tiene que decir por sí mismo

Fuente: *Clean Code2* (49 láminas, resumen en español de Robert C. Martin,
*Clean Code*), subido por el ejecutor el 2026-09-25 y extraído con
`bin/pdf_to_text` a `.claude/cache/clean-code-3-c-extraccion/`. Cada cláusula
de abajo cita su sección de la extracción; el texto completo se lee allí. La
regla carga sólo sobre código (`paths:`): no gobierna la prosa de `docs`.

## Cómo se lee junto a las demás reglas

No sustituye a ninguna, y dos de ellas ya la aplican con nombre propio:
`identificadores-en-ingles.md` es «usar nombres descriptivos» con un gate, y
la negativa del ejecutor a unificar los dos constructores de contexto de
`run-cli.ts` (2026-09-25) es SRP aplicado. Lo que esta regla añade es el
catálogo, para que la próxima decisión se tome contra él y no contra la
memoria.

## Comentarios

- **Un comentario compensa código que no se expresa.** Antes de escribirlo,
  intentar que el código lo diga: `employee.isEligibleForFullBenefits()` en
  vez de `// Check to see if the employee is eligible…` sobre una condición.
- **Los que sí valen:** la interfaz del módulo (docstring), la autoría y
  licencia, la **intención** que el código no puede mostrar (una regla de
  negocio, una decisión medida, un episodio) y la advertencia de
  consecuencias. En este árbol, el docstring que declara *qué mide y a qué es
  ciego* es de esta clase.
- **Los que no:** redundantes, desactualizados, historial de cambios (eso es
  `git log`) y **código comentado**: se borra, git lo conserva.

## Formato

- Metáfora del periódico: lo de alto nivel arriba, el detalle abajo.
- Una línea en blanco separa conceptos; lo relacionado va junto.
- **Separación vertical:** una función o variable se define cerca de donde
  se usa.
- El equipo fija la convención y todos la siguen (sección *General*,
  «Seguir las convenciones standard»).

## Manejo de errores

- Excepciones antes que códigos de error.
- **No devolver ni pasar `null`** sin razón: «si retornamos null, tiene que
  haber una razón» (*Ser preciso*). En este árbol su forma más cara es el
  cero que no distingue «no hay» de «no pude medir»: se rehúsa con exit 2
  (`evidencia-antes-de-afirmar.md`).
- Dar contexto al error: qué se intentaba y con qué entrada.

## Clases y funciones

- **Una cosa por función, una responsabilidad por clase (SRP).**
- **Pocos argumentos**; sin argumentos de salida.
- **Sin argumentos selectores** (banderas, enumerados que eligen camino):
  indican que la función hace más de una cosa.
- **Un solo nivel de abstracción** por función.
- **Envidia de comportamiento:** un método que opera sobre los datos de otra
  clase pertenece a esa clase.
- **Estáticos inapropiados:** si la función depende del estado de un objeto,
  no es estática.
- **Funciones y código muertos se borran.**

## Condiciones

- **Encapsular condiciones:** `if (shouldBeDeleted(timer))` antes que
  `if (timer.hasExpired() && !timer.isRecurrent())`.
- **Evitar negativas:** `shouldCompact()` antes que `!shouldNotCompact()`.
- **Variables explicativas** para los resultados intermedios y los límites
  (`nextLevel = level + 1`).
- **Polimorfismo antes que `if/else` o `switch` que crecen** (abierto/cerrado).
- **Números mágicos → constantes con nombre.**

## General

- **DRY.** La duplicación es la raíz; un concepto, un sitio.
- **Principio de la menor sorpresa:** una función hace lo que su nombre
  promete; «si hay efectos secundarios, indicarlos en el nombre».
- **Comportamiento en los límites:** se cubre con tests de todos los
  caminos, no con intuición.
- **Configuración en los niveles altos:** constantes y *settings* en un sitio
  fácil de encontrar, no enterradas en funciones de bajo nivel. En este árbol
  es `cache.paths.cache_dir()` y el `.env`, no un literal.
- **Sin navegación transitiva** (`a.getB().getC().doSomething()`).
- **Un lenguaje por archivo** cuando se puede evitar el incrustado.

## Nombres

Descriptivos, del nivel de abstracción del sitio donde viven, con la
nomenclatura estándar (nombres de patrón) cuando exista, sin codificaciones,
sin ambigüedad, y más largos cuanto mayor sea su alcance.

## Lo que esta regla NO decide

No tiene gate: un catálogo de *smells* no se detecta por sintaxis sin
falsos positivos. Lo que sí tiene gate está en su regla propia
(identificadores, cabecera de archivo). Y no deroga las formas del árbol que
parecen contradecirla: el docstring largo que declara métrica y ceguera es
un comentario de **intención**, que la fuente admite.
