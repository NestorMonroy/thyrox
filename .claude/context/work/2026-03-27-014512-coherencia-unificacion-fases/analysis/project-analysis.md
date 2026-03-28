```yml
Tipo: Análisis de Proyecto
Categoría: Revisión de Coherencia
Versión: 1.0
Fecha: 2026-03-27
Propósito: Evaluar si el proyecto THYROX tiene sentido y si el flujo se entiende
```

# Análisis de Coherencia - THYROX

## Resumen Ejecutivo

THYROX tiene una **base sólida como framework de documentación y gestión de proyectos**, pero presenta **problemas críticos de coherencia** que dificultan entender el flujo. El proyecto funciona bien como esqueleto conceptual, pero no como guía práctica ejecutable.

**Veredicto:** El concepto es bueno, pero la ejecución documental tiene contradicciones que confunden al usuario.

---

## 1. Lo que funciona bien

- **Estructura de carpetas** bien organizada (.claude/, references/, templates/, tracking/)
- **19 archivos de referencia** completos y presentes al 100%
- **25 templates** disponibles y funcionales
- **Conventional Commits** bien documentados y consistentes
- **ROADMAP.md como fuente de verdad** es una decisión clara y práctica
- **ADRs (Architecture Decision Records)** bien estructurados (9 decisiones documentadas)
- **Escalabilidad por complejidad** (pequeño/mediano/grande) es un diferenciador útil

---

## 2. Problemas Críticos

### 2.1 TRES ordenamientos de fases diferentes

Este es el problema más grave. El flujo de 7 fases aparece con **tres órdenes distintos** en el mismo proyecto:

**Orden A — SKILL.md (líneas 46-63):**
```
1. ANALYZE           → Requisitos, Stakeholders
2. SOLUTION_STRATEGY → Plan arquitectónico
3. PLAN              → Brainstorm, ROADMAP
4. STRUCTURE         → PRDs o Spec-Driven
5. DECOMPOSE         → Descomponer en tasks
6. EXECUTE           → Implementar
7. TRACK             → Monitorear
```

**Orden B — SKILL.md tabla de comandos (líneas 491-500):**
```
1. PLAN              → "plan X feature"
2. STRUCTURE         → "create a PRD for X"
3. DECOMPOSE         → "break down X"
4/5. (varios)        → "mark X done"
5. TRACK             → "what's next?"
```

**Orden C — project-state.md (líneas 67-74):**
```
1. PLAN              → Scope inicial
2. ANALYZE           → Requisitos
3. SOLUTION          → Arquitectura
4. STRUCTURE         → Specs
5. DECOMPOSE         → Tasks
6. EXECUTE           → Implementación
7. TRACK             → Cierre
```

**Impacto:** Un usuario no sabe con cuál empezar. ¿Primero analiza o primero planifica?

### 2.2 Spec-Driven Development anidado dentro de Phase 4

SKILL.md Phase 4 (STRUCTURE) contiene un sub-workflow de 4 fases propias:
```
FASE 1: Requirements
FASE 2: Design
FASE 3: Tasks
FASE 4: Implementation
```

Esto crea confusión: ¿Es "FASE 2: Design" la misma que "Phase 2: SOLUTION_STRATEGY"? No, pero la numeración sugiere que sí.

### 2.3 Estado del proyecto vs documentación

| Aspecto | README dice | ROADMAP dice | Realidad |
|---------|-------------|--------------|----------|
| Completitud | Estructura lista | 7.5% completo | Es un template, no un producto |
| api/ | Sub-proyecto existente | Phase 2 (no iniciada) | Solo tiene README.md |
| build/ | Sub-proyecto existente | Phase 3 (no iniciada) | Solo tiene README.md |
| CHANGELOG | v0.1.0 con features | Lista features que no existen | Placeholder |
| Automatización | "Changelog automático" | Phase 4 (no iniciada) | No hay scripts de automatización |

---

## 3. Problemas Estructurales

### 3.1 Archivos fantasma (referenciados pero no existen)

| Referencia | Dónde se menciona | Estado |
|------------|-------------------|--------|
| `.claude/prds/` | SKILL.md líneas 201, 243, 519 | **No existe** |
| `api/src/` | api/README.md | **No existe** |
| `build/src/` | build/README.md | **No existe** |
| `build/scripts/`, `build/config/` | build/README.md | **No existe** |

### 3.2 Ubicación incorrecta de archivos

| Archivo | Documentado en | Ubicación real |
|---------|---------------|----------------|
| ARCHITECTURE.md | docs/ | raíz del proyecto |
| CONTRIBUTING.md | docs/ | raíz del proyecto |
| CLAUDE.md | raíz (según CLAUDE.md) | .claude/CLAUDE.md |

