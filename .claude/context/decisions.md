# Decisiones de Arquitectura

Registro de decisiones técnicas importantes.

---

## ADR-001: Markdown para Documentación

**Fecha:** 2025-03-24
**Status:** Aprobado
**Owner:** User

### Contexto

Necesitamos elegir formato para documentación del proyecto.

### Opciones Consideradas

1. Markdown - Simple, versionable, GitHub-native
2. Confluence - Centralizado pero no versionable
3. Notion - Bonito pero cerrado
4. Confluence - No versionable

### Decisión

**Usar Markdown** para toda documentación.

### Justificación

- Versionable en Git
- Simple de escribir
- GitHub lo renderiza nativamente
- Fácil de convertir a otros formatos
- No requiere herramientas especiales
- Legible en texto plano

### Consecuencias

- Requiere disciplina para mantener actualizado
- No hay UI visual como Confluence
- Requiere git knowledge para contribuir

---

## ADR-002: ROADMAP.md como Single Source of Truth

**Fecha:** 2025-03-24
**Status:** Aprobado
**Owner:** User

### Decisión

ROADMAP.md es la fuente única de verdad para tracking de tareas.

### Por Qué

- Versionable
- Accesible desde cualquier lugar
- Integrable con Claude Code
- Simple y eficiente
- No requiere herramientas externas

### Alternativas Rechazadas

- GitHub Issues (scattered context)
- Trello (no versionable)
- Linear (expensive)
- Notion (closed ecosystem)

---

## ADR-003: Conventional Commits

**Fecha:** 2025-03-24
**Status:** Aprobado
**Owner:** User

### Decisión

Usar Conventional Commits v1.0.0 para todos los commits.

### Formato

```
<type>(<scope>): <description>
```

### Tipos

- **feat:** Feature nueva
- **fix:** Corrección de bug
- **docs:** Cambios en documentación
- **test:** Agregar/modificar tests
- **refactor:** Cambio de código sin alterar funcionalidad
- **chore:** Build, deps, etc

### Beneficios

- Commits legibles y semánticos
- Facilita changelog automático
- Semantic versioning automático
- Git history limpio

---

## ADR-004: Separación de Sub-proyectos

**Fecha:** 2025-03-24
**Status:** Aprobado
**Owner:** User

### Decisión

API y Build son sub-proyectos separados dentro del mismo repositorio.

### Estructura

```
thyrox/
├── api/        # Sub-proyecto API
├── build/      # Sub-proyecto Build
└── docs/       # Documentación compartida
```

### Justificación

- Independencia de desarrollo
- Equipos pueden trabajar en paralelo
- Versionado separado si es necesario
- Misma documentación base

### Alternativas Consideradas

- Monorepo gigante (demasiado caótico)
- Repositorios separados (falta de contexto)

---

## ADR-005: Claude Code como Development Agent

**Fecha:** 2025-03-24
**Status:** Aprobado
**Owner:** User

### Decisión

Usar Claude Code para automatización de desarrollo.

### Usar Para

- Commits automáticos
- Changelog generation
- Tests
- Refactoring
- Documentation

### No Usar Para

- Decisiones arquitectónicas (human-only)
- Code reviews finales (human validation)
- Deployments críticos (manual gate)

### Contexto

- CLAUDE.md define comportamiento
- /task:create para nuevas tareas
- /clear para limpiar contexto si es muy largo

---

## ADR-006: YAML para Configuración

**Fecha:** 2025-03-24
**Status:** Pendiente (Fase 2)

### Decisión

Usar YAML para archivos de configuración (CI/CD, etc).

### Archivos

- `.github/workflows/*.yml` - GitHub Actions
- `docker-compose.yml` - Docker setup
- `.claude/config.yml` - Claude Code config

### Justificación

- Readable
- Indentation based (visual structure)
- Wide support

---

## ADR-007: PostgreSQL como Base de Datos

**Fecha:** 2025-03-24
**Status:** Aprobado

### Decisión

Usar PostgreSQL como principal base de datos.

### Justificación

- Open source
- Robusto y confiable
- Soporta JSON
- Herramientas maduras
- Escalable

---

## ADR-008: Docker para Containerización

**Fecha:** 2025-03-24
**Status:** Aprobado (Fase 2)

### Decisión

Usar Docker para reproducibilidad.

### Enfoque

- `Dockerfile` por sub-proyecto
- `docker-compose.yml` para desarrollo
- Minimal images basadas en alpine

---

## ADR-009: GitHub Actions para CI/CD

**Fecha:** 2025-03-24
**Status:** Aprobado (Fase 2)

### Decisión

GitHub Actions para automatización.

### Pipeline

1. Lint
2. Test
3. Build
4. Deploy

### Ventajas

- Nativo en GitHub
- Gratis para repos públicos
- YAML simple
- Buena integración

---

## Cambios Futuros

### Pendientes de Decisión

- [ ] Qué frontend framework usar
- [ ] Estrategia de caching
- [ ] Monitoreo y logging strategy
- [ ] Feature flag system

---

**Convención:** ADR-XXX (Architecture Decision Record)
**Formato:** Basado en [ADRs by Michael Nygard](https://adr.github.io/)
**Próxima Review:** 2025-04-24
