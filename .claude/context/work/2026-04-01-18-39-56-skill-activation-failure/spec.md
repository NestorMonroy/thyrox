```yml
Tipo: Phase 2 — SOLUTION_STRATEGY
Work package: 2026-04-01-18-39-56-skill-activation-failure
Fecha: 2026-04-01
Status: draft
```

# Solution Strategy: SKILL Activation Failure + Haiku Compatibility

Problema raíz (Phase 1): El SKILL no se activa automáticamente en ningún modelo.
Problema secundario: Cuando se activa, los huecos implícitos hacen que Haiku
falle en múltiples puntos del flujo.

---

## 1. Key Ideas

### Idea 1: Dos problemas independientes, una solución coordinada

El fallo tiene dos capas que deben resolverse juntas:

- **Capa de activación** — El SKILL nunca se invoca (problema de CLAUDE.md)
- **Capa de instrucción** — Cuando se invoca, los huecos implícitos hacen fallar a Haiku (problema de SKILL.md)

Sonnet/Opus llenan los huecos solos. Haiku no puede. El objetivo es que ambas
capas funcionen sin depender de la capacidad de inferencia del modelo.

### Idea 2: CLAUDE.md como enforcement layer obligatorio

CLAUDE.md es el único archivo que **siempre se lee**. Debe ser donde se enforce
el uso del SKILL, no solo donde se menciona.

- Actual (mencionar): "Todo trabajo pasa por el SKILL" → ignorable
- Objetivo (enforcer): "ANTES de responder cualquier tarea: invocar Skill tool → pm-thyrox" → obligatorio

### Idea 3: Cada fase debe ser autocontenida

Una fase autocontenida tiene:
- **Entrada**: qué verificar antes de empezar
- **Pasos**: instrucciones atómicas (sin "cuando sea necesario", sin "si aplica")
- **Salida**: criterios verificables (no "hallazgos documentados" — eso es subjetivo)

Si el modelo necesita inferir para ejecutar un paso, ese paso fallará en Haiku.

### Idea 4: Templates son obligatorios, no sugestivos

Actual: "usar [template] como gate" → Haiku lo ignora (es sugerencia)
Objetivo: "REQUERIDO: completar [template] ANTES de avanzar" → no negociable

### Idea 5: Mecanismo de activación dual (push + pull)

- **Push** (ya existe): usuario escribe `/pm-thyrox` → Skill tool activa metodología
- **Pull** (no existe): CLAUDE.md instruye al modelo invocar Skill tool al recibir cualquier tarea

---

## 2. Research

### Unknown 1: ¿Cómo hacer que CLAUDE.md active el SKILL automáticamente?

**Alternativas:**

**Opción A: Instrucción directa + lenguaje fuerte en CLAUDE.md**
- Agregar "SIEMPRE invocar Skill tool → pm-thyrox ANTES de trabajar"
- Pros: Simple, no duplica contenido, aprovecha Skill tool existente
- Cons: Modelos menos capaces pueden no ejecutar el Skill tool correctamente

**Opción B: Incrustar flujo de 7 fases inline en CLAUDE.md (sin Skill tool)**
- Duplicar las fases directamente en CLAUDE.md
- Pros: Funciona con cualquier modelo, sin dependencia del Skill tool
- Cons: Duplica contenido, mantenimiento doble, CLAUDE.md se vuelve muy largo

**Opción C: Opción A + fallback inline (híbrido)**
- Instrucción de Skill tool + "Si el Skill tool no está disponible, leer SKILL.md y seguirlo"
- Pros: Cubre modelos capaces (Skill tool) y menos capaces (fallback)
- Cons: Ninguno significativo

**Decisión**: Opción C
Razón: Máxima cobertura de modelos sin duplicar contenido.

---

### Unknown 2: ¿Cuáles son TODOS los huecos implícitos del SKILL que Haiku no llena?

Inventario completo por fase:

#### Phase 1 — Huecos