### 3.3 Archivos huérfanos (existen pero no están integrados)

Los archivos en `.claude/utils/` no aparecen en la documentación principal:
- STANDARDIZATION_REPORT.md
- VALIDATE-REFERENCES-GUIDE.md (2 versiones)
- VALIDATION-ANALYSIS.md
- validate-references.py

### 3.4 START-HERE.md tiene contenido incorrecto

Este archivo debería ser la puerta de entrada al proyecto pero contiene **output de un script de validación**, no documentación introductoria.

---

## 4. Inconsistencias de fechas

| Archivo | Fecha mostrada | Fecha esperada |
|---------|---------------|----------------|
| CLAUDE.md (footer) | 2025-03-24 | 2026-03-27 |
| CLAUDE.md (YAML) | 2026-03-25 | 2026-03-27 |
| ROADMAP.md (tareas) | 2025-03-24 | Debería ser 2026 |
| decisions.md (ADRs) | 2025-03-24 | Debería ser 2026 |
| README.md (footer) | 2025-03-24 | 2026-03-27 |

---

## 5. Redundancias

Contenido duplicado entre archivos:

| Tema | Aparece en | Duplicación |
|------|-----------|-------------|
| Conventional Commits | SKILL.md + conventions.md + CLAUDE.md + CONTRIBUTING.md | 4 lugares |
| Formato ROADMAP | SKILL.md + conventions.md + CLAUDE.md | 3 lugares |
| Changelog generation | SKILL.md + conventions.md | 2 lugares |
| Task management | SKILL.md + conventions.md | 2 lugares |

---

## 6. Mezcla de idiomas

El proyecto alterna entre español e inglés sin criterio claro:

- **SKILL.md:** Inglés (secciones principales) + Español (recursos avanzados)
- **CLAUDE.md:** Español
- **conventions.md:** Inglés
- **ROADMAP.md:** Español
- **README.md:** Español
- **ARCHITECTURE.md:** Español con términos inglés
- **Referencias:** Mezcla variable

---

## 7. Diagrama del flujo actual (cómo se entiende)

```
Usuario llega → README.md
                    ↓
         ¿Qué hago primero?
                    ↓
    ┌───────────────┼───────────────┐
    ↓               ↓               ↓
SKILL.md dice:  project-state    CLAUDE.md dice:
"1. ANALYZE"    dice:            "Revisar ROADMAP"
                "1. PLAN"
    ↓               ↓               ↓
  CONFUSIÓN ← ← ← ← ← ← ← ← ← CONFUSIÓN

    ↓ (si el usuario persiste)

Phase 4: STRUCTURE
    ↓
¿Simple PRD o Spec-Driven?
    ↓
Spec-Driven tiene 4 FASES propias
    ↓
¿Son las mismas fases? → NO, pero parecen serlo
    ↓
  MÁS CONFUSIÓN
```

---

## 8. Recomendaciones

### Prioridad CRÍTICA

1. **Unificar el orden de fases** — Elegir UN solo orden y actualizar SKILL.md, project-state.md, y la tabla de comandos
2. **Renumerar Spec-Driven** — Usar "Step 1-4" en vez de "FASE 1-4" para evitar confusión con las 7 fases principales
3. **Crear directorio `.claude/prds/`** — Es referenciado múltiples veces pero no existe

### Prioridad ALTA

4. **Sincronizar estado real vs documentación** — CHANGELOG y README no deben listar features que no existen
5. **Corregir fechas** — Actualizar todos los footers a 2026
6. **Reescribir START-HERE.md** — Debe ser una introducción real, no output de validación
7. **Mover o documentar ARCHITECTURE.md y CONTRIBUTING.md** — Están en la raíz pero se documentan en docs/

### Prioridad MEDIA

8. **Definir política de idioma** — Español para docs de usuario, inglés para docs técnicos (o viceversa)
9. **Consolidar redundancias** — Conventional Commits debería estar en UN lugar con links desde los demás
10. **Limpiar utils/** — Integrar o documentar los archivos de validación

---

## Conclusión

THYROX como **concepto** es sólido: un framework reutilizable para gestión de proyectos con Claude Code. El problema no es la idea, sino la **ejecución documental**:

- El flujo de 7 fases **tiene sentido** pero la numeración inconsistente lo hace inaccesible
- La estructura de archivos **es buena** pero hay fantasmas y huérfanos
- La documentación **es abundante** pero redundante y contradictoria en puntos clave

**Próximo paso recomendado:** Resolver el problema #1 (unificar fases) ya que es la base de todo el framework.
