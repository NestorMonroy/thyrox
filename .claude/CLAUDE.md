```yml
Tipo: Contexto Persistente
Categoría: Memoria del Proyecto
Versión: 1.0
Propósito: Contexto permanente para Claude Code en proyecto THYROX
Objetivo: Proporcionar memoria compartida entre sesiones de Claude Code
Fecha actualización: 2026-03-25
```

# CLAUDE.md - Contexto Persistente THYROX

## Propósito

Archivo de contexto persistente para Claude Code en el proyecto THYROX. Proporciona información crítica sobre estructura, convenciones, y estado actual.

> Objetivo: Que Claude recuerde estructura, decisiones, y contexto del proyecto entre sesiones.

---

## Descripción

Este archivo contiene el contexto permanente para Claude Code en el proyecto THYROX.

---

## PROYECTO

**Nombre:** THYROX Template
**Descripción:** Framework profesional para gestión de proyectos con Claude Code
**Acercamiento:** Acrónimo = Tracking Hierarchy Yield Roadmap Organization eXecution
**Repositorio:** /home/thyrox
**Estado:** En Desarrollo (v0.1.0)

---

## OBJETIVO

Crear un template reutilizable que permita:

1. Gestión automática de proyectos con Claude Code
2. Documentación auto-generada desde cambios
3. Tracking de changelog desde commits convencionales
4. Estructura lista para APIs y builds
5. Workflows claros y repetibles

---

## ESTRUCTURA DEL PROYECTO

```
thyrox/
├── README.md                 # Presentación
├── ROADMAP.md               # Plan maestro (actualizar en cada sesión)
├── CHANGELOG.md             # Historial (auto-generado)
├── CLAUDE.md                # Este archivo
├── .claude/                 # Configuración Claude Code
│   ├── context/             # Estado del proyecto
│   ├── skills/              # Comandos personalizados
│   ├── prds/                # Product Requirements
│   └── epics/               # Epics y tasks
├── docs/                    # Documentación pública
│   ├── API.md
│   ├── BUILD.md
│   ├── ARCHITECTURE.md
│   └── CONTRIBUTING.md
├── api/                     # Sub-proyecto: API
├── build/                   # Sub-proyecto: Build
└── .gitignore
```

---

## CONVENCIONES

### Git Commits

Usar **Conventional Commits**:

```
feat(scope): descripción breve
fix(scope): descripción breve
docs(scope): descripción breve
refactor(scope): descripción breve
test(scope): descripción breve
chore(scope): descripción breve
```

**Ejemplos válidos:**
- `feat(api): agregar endpoint GET /users`
- `fix(build): resolver error en GitHub Actions`
- `docs(readme): actualizar instrucciones`
- `refactor(api): extraer validación a módulo`

**Reglas:**
- Primera línea < 72 caracteres
- Presente imperativo ("add" no "added")
- Sin punto final

### ROADMAP.md

Estados de progreso:
- `[ ]` = Pendiente
- `[-]` = En Progreso
- `[x]` = Completado (YYYY-MM-DD)

Siempre actualizar al completar tareas.

### Branches

```
main          - Producción estable
develop       - Rama de integración
feature/*     - Nuevas funcionalidades
bugfix/*      - Correcciones
docs/*        - Cambios de documentación
```

### Versionado

Usar **Semantic Versioning**:
- MAJOR.MINOR.PATCH (ej: 0.1.0)
- Actualizar en: ROADMAP.md, CHANGELOG.md, package.json (si aplica)

---

## METODOLOGÍA: 7 FASES

El motor del proyecto es el **SKILL** ([pm-thyrox](skills/pm-thyrox/SKILL.md)). Define un flujo de 7 fases SDLC:

```
Phase 1: ANALYZE           → Entender requisitos, stakeholders, contexto
Phase 2: SOLUTION_STRATEGY → Plan arquitectónico, decisiones técnicas
Phase 3: PLAN              → Scope, brainstorm, actualizar ROADMAP.md
Phase 4: STRUCTURE         → PRDs o Spec-Driven docs (opcional)
Phase 5: DECOMPOSE         → Descomponer en tasks atómicas
Phase 6: EXECUTE           → Implementar + commits convencionales
Phase 7: TRACK             → Monitorear, changelog, cierre
```

**Siempre empezar por ANALYZE.** No planificar sin entender primero.

Para proyectos pequeños (<2h): usar fases 1, 2, 6, 7.
Para proyectos grandes (8h+): usar las 7 fases completas.