**Hueco 1.1**: "Investigar requisitos, stakeholders, constraints y contexto"
- Haiku: no sabe qué preguntar, cuándo parar, qué formato usar
- Fix: Listar los 8 aspectos concretos directamente en Phase 1

**Hueco 1.2**: "Si hay decisiones arquitectónicas, crear ADR"
- Haiku: no sabe cuándo aplica — puede omitirlo siempre
- Fix: Definir explícitamente: cambio de stack, adopción de patrón nuevo, reemplazo de componente

**Hueco 1.3**: "Documentar hallazgos en work/.../analysis/" — ¿qué estructura?
- Haiku: crea un archivo libre o no crea nada
- Fix: "REQUERIDO: crear analysis/introduction.md usando [introduction.md.template]"

**Hueco 1.4**: "Salir cuando: Los hallazgos están documentados y aprobados"
- "Documentados" es subjetivo. Haiku puede declarar Phase 1 completa con 2 líneas
- Fix: Exit criteria verificable: "introduction.md existe Y no tiene [NEEDS CLARIFICATION]"

#### Phase 2 — Huecos

**Hueco 2.1**: No dice "leer solution-strategy.md PRIMERO"
- Haiku: empieza sin leerlo, usa estructura inventada
- Fix: Agregar como PASO 0 explícito: "Leer [solution-strategy](references/solution-strategy.md) ANTES de empezar (REQUERIDO)"

**Hueco 2.2**: "Key Ideas — definir conceptos centrales" — ¿a partir de qué?
- Haiku: puede inventar ideas sin basarse en Phase 1
- Fix: "Basarse en los hallazgos de work/.../analysis/ para definir Key Ideas"

#### Phase 3 — Huecos

**Hueco 3.1**: "Verificar que el work package existe (creado en Phase 1)"
- Haiku: no sabe cómo verificar
- Fix: "Verificar: `ls context/work/` — si no existe, volver a Phase 1"

#### Phase 4 — Huecos

**Hueco 4.1**: "Usar spec-quality-checklist.md.template como gate"
- "Como gate" es débil. Haiku lo ignora
- Fix: "REQUERIDO: completar [spec-quality-checklist.md.template] antes de Phase 5. No avanzar si hay items sin ✓"

**Hueco 4.2**: Sin exit criteria verificable
- Fix: "spec.md existe Y no tiene marcadores [NEEDS CLARIFICATION]"

#### Phase 5 — Huecos

**Hueco 5.1**: "Leer spec.md del work package" — ¿cuál work package activo?
- Haiku: puede no saber cuál es el work package activo
- Fix: "Leer el work package activo: el directorio más reciente en context/work/"

#### Phase 6 — Huecos

**Hueco 6.1**: "Tomar siguiente tarea sin bloqueos" — ¿de dónde?
- Haiku: no sabe de dónde tomar tareas
- Fix: "Leer work/.../plan.md y tomar la primera tarea `- [ ] [T-NNN]` sin bloqueos"

**Hueco 6.2**: "Si falla, crear ERR-NNN antes de reintentar"
- No dice qué poner dentro, no menciona error-report.md.template
- Fix: "Crear context/errors/ERR-NNN-descripcion.md usando [error-report.md.template]"

**Hueco 6.3**: Numeración duplicada (dos pasos "4" en Phase 6)
- Confunde a Haiku sobre cuántos pasos hay
- Fix: Renumerar correctamente 1→6

#### Escalabilidad — Hueco transversal

**Hueco E.1**: "Trabajos <2h usan fases 1, 2, 6, 7" — ¿qué significa "usar"?
- Haiku: ¿saltarlas? ¿hacerlas igual? ¿combinarlas?
- Fix: Tabla explícita con qué hacer en cada tamaño de trabajo

---

### Unknown 3: ¿Resuelven estos fixes el problema de Haiku sin romper Sonnet/Opus?

