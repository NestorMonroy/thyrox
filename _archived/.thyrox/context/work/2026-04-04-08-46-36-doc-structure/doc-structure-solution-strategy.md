```yml
Fecha estrategia: 2026-04-04
Proyecto: THYROX — PM-THYROX Framework
Versión arquitectura: 1.0
Estado: Propuesta
```

# Solution Strategy: doc-structure

## Propósito

Definir cómo separar los artefactos de Claude (efímeros) de los artefactos del
proyecto (permanentes) mediante un campo configurable `adr_path` en CLAUDE.md,
y cómo introducir el stub del tech skill `sphinx` siguiendo ADR-012.

---

## Key Ideas

### Idea 1: Separación por audiencia — .claude/ vs docs/

**Descripción:**
Dos tipos de artefactos conviven hoy en `.claude/`: contexto de sesión (efímero,
solo Claude) y ADRs del proyecto (permanentes, valor para todo el equipo).
La separación no es de formato sino de audiencia y durabilidad.

**Impacto:**
- `.claude/` queda como espacio exclusivo de Claude (work packages, focus, now)
- `docs/` se convierte en la fuente canónica de documentación entregable
- Herramientas como Sphinx pueden indexar `docs/` sin configuración especial
- Un nuevo desarrollador encuentra la documentación donde espera encontrarla

### Idea 2: adr_path configurable — portabilidad sin cambiar SKILL.md

**Descripción:**
El campo `adr_path` en CLAUDE.md permite que cada proyecto declare su propia
convención de documentación. SKILL.md Phase 1 Step 8 lee ese campo; si no
existe, usa el default `docs/architecture/decisions/`.

**Impacto:**
- SKILL.md es completamente portátil entre proyectos
- THYROX puede mantener `.claude/context/decisions/` declarándolo como su `adr_path`
- Proyectos nuevos arrancan con el default que ya produce `docs/` correcto
- Haiku puede seguir la regla SI/NO sin ambigüedad

### Idea 3: Tech skills separados — ADR-012 aplicado a Sphinx

**Descripción:**
pm-thyrox gestiona metodología (SDLC, fases, artefactos). Sphinx gestiona
documentación técnica (conf.py, RST, estructura docs/, build). Siguiendo ADR-012,
Sphinx se implementa como tech skill separado con stub inicial en este WP.

**Impacto:**
- pm-thyrox no acumula responsabilidades de herramientas específicas
- El skill sphinx puede evolucionar independientemente
- Otros proyectos pueden usar pm-thyrox sin Sphinx si no lo necesitan

---

## Research

### Unknown 1: ¿Dónde vive `adr_path` en CLAUDE.md?

| Alternativa | Pros | Cons |
|-------------|------|------|
| A: YAML frontmatter | Parseable, compacto | Haiku no siempre lee el frontmatter primero |
| B: Nueva sección `## Configuración del Proyecto` | Visible, patrón ya existe en CLAUDE.md, fácil para Haiku | Un nivel más de lectura |
| C: Inline en sección Estructura | Sin archivo extra | Difícil de leer para modelos menores |

**Decisión:** Opción B — nueva sección `## Configuración del Proyecto` en CLAUDE.md.
Haiku encuentra secciones H2 fiablemente. Sigue el patrón del documento existente.

### Unknown 2: ¿Cómo actualiza SKILL.md Phase 1 Step 8?

| Alternativa | Pros | Cons |
|-------------|------|------|
| A: Regla SI/NO explícita | Clara para todos los modelos | Texto más largo |
| B: Solo mencionar default | Más corto | Proyectos con convención propia quedan sin guía |
| C: Leer CLAUDE.md dinámicamente | Flexible | Complejo, propenso a errores en Haiku |

**Decisión:** Opción A — regla SI/NO:
```
SI CLAUDE.md tiene campo adr_path → escribir ADRs ahí
SI NO → escribir en docs/architecture/decisions/ (default)
```

### Unknown 3: ¿Qué contiene el stub del skill sphinx?

| Alternativa | Pros | Cons |
|-------------|------|------|
| A: Solo SKILL.md con frontmatter y propósito | Mínimo viable, siguente WP lo completa | Sin guía de estructura |
| B: SKILL.md + references/ stub + assets/ stub | Estructura visible, navegable | Más archivos vacíos |
| C: SKILL.md con secciones placeholder | Indica qué se implementará | Sin archivos reales |

**Decisión:** Opción C — SKILL.md con secciones placeholder marcadas `[PENDIENTE]`.
El stub indica la intención y scope sin crear archivos vacíos. Un WP separado
implementa el contenido completo.

---

## Pre-design check

Verificación contra principios del proyecto:

| Principio | ¿Se respeta? |
|-----------|-------------|
| ADR-001 Markdown only | ✓ Todo en .md |
| ADR-004 Single skill | ✓ pm-thyrox no se divide; sphinx es NUEVO skill |
| ADR-008 Git as persistence | ✓ No archivos backup |
| ADR-011 Anatomía oficial | ✓ SKILL.md + references/ + assets/ para sphinx |
| ADR-012 (implícito) tech skills separados | ✓ sphinx como skill independiente |
| No romper THYROX | ✓ adr_path permite mantener .claude/context/decisions/ |

