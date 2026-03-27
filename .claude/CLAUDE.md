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

## FLUJO DE TRABAJO

### 1. Inicio de Sesión

```bash
cd /home/thyrox
claude
```

Mostrar:
```
/status       # Estado general
/task:show    # Tareas pendientes
```

### 2. Revisar Contexto

- Leer últimas líneas de ROADMAP.md
- Revisar CHANGELOG.md (últimas 5 entradas)
- Revisar [AD_HOC_TASKS.md](skills/pm-thyrox/tracking/AD_HOC_TASKS.md) si hay

### 3. Seleccionar Tarea

```
/task:create "Descripción de tarea"
/task:next   # O ver recomendación siguiente
```

### 4. Desarrollo

- Crear feature branch: `git checkout -b feature/nombre`
- Claude Code hace commits automáticamente
- Commits deben seguir Conventional Commits

### 5. Actualizar ROADMAP.md

Marcar tarea como:
```markdown
- [x] **Nombre Tarea** - Descripción (2025-03-24)
```

### 6. Generar Changelog

Semanalmente:
```bash
/changelog:generate --from v0.0.0
```

### 7. Pull Request

Crear PR con template automático que incluya:
- Qué cambió
- Por qué cambió
- Testing realizado
- Links a issues/tasks

---

## ESTRUCTURA DE CARPETAS

### `.claude/`

**context/** - Estado actual del proyecto
- [project-state.md](context/project-state.md) - Contexto general
- [decisions.md](context/decisions.md) - Decisiones arquitectónicas

**skills/** - Comandos personalizados
- [changelog.md](skills/pm-thyrox/references/changelog.md) - Generar CHANGELOG desde git log
- [commit-convention.md](skills/pm-thyrox/references/commit-convention.md) - Validar commits

**prds/** - Product Requirements Documents
- [template.md](context/template.md) - Template para nuevas funcionalidades

**epics/** - Epics y task decomposition
- Ejemplo: [example-epic/epic.md](skills/pm-thyrox/epics/example-epic/epic.md) + tasks

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
- [ ] [AD_HOC_TASKS.md](skills/pm-thyrox/tracking/AD_HOC_TASKS.md) actualizado si hay cambios
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

1. **Siempre revisar ROADMAP.md** antes de iniciar trabajo
2. **Commits atómicos** - Un concepto por commit
3. **Mensajes descriptivos** - Explicar el por qué
4. **Testing primero** - Si es código crítico
5. **Documentar cambios** - Actualizar docs/ si aplica

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
2. `/status` - Ver dónde estamos
3. Revisar ROADMAP.md
4. `/task:next` - Siguiente tarea
5. Iniciar desarrollo

---

**Última Actualización:** 2025-03-24 
**Versión:** 0.1.0
**Mantenedor:** Claude Code + Human