**De prompting-tips.md**: Instrucciones explícitas mejoran todos los modelos.
No hay riesgo de degradación — la explicitez ayuda a Haiku sin perjudicar Sonnet/Opus.

**Riesgo real**: Si los cambios son muy verbosos, el contexto crece.
**Mitigación**: Los fixes son líneas adicionales mínimas. SKILL.md pasaría de ~200 a ~250 líneas — aceptable.

---

### Unknown 4: ¿Hay inconsistencias adicionales a corregir?

**examples.md desactualizado**:
- Usa nomenclatura diferente: Phase 1=PLAN, Phase 3=DECOMPOSE (vs. ANALYZE, PLAN actual)
- Haiku que lea examples.md aprende un flujo incorrecto
- Decisión: fuera de scope de esta iteración. Crear issue separado.

---

## 3. Pre-design check

| Locked Decision | ¿Respetada? | Nota |
|----------------|-------------|------|
| ANALYZE first | ✓ | No cambia |
| Markdown only | ✓ | Solo cambios en .md |
| Git as persistence | ✓ | No se crean backups |
| Single skill | ✓ | No se crean skills nuevos |
| Conventional Commits | ✓ | No cambia |
| Work packages with timestamp | ✓ corregido | Renombrado con timestamp real |

Sin violaciones. Seguir.

---

## 4. Decisions

### Decisión 1: CLAUDE.md — activación obligatoria con fallback

**Cambio concreto en "Flujo de sesión":**

```markdown
## Flujo de sesión — OBLIGATORIO

SIEMPRE seguir este flujo antes de trabajar en cualquier tarea:

1. **Inicio** — Leer focus.md + now.md + ROADMAP.md
2. **Activar SKILL** — Invocar Skill tool → pm-thyrox ANTES de responder cualquier tarea.
   Si el Skill tool no está disponible: leer SKILL.md completo y seguirlo paso a paso.
3. **Identificar fase activa** — Revisar context/work/:
   - Hay work package activo → continuar en la fase donde quedó
   - No hay work package → empezar Phase 1: ANALYZE
4. **Trabajar** — Seguir cada fase hasta su exit criteria. NO saltarse fases.
5. **Cierre** — Actualizar focus.md + now.md
```

**Justificación**: Lenguaje imperativo (`SIEMPRE`, `OBLIGATORIO`, `ANTES`, `NO saltarse`)
+ fallback para cuando el Skill tool no esté disponible.

---

### Decisión 2: SKILL.md — corregir TODOS los huecos identificados

Cambios por fase (todos los huecos del Unknown 2):

**Phase 1:**
- Reemplazar "Investigar requisitos..." con los 8 aspectos nombrados explícitamente (H1.1)
- Definir qué cuenta como decisión arquitectónica con 3 ejemplos concretos (H1.2)
- Cambiar referencia a introduction.md.template de sugestiva a `REQUERIDO:` (H1.3)
- Agregar exit criteria verificable: "introduction.md existe Y sin [NEEDS CLARIFICATION]" (H1.4)

**Phase 2:**
- Agregar PASO 0: "Leer [solution-strategy](references/solution-strategy.md) ANTES de empezar (REQUERIDO)" (H2.1)
- Aclarar que Key Ideas deben basarse en analysis/ de Phase 1 (H2.2)

**Phase 3:**
- Agregar cómo verificar work package: `ls context/work/` (H3.1)

**Phase 4:**
- Cambiar "como gate" por "REQUERIDO: completar antes de Phase 5" (H4.1)
- Agregar exit criteria verificable (H4.2)

**Phase 5:**
- Aclarar cómo identificar work package activo: más reciente en context/work/ (H5.1)

**Phase 6:**
- Especificar fuente de tareas: "plan.md del work package activo" (H6.1)
- Especificar cómo crear ERR-NNN: ruta + template (H6.2)
- Corregir numeración duplicada (H6.3)

**Escalabilidad:**
- Agregar tabla explícita: tamaño de trabajo → qué fases → cómo ejecutarlas (HE.1)

