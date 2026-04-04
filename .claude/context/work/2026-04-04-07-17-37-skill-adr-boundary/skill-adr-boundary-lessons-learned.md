```yml
Tipo: Lessons Learned
Fase: 7 - TRACK
WP: 2026-04-04-07-17-37-skill-adr-boundary
Fecha: 2026-04-04
```

# Lessons Learned — skill-adr-boundary

## L-030 — Los flujos deben mostrar lo que falla, no solo el camino feliz

Los primeros flujos del WP eran lineales: inicio -> proceso -> exito. El usuario
identifico que esto no refleja la realidad. Un flujo util para Haiku debe mostrar:
- Que pasa cuando una capa no se activa
- Que pasa cuando el stop hook no existe
- Loops de retorno cuando algo no encaja
- La pregunta "consultar con el usuario" como salida legitima

Accion: Siempre diagramar el camino de fallo antes de considerar el flujo completo.

## L-031 — Mermaid es el estandar del proyecto, no ASCII

El proyecto ya usaba mermaid en SKILL.md, voltfactory-design y technical-debt strategy.
Sin embargo, al crear flujos en la solution strategy se uso ASCII art por defecto.
El template `solution-strategy.md.template` tampoco lo muestra (T-DT-006).

Accion: Al crear cualquier flujo o diagrama, usar `mermaid flowchart TD` directamente.
No usar ASCII. No esperar que el usuario lo corrija.

## L-032 — El template es la primera fuente de verdad para convenciones

Cuando el template no muestra mermaid, es facil olvidar que el proyecto lo usa.
La deuda T-DT-006 existe porque el template y la practica divergieron.

Accion: Si una convencion no esta en el template, registrarla como deuda tecnica
inmediatamente (no al final del WP).

## L-034 — El plan debe mapear cada RC a una tarea concreta, no a una seccion

En Phase 2 se dijo "CLAUDE.md resuelve RC-001 y RC-003." En Phase 3 el plan solo
capturo una tarea ("nueva seccion SKILL vs ADR") que resuelve RC-001. RC-003 requeria
una accion distinta (modificar "Locked Decisions") pero no se convirtio en tarea
separada. Phase 6 implemento el plan fielmente — el plan era incompleto.

Accion: Al cerrar Phase 3, verificar que cada RC de prioridad Alta o Media tenga
al menos una tarea con verbo + archivo + criterio concreto. Si una RC aparece solo
en la narrativa de Phase 2 sin tarea asociada, es un gap.

## L-033 — Boundary statements deben estar donde el modelo llega primero

CLAUDE.md se lee antes que SKILL.md. Una regla en SKILL.md puede llegar tarde
si el modelo trabaja sin activar el SKILL. Por eso la Capa 1 (CLAUDE.md) es la
mas importante de las 3 para modelos como Haiku.

Accion: Para reglas criticas de orientacion, ponerlas en CLAUDE.md primero,
luego reforzar en SKILL.md como capa de redundancia.
