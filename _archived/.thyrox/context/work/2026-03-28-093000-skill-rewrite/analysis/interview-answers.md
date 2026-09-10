```yml
Fecha: 2026-03-28
Tipo: Interview answers (skill-creator process)
```

# Interview Answers: pm-thyrox SKILL rewrite

## Respuestas del usuario

| Pregunta | Respuesta |
|----------|-----------|
| Assets | TODOS se usan |
| References | TODOS se usan |
| Audiencia | Template genérico (framework) |
| Idioma | Español |
| Scripts | Se usan, no experimentales |

## Meta-patrones de 14 proyectos (respuestas a Q1-Q3)

### Q1: ¿Fases explícitas o fluidas?

**EXPLÍCITAS con automatización opcional.**

Evidencia:
- spec-kit: usuario invoca `/speckit.specify` explícitamente
- agentic-framework: STATUS.md trackea fase, transiciones son deliberadas
- valet: status field en .beans/ es explícito (`todo | in_progress | done`)

**Para THYROX:** Las fases se nombran explícitamente. Cada work package tiene un `phase:` field. Pero el skill puede DETECTAR en qué fase está basándose en qué archivos existen en el work package.

### Q2: ¿Siempre crear work package?

**NO siempre — según umbral.**

| Duración | Qué crear |
|----------|-----------|
| <15 min | Nada. Inline work, commit directo. |
| 15-90 min | Lightweight: solo plan.md |
| 90+ min | Full package: spec.md + plan.md ± analysis/ ± lessons.md |
| Multi-feature | Epic con tasks.md |

Evidencia:
- spec-kit: feature dir solo cuando hay spec formal
- valet: beans solo para trabajo con acceptance criteria
- agentic-framework: F-NNNN solo para features formales

**Para THYROX:** Crear work package cuando:
1. Trabajo involucra múltiples archivos o fases
2. Tiene consecuencias de decisión (ADR-worthy)
3. >30 minutos
4. Produce lecciones o errores

### Q3: ¿ROADMAP update obligatorio?

**OPCIONAL.**

Solo 2/14 proyectos tienen roadmap equivalente. El tracking real es:
- `focus.md` — dirección actual (ya lo tenemos)
- `now.md` — estado de sesión (ya lo tenemos)
- Status field en work packages — `status: todo | in_progress | done`
- Git commits — audit trail automático

Evidencia:
- agentic-framework: usa STATUS + TODO + BACKLOG, no roadmap
- valet: status en .beans/, no roadmap
- spec-kit: checkboxes en tasks.md, no roadmap

**Para THYROX:** ROADMAP.md se actualiza cuando hay comunicación humano-a-humano (releases, milestones). No es obligatorio por sesión.

---

**Última actualización:** 2026-03-28
