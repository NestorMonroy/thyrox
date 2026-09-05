```yml
type: Lecciones Aprendidas
work_package: 2026-04-07-03-08-03-parallel-agent-conventions
created_at: 2026-04-07 05:34:03
status: Completado
phase: Phase 7 — TRACK
total_lessons: 6
```

# Lecciones Aprendidas: parallel-agent-conventions

### L-044 — Convergencia independiente valida gaps reales

**Contexto:** Durante Phase 1 paralela, ambos agentes (WP-1 y WP-2) identificaron de forma independiente las mismas 5 instancias de fricción: timestamps colisionados, now.md obsoleto, ROADMAP desactualizado, ausencia de mecanismo de descubrimiento de pares, y workarounds ad-hoc adoptados sin coordinación.

**Aprendizaje:** La convergencia sin coordinación entre agentes es evidencia fuerte de que los gaps son reales y no artefactos de perspectiva individual. Si dos agentes ejecutando en paralelo llegan a los mismos problemas de forma independiente, la señal supera el ruido.

**Acción:** Usar la convergencia inter-agente como criterio de validación de requisitos en futuros WPs paralelos. Cuando dos agentes reportan el mismo problema sin haberse comunicado, priorizarlo como gap crítico.

---

### L-045 — Timeouts con tareas en `[~]` son el gap más crítico

**Contexto:** Durante Phase 3 y Phase 4 de este WP se produjeron 2 timeouts que dejaron claims en estado `[~]` sin resolver. El flujo quedó bloqueado hasta intervención manual. Este gap no estaba anticipado en el plan original — emergió por dogfooding.

**Aprendizaje:** Un agente que muere con tareas en `[~]` bloquea el flujo de forma silenciosa. No hay señal de error visible; el task-plan simplemente queda con tareas reclamadas que nadie está ejecutando. Este es el modo de falla más peligroso del claim protocol.

**Acción:** T-012 (recovery de claims huérfanos) fue creada directamente por esta evidencia y documentada en `references/conventions.md` con umbral de 30 minutos y protocolo de liberación manual. Prioridad Alta confirmada por dogfooding.

---

### L-046 — La longitud del prompt determina el riesgo de timeout

**Contexto:** Los prompts >2000 palabras con múltiples archivos a leer presentaron timeouts en 2 ocasiones. Prompts focalizados con <800 palabras y referencias a archivos específicos completaron en <100ms.

**Aprendizaje:** La longitud del prompt de un agente no es solo un factor de legibilidad — es un factor determinante de viabilidad de ejecución. Prompts largos con instrucciones de lectura múltiple aumentan el riesgo de timeout antes de que el agente produzca output útil.

**Acción:** Al diseñar prompts para task-executor en ejecución paralela, mantener <800 palabras con referencias a archivos específicos (no directorios completos). Dividir tareas complejas en prompts focalizados antes de asignarlos.

---

### L-047 — `<!-- SECTION OWNER -->` previene conflictos de merge en archivos compartidos

**Contexto:** WP-1 y WP-2 modificaron simultáneamente `SKILL.md` y `conventions.md` en secciones distintas, usando el mecanismo de markers `<!-- SECTION OWNER: {wp} -->`. No se produjeron conflictos de merge.

**Aprendizaje:** El mecanismo de section ownership funciona correctamente para edición concurrente de archivos compartidos. La granularidad de claim a nivel de sección (no de archivo completo) es la clave — permite paralelismo real sin coordinación bloqueante.

**Acción:** El mecanismo está documentado en `conventions.md` y en las notas de Phase 5/6 de `SKILL.md`. Mantener el patrón como convención obligatoria para cualquier WP que modifique archivos del framework en paralelo.

---

### L-048 — El formato `[~]` es intuitivo y adoptable sin entrenamiento

**Contexto:** El agente task-executor adoptó espontáneamente la convención `[~]` durante Phase 6, marcando sus propias tareas como `[x] @task-executor (done: timestamp)` sin instrucciones explícitas sobre el formato exacto.

**Aprendizaje:** Un formato de estado que un agente adopta espontáneamente y de forma correcta es un buen indicador de que el diseño es intuitivo. No requirió entrenamiento especial ni correcciones posteriores — el agente infirió el patrón del contexto disponible.

**Acción:** Validado: el formato `[~]` + `@agent-id` + `timestamp` no necesita documentación extensa para ser adoptado. Documentarlo en `tasks.md.template` como formato canónico es suficiente. No agregar friction con instrucciones redundantes.

---

### L-049 — El dogfooding produce requisitos más precisos que la especulación

**Contexto:** T-012 (recovery de claims abandonados) no existía en el plan original de este WP. Emergió como tarea de prioridad Alta directamente de los 2 timeouts observados durante la ejecución del propio WP.

**Aprendizaje:** Construir las convenciones mientras se usan produce requisitos que la especulación previa no puede anticipar. El costo de descubrir un gap en producción (timeout, claim bloqueado) es mayor que el costo de documentarlo cuando emerge, pero menor que haberlo ignorado.

**Acción:** Para futuros WPs de framework: incluir explícitamente una fase de dogfooding antes de cerrar Phase 5 (DECOMPOSE). Si el WP mismo utiliza las convenciones que está construyendo, los gaps que emerjan durante la ejecución deben convertirse en tareas adicionales con prioridad Alta antes de cerrar Phase 6 (EXECUTE).