---

## Decisions

### Decision 1: Nueva sección `## Configuración del Proyecto` en CLAUDE.md

**Alternatives considered:**
- YAML frontmatter — parcialmente invisible para Haiku
- Documentar solo en SKILL.md — no es portátil por proyecto

**Justification:**
Sección H2 es el patrón dominante en CLAUDE.md. Haiku la localiza con grep.
El campo `adr_path` tiene un default documentado que elimina ambigüedad.

**Implications:**
- CLAUDE.md requiere un bloque nuevo (5-8 líneas)
- Proyectos existentes no se rompen — si no tienen la sección, Phase 1 usa default
- CLAUDE.md de THYROX declara su propio path para retrocompatibilidad

```yaml
## Configuración del Proyecto

adr_path: docs/architecture/decisions/   # default — cambiar si el proyecto usa otra convención
```

### Decision 2: Actualizar SKILL.md Phase 1 Step 8 con regla SI/NO

**Alternatives considered:**
- Hardcodear nuevo default sin regla — pierde flexibilidad retrocompat
- Eliminar instrucción de ubicación — deja a Claude decidir sin guía

**Justification:**
La regla SI/NO es el patrón más fiable para modelos de menor capacidad (Haiku).
Una instrucción condicional clara produce comportamiento consistente.

**Implications:**
- SKILL.md crece ~3 líneas en Phase 1 Step 8
- THYROX puede seguir con su path actual declarándolo en CLAUDE.md

### Decision 3: Crear stub de tech skill `sphinx`

**Alternatives considered:**
- Documentar Sphinx en pm-thyrox/references/ — viola separación de responsabilidades
- Implementar skill completo en este WP — out of scope, complejidad alta

**Justification:**
ADR-012 establece que cada herramienta técnica tiene su propio skill. El stub
crea la estructura y señala el scope sin implementar todo el contenido.

**Implications:**
- [SKILL](.claude/skills/sphinx/SKILL.md) se crea en este WP con secciones `[PENDIENTE]`
- Un WP posterior implementa referencias/, assets/, y contenido completo
- El stub es suficiente para que Claude sepa que el skill existe

### Decision 4: Crear estructura `docs/` mínima en THYROX

**Alternatives considered:**
- Solo actualizar CLAUDE.md + SKILL.md sin crear docs/ — incompleto como ejemplo
- Crear docs/ con contenido real — out of scope de este WP

**Justification:**
THYROX es el proyecto de referencia del framework. Si el framework dicta que
`docs/architecture/decisions/` existe, THYROX debe tener esa estructura.
Los ADRs existentes NO se migran (eso es un WP separado).

**Implications:**
- Se crea [README](docs/architecture/decisions/README.md) como placeholder
- El directorio es visible y navegable para Sphinx en el futuro
- No hay migración de ADRs existentes en este WP

---

## Post-design re-check

| Verificación | Resultado |
|-------------|-----------|
| ¿Rompe retrocompat de THYROX? | No — CLAUDE.md declarará `.claude/context/decisions/` como su `adr_path` |
| ¿SKILL.md queda portátil? | Sí — la regla SI/NO no referencia IDs de THYROX |
| ¿Sphinx puede indexar docs/? | Sí — `docs/` es directorio visible, estructura estándar |
| ¿Haiku puede seguir la regla? | Sí — SI/NO con grep a CLAUDE.md |
| ¿El stub de sphinx sigue ADR-012? | Sí — SKILL.md + estructura mínima |
| ¿Algún ADR nuevo necesario? | Sí — ADR-013: docs/ como documentación canónica del proyecto |

---

## Artefactos a producir (Phase 3+)

| Artefacto | Tipo | Ubicación |
|-----------|------|-----------|
| Nueva sección en CLAUDE.md | Modificación | [CLAUDE](.claude/CLAUDE.md) |
| SKILL.md Phase 1 Step 8 | Modificación | [SKILL](.claude/skills/pm-thyrox/SKILL.md) |
| CLAUDE.md Locked Decisions limpio | Modificación | [CLAUDE](.claude/CLAUDE.md) |
| Stub sphinx skill | Creación | [SKILL](.claude/skills/sphinx/SKILL.md) |
| Estructura docs/ mínima | Creación | [README](docs/architecture/decisions/README.md) |
| ADR-013 | Creación | [adr-013](.claude/context/decisions/adr-013.md) |

---

## Validation Checklist

- [x] Key ideas claramente articuladas (3 ideas)
- [x] Decisiones fundamentales documentadas (4 decisiones)
- [x] Alternativas consideradas para cada decisión
- [x] Justificaciones claras
- [x] Pre-design check contra ADRs existentes
- [x] Post-design re-check completado
- [x] Trazable a Phase 1 (H-001 a H-007)
- [x] Guía clara para Phase 3: PLAN (6 artefactos identificados)
