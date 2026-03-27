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

- **Metodología de 7 fases SDLC** integrada en un SKILL reutilizable
- ROADMAP.md como plan maestro
- Changelog automático desde commits
- Conventional Commits integrado
- Documentación de API + Build separada
- CLAUDE.md como memoria persistente del proyecto
- 19 guías de referencia + 25 templates listos para usar

## Estructura

```
thyrox/
├── README.md                 # Este archivo
├── ROADMAP.md               # Plan maestro del proyecto
├── CHANGELOG.md             # Historial de cambios
├── CLAUDE.md                # Contexto persistente para Claude Code
├── ARCHITECTURE.md          # Decisiones arquitectónicas
├── CONTRIBUTING.md          # Guía de contribución
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

## Metodología

El motor de THYROX es el **[SKILL](.claude/skills/pm-thyrox/SKILL.md)**, que define 7 fases:

```
1. ANALYZE           → Entender requisitos, stakeholders, contexto
2. SOLUTION_STRATEGY → Plan arquitectónico, decisiones técnicas
3. PLAN              → Scope, brainstorm, actualizar ROADMAP.md
4. STRUCTURE         → PRDs o Spec-Driven docs (opcional)
5. DECOMPOSE         → Descomponer en tasks atómicas
6. EXECUTE           → Implementar + commits convencionales
7. TRACK             → Monitorear, changelog, cierre
```

**Siempre empezar por ANALYZE.** Para proyectos pequeños: fases 1, 2, 6, 7.

### Jerarquía de archivos

| Nivel | Archivo | Función |
|-------|---------|---------|
| 1 | `.claude/skills/pm-thyrox/SKILL.md` | Motor — define metodología y fases |
| 2 | `.claude/CLAUDE.md` | Puente — contexto persistente entre sesiones |
| 3 | `README.md` | Presentación — entrada para humanos |

### Workflow diario

1. **Inicio:** `claude` → revisar ROADMAP.md, identificar fase actual
2. **Trabajo:** Seguir la fase correspondiente del SKILL
3. **Cierre:** Commits convencionales, actualizar ROADMAP.md

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

1. Editar [ROADMAP](./ROADMAP.md) con tu proyecto
2. Actualizar [CLAUDE](.claude/CLAUDE.md) con contexto específico
3. Configurar [project-state](.claude/context/project-state.md)
4. Crear PRD en `.claude/prds/` si aplica

## Licencia

MIT

## Autor

Generado con THYROX Template + Claude Code

---

**Última actualización:** 2026-03-27
**Versión:** 0.1.0
