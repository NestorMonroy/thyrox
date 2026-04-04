```yml
Tipo: Solution Strategy
Fase: 2 - SOLUTION_STRATEGY
WP: 2026-04-04-07-17-37-skill-adr-boundary
Fecha: 2026-04-04
```

# Solution Strategy — skill-adr-boundary

## Key Ideas (desde Phase 1)

1. **Boundary no existe:** No hay ningún texto en ningún archivo que diga explícitamente qué es SKILL vs qué es ADR.
2. **Haiku no infiere, necesita reglas atómicas:** La solución debe ser SI/NO, no narrativa.
3. **CLAUDE.md se lee primero:** Es el punto de entrada Level 2 — es el mejor lugar para el boundary primario.
4. **El stop hook es local:** No puede ser parte de la solución portátil.

---

## Alternativas evaluadas

### Opción A — Solo `adr-guide.md` (nueva referencia)

Crear `references/adr-guide.md` con reglas SI/NO y que SKILL.md lo referencie.

**Pros:**
- Separación de concerns: SKILL.md no crece
- La guía puede tener ejemplos detallados

**Contras:**
- Haiku sigue un link solo si SKILL.md dice REQUERIDO — y actualmente no lo hace
- Requiere que el modelo lea un archivo extra bajo demanda
- No resuelve RC-001 (boundary statement) en el punto de entrada

**Veredicto:** Útil como complemento, insuficiente como solución primaria.

---

### Opción B — Solo fix en SKILL.md (inline)

Reemplazar Step 8 de Phase 1 con reglas SI/NO. Agregar sección "SKILL vs ADR" al inicio.

**Pros:**
- Todo en un archivo
- SKILL.md ya es el motor; Haiku lo lee

**Contras:**
- SKILL.md crece (ya es largo)
- La boundary statement llega tarde — SKILL.md se activa después de CLAUDE.md
- No tiene efecto si el modelo no activa el SKILL correctamente

**Veredicto:** Necesario pero no suficiente como única capa.

---

### Opción C — Solo CLAUDE.md

Agregar sección `## Boundary: SKILL vs ADR` a CLAUDE.md con 4-6 líneas de reglas atómicas.

**Pros:**
- CLAUDE.md se lee SIEMPRE, PRIMERO, por cualquier modelo
- Mínima superficie de cambio
- Haiku no puede saltarse este punto de entrada

**Contras:**
- CLAUDE.md no puede tener todo el detalle de ejemplos
- No resuelve la ambigüedad del trigger en SKILL.md Phase 1

**Veredicto:** Mejor capa primaria, pero necesita apoyo en SKILL.md.

---

### Opción D — Tres capas: CLAUDE.md + SKILL.md + adr.md.template ✓ ELEGIDA

**Capa 1 — CLAUDE.md** (boundary primario, siempre leído):
- Nueva sección `## SKILL vs ADR — Regla de uso` con 2 reglas atómicas en formato tabla

**Capa 2 — SKILL.md Phase 1** (trigger operacional):
- Reemplazar Step 8 vago con tabla SI/NO de 4 filas + ejemplos concretos

**Capa 3 — adr.md.template** (artefacto auto-descriptivo):
- Agregar campo `Uso:` en frontmatter que diga "Solo para decisiones permanentes de arquitectura"

**Pros:**
- Tres puntos de contacto independientes — si Haiku falla en uno, los otros compensan
- RC-007 cumplido: cada capa usa formato atómico, no narrativa
- Cambios son aditivos — no rompe nada existente
- CLAUDE.md resuelve RC-001 y RC-003; SKILL.md resuelve RC-002; template resuelve RC-006

**Contras:**
- 3 archivos modificados en lugar de 1
- El campo `Uso:` en el template solo ayuda si el modelo lee el template antes de crear el ADR

**Veredicto:** Mejor cobertura con menor riesgo. Elegida.

---

## Decisión arquitectónica

> **No crear `adr-guide.md`.** La guía completa va inline en las capas existentes.
> Un archivo extra que Haiku debe seguir mediante link introduce una dependencia frágil.
> Toda regla que Haiku necesita debe estar en archivos que ya lee de forma garantizada.

---

## Diseño de cada capa (detalle)

### Capa 1 — CLAUDE.md: nueva sección

Ubicación: después de `## Locked Decisions`, antes de `## Estructura`.

```markdown
## SKILL vs ADR — Regla de uso

| | SKILL.md | ADR en context/decisions/ |
|---|---|---|
| **Qué es** | Instrucciones de metodología (cómo trabajar) | Registro de decisiones tomadas (por qué se eligió X) |
| **Quién lo escribe** | Mantenedor del framework | Claude durante Phase 1–2, cuando hay decisión permanente |
| **Cuándo modificar** | Solo si cambia la metodología de gestión | Al tomar una nueva decisión arquitectónica del proyecto |
| **Duración** | Vive con el framework | Inmutable una vez aprobado |

REGLA: Si la duda es "¿documento esto en SKILL.md o en un ADR?":
- Cambia CÓMO se trabaja → SKILL.md
- Registra POR QUÉ se eligió algo en el proyecto → ADR
```

### Capa 2 — SKILL.md Phase 1 Step 8: trigger atómico

Reemplazar:
> "Si hay decisión arquitectónica (cambio de stack tecnológico, adopción de patrón nuevo como microservicios o event-driven, o reemplazo de componente principal), crear ADR"

Por tabla SI/NO:

```markdown
8. **ADR:** Crear en `context/decisions/adr-NNN.md` usando [adr.md.template](assets/adr.md.template) SOLO SI:
   - ✅ SÍ: cambio de stack tecnológico (lenguaje, DB, framework principal)
   - ✅ SÍ: adopción de nuevo patrón arquitectónico (microservicios, event-driven, CQRS)
   - ✅ SÍ: reemplazo de componente principal del sistema
   - ✅ SÍ: decisión que afecta todos los work packages futuros
   - ❌ NO: convención de naming, formato de archivo, template nuevo
   - ❌ NO: decisión que solo afecta el WP actual
   - ❌ NO: cambios a la metodología de gestión (eso va en SKILL.md)
```

### Capa 3 — adr.md.template: frontmatter auto-descriptivo

Agregar campo `Uso:` en el bloque YAML del template:

```yaml
Uso: Solo para decisiones arquitectónicas permanentes del PROYECTO (stack, patrones, componentes).
     NO usar para decisiones de metodología — esas van en SKILL.md.
```

---

## Pre-design check

| Principio | ¿Se respeta? |
|-----------|-------------|
| ADR-001 Markdown only | ✓ — Todo en Markdown |
| ADR-008 Git as persistence | ✓ — Cambios en archivos versionados |
| ADR-010 ANALYZE first | ✓ — Phase 1 completada antes |
| RC-007 Reglas atómicas | ✓ — Formato tabla SI/NO, no narrativa |
| Cambios aditivos (no romper) | ✓ — Secciones nuevas, no reemplazos de estructura |

---

## Post-design check

- La Capa 1 (CLAUDE.md) funciona sin que Haiku active el SKILL
- La Capa 2 (SKILL.md) funciona incluso si Haiku no lee CLAUDE.md
- La Capa 3 (template) es educativa, no crítica
- Los tres cambios son independientes — pueden fallar individualmente sin romper los otros

---

## Criterio de éxito de esta fase

Arquitectura aprobada con 3 capas definidas, diseño inline de cada cambio, y pre/post-design check pasado.
