```yml
Tipo: Documentación Principal
Categoría: Introducción al Proyecto
Versión: 1.0
Propósito: Presentación y descripción del proyecto THYROX
Objetivo: Proporcionar visión general, características, estructura, y quick start
Fecha actualización: 2026-03-25
```

# THYROX

**Tracking Hierarchy Yield Roadmap Organization eXecution**

## Propósito

Presentación del template THYROX: un framework profesional para gestión y planificación de proyectos con Claude Code.

> Objetivo: Que nuevos usuarios comprendan qué es THYROX, cómo funciona, y cómo comenzar a usarlo.

---

## Descripción General

Un template profesional para gestión y planificación de proyectos con Claude Code, incluyendo documentación automática, changelog tracking y gestión de cambios.

## Qué es THYROX

THYROX es un framework completo para:

- **Automatización** de workflows con Claude Code
- **Documentación** estructurada y versionada
- **Gestión** de proyectos con ROADMAP.md y tasks
- **Ejecución** con commits convencionales y changelog automático
- **Estructura** clara para APIs y builds

## Características

- Sistema de gestión de tareas con dependencias
- ROADMAP.md como plan maestro
- Changelog automático desde commits
- Conventional Commits integrado
- Documentación de API + Build separada
- Claude.md como memoria del proyecto
- Estructura lista para dos sub-proyectos

## Estructura

```
thyrox/
├── README.md                 # Este archivo
├── ROADMAP.md               # Plan maestro del proyecto
├── CHANGELOG.md             # Historial de cambios
├── CLAUDE.md                # Contexto persistente para Claude Code
├── ARCHITECTURE.md          # Decisiones arquitectónicas
├── CONTRIBUTING.md          # Guía de contribución
├── commit-convention.md     # Convenciones de commits
├── template.md              # Template para documentos
│
├── .claude/                 # Configuración de Claude Code
│   ├── context/
│   │   ├── project-state.md
│   │   └── decisions.md
│   └── skills/
│       └── pm-thyrox/       # Skill principal de PM
│
├── docs/                    # Documentación técnica
│   ├── API.md              # Documentación de endpoints
│   └── BUILD.md            # Guía de build y deployment
│
├── reference/              # Referencias y tareas
│   ├── AD_HOC_TASKS.md    # Tareas pequeñas
│   └── REFACTORS.md       # Mejoras pendientes
│
├── example-epic/           # Ejemplo de epic
│   └── epic.md            # Template y ejemplo
│
├── api/                    # Sub-proyecto: API
│   ├── src/               # Código fuente
│   ├── tests/             # Tests
│   └── README.md
│
├── build/                  # Sub-proyecto: Build
│   ├── scripts/           # Scripts de build
│   ├── config/            # Configuraciones
│   └── README.md
│
└── .gitignore             # Archivos a ignorar
```

## Inicio Rápido

1. **Clonar y setup:**
   ```bash
   git clone <repo> thyrox
   cd thyrox
   git init
   ```

2. **Inicializar Claude Code:**
   ```bash
   claude --init
   cp CLAUDE.md .claude/CLAUDE.md
   ```

3. **Revisar ROADMAP:**
   ```bash
   cat ROADMAP.md
   ```

4. **Crear tu primer task:**
   ```bash
   claude
   # > /task:create "Configurar API base"
   ```

## Workflow Diario

1. **Morning:** `claude` → revisar `/tasks` y `/status`
2. **Development:** Claude crea commits convencionales automáticamente
3. **Progress:** Actualizar ROADMAP.md al completar items
4. **Weekly:** `/changelog:generate` para actualizar CHANGELOG.md
5. **Review:** PRs con documentación automática

## Convenciones

### Commits
Usa formato convencional:
```
feat(api): agregar endpoint GET /users
fix(build): resolver conflicto de dependencias
docs(readme): actualizar instrucciones
```

### ROADMAP.md
```markdown
- [ ] Tarea pendiente
- [-] Tarea en progreso
- [x] Tarea completada (YYYY-MM-DD)
```

### Branches
```
feature/nombre-feature
bugfix/nombre-bug
docs/nombre-docs
```

## Sub-proyectos

### API
Ubicación: `/api`
- Endpoints REST documentados
- Validación y autenticación
- Tests unitarios

### Build
Ubicación: `/build`
- CI/CD pipeline
- Scripts de construcción
- Configuración de deploy

## Documentación

Todos los docs están en `/docs/`:

- **API.md** - Endpoints, autenticación, ejemplos
- **BUILD.md** - Setup, compilación, deployment
- **ARCHITECTURE.md** - Decisiones técnicas
- **CONTRIBUTING.md** - Cómo contribuir

## Gestión de Cambios

El proyecto se auto-documenta:

1. Haces cambios y commits
2. Claude genera commit messages convencionales
3. Cada semana: `/changelog:generate`
4. CHANGELOG.md se actualiza automáticamente
5. ROADMAP.md refleja progreso

## Comandos Útiles

```bash
# Ver tareas actuales
claude
/task:show

# Siguiente tarea recomendada
/task:next

# Estado del proyecto
/status

# Generar changelog
/changelog:generate

# Ver commits recientes
git log --oneline -10

# Crear nueva rama feature
git checkout -b feature/nombre
```

## Configuración Inicial

1. Editar [ROADMAP.md](./ROADMAP.md) con tu proyecto
2. Actualizar [CLAUDE.md](./CLAUDE.md) con contexto específico
3. Configurar [.claude/context/project-state.md](.claude/context/project-state.md)
4. Crear PRD en `.claude/prds/` si aplica

## Licencia

MIT

## Autor

Generado con THYROX Template + Claude Code

---

**Última actualización:** 2025-03-24
**Versión:** 0.1.0
