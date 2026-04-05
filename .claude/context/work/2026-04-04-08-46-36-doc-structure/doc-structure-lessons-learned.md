```yml
ID work package: 2026-04-04-08-46-36-doc-structure
Fecha cierre: 2026-04-04
Proyecto: THYROX — PM-THYROX Framework
Fase de origen: Phase 1 — ANALYZE
Total lecciones: 4
Autor: Claude
```

# Lessons Learned: doc-structure — Separación .claude/ vs docs/ con adr_path configurable

## Propósito

Capturar qué aprendió el equipo durante este work package — qué funcionó, qué falló, y qué regla generalizable se puede extraer para no repetir el error o para replicar el éxito.

---

## Lecciones

### L-001: El default conservador resuelve R-002 sin decisión explícita del usuario

**Qué pasó**

R-002 planteaba que si el default para `adr_path` era `docs/architecture/decisions/`,
proyectos sin esa estructura recibirían un directorio `docs/` creado sin pedirlo.
La solución emergió naturalmente: THYROX se autodeclara como proyecto de retrocompat
usando `adr_path: .claude/context/decisions/` en su propio CLAUDE.md.

**Raíz**

El riesgo existía porque el default se asumía global. La solución fue hacer que cada
proyecto declare explícitamente su preferencia — convirtiendo el campo `adr_path` en
la única fuente de verdad.

**Fix aplicado**

CLAUDE.md de THYROX tiene `adr_path: .claude/context/decisions/` con comentario
explicando que es retrocompat. Nuevos proyectos usarán `docs/architecture/decisions/`
por defecto si no declaran nada (comportamiento del SKILL.md Phase 1 Step 8).

**Regla**

Cuando un default puede romper proyectos existentes, hacer que el proyecto se
auto-declare explícitamente en lugar de depender de detección automática — porque
la detección automática falla con edge cases.

---

### L-002: La instrucción SI/NO en SKILL.md es más robusta que la narrativa

**Qué pasó**

R-001 identificaba que Haiku podía ignorar instrucciones narrativas para leer
`adr_path`. La Phase 3 mitigó esto reformulando la instrucción como condicional
binaria en SKILL.md Phase 1 Step 8.

**Raíz**

Los LLMs de menor capacidad siguen instrucciones estructuradas (SI/NO, tablas)
mejor que párrafos descriptivos. Era un problema de formato de instrucción, no de
semántica.

**Fix aplicado**

SKILL.md Phase 1 Step 8 usa formato: "SI CLAUDE.md tiene `adr_path:` → usar esa
ruta. SI NO → usar `docs/architecture/decisions/`". Sin narrativa extra.

**Regla**

Cuando una instrucción del SKILL debe ser seguida por modelos de menor capacidad,
usar formato SI/NO o tabla, no párrafo. El formato determina la tasa de seguimiento.

---

### L-003: El stub sphinx/SKILL.md reveló un gap en la anatomía de tech skills

**Qué pasó**

T-005 pedía crear [SKILL](.claude/skills/sphinx/SKILL.md) como stub. Al crearlo, se
descubrió que no había un template estándar para tech skill stubs — se improvisó
con secciones `[PENDIENTE]`.

**Raíz**

El framework tiene `assets/` con templates para WP pero no para tech skills nuevos.
Los tech skills se crean ad-hoc sin estructura de arranque consistente.

**Fix aplicado**

Se creó el stub con estructura coherente (Purpose, Quick Reference, Phases, Setup).
No se creó un template genérico — quedó como deuda.

**Regla**

Cuando se añade un nuevo tipo de artefacto recurrente (tech skill stub), crear su
template en `assets/` antes de la segunda instancia — no después.

---

### L-004: El CHANGELOG como artefacto vivo requiere disciplina de versionado semántico por WP

**Qué pasó**

CHANGELOG.md ya tenía entradas `[0.7.0]` y `[0.7.1]` de WPs anteriores. Este WP
añade `[0.8.0]` como minor feature porque introduce `adr_path` configurable — un
cambio de comportamiento de framework sin breaking change.

**Raíz**

No había regla explícita para decidir si un WP incrementa patch, minor o major.
Se resolvió por juicio: cambio de comportamiento observable → minor.

**Fix aplicado**

Documentado en este lessons-learned. Candidato a regla en conventions.md.

**Regla**

Cuando un WP añade configurabilidad nueva (nuevo campo, nueva opción) → minor.
Cuando corrige comportamiento existente → patch. Cuando rompe compatibilidad → major.

---

## Patrones identificados

| Patrón | Lecciones relacionadas | Acción sistémica |
|--------|----------------------|------------------|
| Instrucciones multi-modelo | L-001, L-002 | Preferir formato SI/NO y tablas en SKILL.md para instrucciones críticas |
| Assets faltantes descubiertos en ejecución | L-003 | Revisar assets/ en Phase 4 (STRUCTURE) antes de planificar tareas |

---

## Qué replicar

- **adr_path como override por proyecto**: Patrón exitoso. Cada proyecto declara su ruta
  explícitamente y el SKILL respeta esa declaración. Aplicar a otros paths configurables
  futuros (ej. `changelog_path`, `docs_path`).

- **Checkpoints CP-1 y CP-2**: Los dos puntos de verificación (post Fase A y post Fase B)
  funcionaron bien para detectar errores antes del cierre. Mantener en WPs con 6+ tareas.

---

## Deuda pendiente

| ID | Descripción | Prioridad | Work package sugerido |
|----|-------------|-----------|----------------------|
| T-DT-001 | Template para tech skill stub en `assets/tech-skill.md.template` | Media | framework-cleanup |
| T-DT-002 | Regla de versionado semántico por tipo de WP en `references/conventions.md` | Baja | conventions-update |
| T-DT-003 | Completar secciones `[PENDIENTE]` en [SKILL](.claude/skills/sphinx/SKILL.md) | Media | sphinx-integration |

---

## Checklist de cierre

- [x] Cada lección tiene raíz identificada (no solo síntoma)
- [x] Cada lección tiene regla generalizable
- [x] Patrones sistémicos documentados si aplica
- [x] Deuda técnica registrada con prioridad
- [x] Documento commiteado en `work/.../lessons-learned.md`
