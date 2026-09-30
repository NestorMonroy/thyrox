```yml
Fecha: 2026-03-28
Tipo: Phase 1 (ANALYZE)
```

# Análisis: Generalización de THYROX como Template Reutilizable

## Hallazgos Clave

**85-90% del contenido ya es genérico.** Solo ~40-50 ubicaciones necesitan cambio.

## Categorías de cambio

### 1. MUST CHANGE — Nombre del proyecto (find-and-replace)

| Patrón | Ocurrencias estimadas | Archivos |
|--------|----------------------|----------|
| `THYROX` (nombre) | ~30 | CLAUDE.md, README, ARCHITECTURE, CONTRIBUTING, CHANGELOG, project-state, references |
| `pm-thyrox` (skill name) | ~5 | SKILL.md, CLAUDE.md, scripts |
| `PM-THYROX` | ~10 | references (commit-helper, examples, conventions) |
| Acrónimo expandido | 1 | README.md |

### 2. MUST CHANGE — Historia específica del proyecto

| Archivo | Qué limpiar |
|---------|------------|
| `project-state.md` | Proyectos completados, fechas específicas |
| [CHANGELOG](CHANGELOG.md) | Entradas de v0.1.0 y v0.2.0 |
| [ROADMAP](ROADMAP.md) | Tareas completadas con fechas |
| `context/decisions/` | 12 ADRs son metodología (reutilizables), solo limpiar "proyecto THYROX" en contexto |
| `context/errors/` | 28 ERRs son taxonomía genérica (reutilizables), limpiar "framework THYROX" |

### 3. SHOULD CHANGE — Ejemplos domain-specific en templates

| Template | Ejemplo actual | Debe ser |
|----------|---------------|----------|
| `epic.md.template` | "User Authentication System" | `[Feature Name]` |
| `requirements-analysis.md.template` | "User Registration" | `[Requirement Example]` |
| `stakeholders.md.template` | "End User / Shopper" | `[User Role]` |
| `context.md.template` | "Analytics DB" | `[System Component]` |

### 4. NO CHANGE — Ya genérico

- SKILL.md (95% genérico, solo nombre)
- 16/20 references (metodología pura)
- 28/32 templates (estructura genérica)
- Scripts de validación (código reutilizable)
- Estructura de directorios
- Work packages pattern
- Español/bilingüe (diseño intencional)

## Decisión sobre work packages existentes

Los `context/work/` contienen historia de THYROX (14 work packages). Para el template:
- **Opción A:** Eliminar todos (template limpio)
- **Opción B:** Mantener 1-2 como ejemplo
- **Opción C:** Mover a `_examples/` como referencia

## Estrategia propuesta

1. **No renombrar el skill** — `pm-thyrox` es el nombre de este template específico. Quien lo use puede renombrarlo.
2. **Crear `TEMPLATE_SETUP.md`** con instrucciones de personalización (search-and-replace guide)
3. **Limpiar archivos de estado** — project-state, ROADMAP, CHANGELOG se resetean
4. **NO limpiar work packages** — son git history, no archivos del template distribuible
5. **El template distribuible es solo:** `.claude/skills/pm-thyrox/` + [CLAUDE](.claude/CLAUDE.md) + archivos raíz