---

### Decisión 3: Work package — Phase 1 es la única fuente de verdad

- Phase 1: "Crear work package" → ya está, es correcto
- Phase 3: cambiar a "Verificar que existe el work package creado en Phase 1"
- Tabla de artefactos: sin cambios (Phase 1 → Work package ya está correcto)

---

### Decisión 4: examples.md — fuera de scope, deuda técnica

No bloquea el problema principal. Documentar como pendiente para siguiente iteración.

---

### Decisión 5: NO reescribir SKILL.md completamente

Cambios quirúrgicos y aditivos. Evals actuales: 40/40 (100%).
Cambios mínimos = riesgo mínimo de romper lo que funciona.

---

## 5. Post-design re-check

### Huecos de Haiku cubiertos

| Hueco | Decisión | Cerrado |
|-------|----------|---------|
| SKILL no se activa | D1: CLAUDE.md obligatorio | ✓ |
| H1.1: qué investigar en Phase 1 | D2: 8 aspectos explícitos | ✓ |
| H1.2: cuándo crear ADR | D2: definición explícita | ✓ |
| H1.3: qué crear en analysis/ | D2: REQUERIDO + template | ✓ |
| H1.4: exit criteria vago | D2: criterio verificable | ✓ |
| H2.1: no lee solution-strategy | D2: PASO 0 explícito | ✓ |
| H2.2: Key Ideas sin base | D2: referencia a analysis/ | ✓ |
| H3.1: verificación de WP vaga | D2+D3: cómo verificar | ✓ |
| H4.1: template sugestivo | D2: REQUERIDO | ✓ |
| H4.2: exit criteria vago | D2: criterio verificable | ✓ |
| H5.1: WP activo ambiguo | D2: cómo identificarlo | ✓ |
| H6.1: de dónde tomar tareas | D2: plan.md explícito | ✓ |
| H6.2: ERR-NNN vago | D2: ruta + template | ✓ |
| H6.3: numeración duplicada | D2: corrección | ✓ |
| HE.1: escalabilidad ambigua | D2: tabla explícita | ✓ |
| examples.md desactualizado | D4: fuera de scope | ⚠ deuda |

### Comportamiento esperado de Haiku después de los cambios

- ✓ Activa el SKILL por instrucción en CLAUDE.md (no por inferencia)
- ✓ Crea work package en Phase 1 con timestamp real
- ✓ Usa introduction.md.template (REQUERIDO, no sugestión)
- ✓ Verifica exit criteria antes de avanzar de fase
- ✓ Lee solution-strategy.md antes de empezar Phase 2
- ✓ Sabe de dónde tomar tareas en Phase 6
- ✓ Documenta errores con el template correcto

### Riesgos residuales

- **Riesgo 1**: Cambios en CLAUDE.md afectan sesiones activas
  → Mitigación: Cambios aditivos, no destructivos

- **Riesgo 2**: SKILL.md más verboso usa más tokens de contexto
  → Mitigación: ~50 líneas adicionales en ~200 actuales — aceptable

- **Riesgo 3**: examples.md sigue confundiendo (fuera de scope)
  → Mitigación: Deuda técnica documentada, no bloquea el fix principal

---

## Artefactos a modificar

```
Cambiar:
  .claude/CLAUDE.md                               ← D1: activación
  .claude/skills/pm-thyrox/SKILL.md               ← D2+D3: todos los huecos

Fuera de scope:
  .claude/skills/pm-thyrox/references/examples.md ← D4: deuda técnica
```

---

## Checklist de Validación (solution-strategy.md)

- [x] Key Ideas identificadas y articuladas
- [x] Research con pros/cons por cada unknown
- [x] Pre-design check contra Locked Decisions
- [x] Decisiones fundamentales documentadas con justificación
- [x] Alternativas consideradas
- [x] Post-design re-check: todos los huecos cubiertos
- [x] Riesgos identificados
- [x] Scope acotado con deuda técnica documentada