Ver [SKILL](skills/pm-thyrox/SKILL.md) para proceso detallado de cada fase.

---

## FLUJO DE SESIÓN

### 1. Inicio

```bash
cd /home/thyrox && claude
```

### 2. Contexto

- Revisar ROADMAP.md (estado actual)
- Revisar [AD_HOC_TASKS](skills/pm-thyrox/tracking/AD_HOC_TASKS.md) si hay
- Identificar en qué fase estamos

### 3. Trabajar

- Seguir la fase correspondiente del [SKILL](skills/pm-thyrox/SKILL.md)
- Commits con Conventional Commits
- Actualizar ROADMAP.md al completar items

### 4. Cerrar sesión

- Verificar checklist (abajo)
- Documentar progreso en work-logs si aplica

---

## ESTRUCTURA DE CARPETAS

### `.claude/` — Motor del proyecto

**skills/pm-thyrox/** - El SKILL principal
- [SKILL](skills/pm-thyrox/SKILL.md) - Metodología de 7 fases (leer primero)
- `references/` - 19 guías de referencia por fase
- `templates/` - 25 templates para documentos
- `tracking/` - [AD_HOC_TASKS](skills/pm-thyrox/tracking/AD_HOC_TASKS.md), [REFACTORS](skills/pm-thyrox/tracking/REFACTORS.md)
- `epics/` - Ejemplo: [example-epic/epic](skills/pm-thyrox/epics/example-epic/epic.md)

**context/** - Estado del proyecto
- [project-state](context/project-state.md) - Contexto general
- [decisions](context/decisions.md) - Decisiones arquitectónicas
- `work-logs/` - Bitácora de sesiones

### `docs/`

Documentación pública y técnica:
- **API.md** - Endpoints, autenticación, ejemplos
- **BUILD.md** - Compilación, deployment
- **ARCHITECTURE.md** - Decisiones técnicas
- **CONTRIBUTING.md** - Cómo contribuir

### `api/` y `build/`

Sub-proyectos independientes:
- Cada uno tiene su propio README.md
- Tests en `tests/` o `test/`
- Código fuente en `src/`

---

## CHECKLIST DE SESIÓN

Antes de terminar cada sesión:

- [ ] Commits realizados con mensaje descriptivo
- [ ] ROADMAP.md actualizado con progreso
- [ ] [AD_HOC_TASKS](skills/pm-thyrox/tracking/AD_HOC_TASKS.md) actualizado si hay cambios
- [ ] Tests pasando (si aplica)
- [ ] Documentación actualizada
- [ ] Rama limpia o PR creado

---

## COMANDOS ÚTILES

```bash
# Ver estado del proyecto
/status

# Ver siguiente tarea recomendada
/task:next

# Crear nueva tarea
/task:create "Descripción"

# Ver todos los commits recientes
git log --oneline -10 --grep="feat\|fix"

# Ver cambios staged
git diff --cached

# Ver estado de git
git status

# Generar changelog automático
/changelog:generate

# Limpiar contexto si es muy largo
/clear
```

---

## NOTAS IMPORTANTES

### Para Claude Code:

1. **Leer [SKILL](skills/pm-thyrox/SKILL.md)** para entender la metodología
2. **Siempre empezar por ANALYZE** - Entender antes de planificar
3. **Commits atómicos** - Un concepto por commit
4. **Mensajes descriptivos** - Explicar el por qué
5. **Testing primero** - Si es código crítico
6. **Documentar cambios** - Actualizar docs/ si aplica

### Limitaciones Conocidas:

- MCP servers pueden necesitar reconexión
- Contexto muy largo puede comprimir automáticamente
- Git worktrees útiles para tareas paralelas

### Oportunidades:

- Automatizar changelog completamente
- Crear más skills personalizados
- Integrar con GitHub Issues
- Setup CI/CD mejorado

---

## PRÓXIMA SESIÓN

Al iniciar próxima sesión:

1. `cd /home/thyrox && claude`
2. Revisar ROADMAP.md — ¿En qué fase estamos?
3. Consultar [SKILL](skills/pm-thyrox/SKILL.md) — ¿Qué toca hacer en esa fase?
4. Trabajar siguiendo la fase correspondiente
5. Cerrar con checklist de sesión

---

**Última Actualización:** 2026-03-27
**Versión:** 0.1.0
**Mantenedor:** Claude Code + Human
