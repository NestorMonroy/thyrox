```yml
Tipo: Contexto de Proyecto
Categoría: Decisiones Arquitectónicas
Versión: 1.0
Propósito: Índice y registro de decisiones arquitectónicas importantes
Objetivo: Proporcionar visión clara de decisiones técnicas del proyecto
Fecha actualización: 2026-03-25
```

# Decisiones de Arquitectura

## Propósito

Registro de decisiones arquitectónicas y técnicas importantes del proyecto THYROX. Documenta el razonamiento detrás de cada decisión clave.

> Objetivo: Proporcionar historial claro de decisiones para auditoría, comprensión de trade-offs, y referencia futura.

---

## Índice de ADRs

### Aprobados y Activos

1. [ADR-001: Markdown para Documentación](decisions/adr-001.md) ✓
   - Usar Markdown como formato estándar de documentación
   - Status: Aprobado | Fecha: 2025-03-24

2. [ADR-002: ROADMAP.md como Single Source of Truth](decisions/adr-002.md) ✓
   - ROADMAP.md es la fuente única de verdad para tracking
   - Status: Aprobado | Fecha: 2025-03-24

3. [ADR-003: Conventional Commits](decisions/adr-003.md) ✓
   - Estandarizar formato de commits
   - Status: Aprobado | Fecha: 2025-03-24

4. [ADR-004: Separación de Sub-proyectos](decisions/adr-004.md) ✓
   - API y Build como sub-proyectos independientes
   - Status: Aprobado | Fecha: 2025-03-24

5. [ADR-005: Claude Code como Development Agent](decisions/adr-005.md) ✓
   - Automatización de desarrollo con Claude Code
   - Status: Aprobado | Fecha: 2025-03-24

7. [ADR-007: PostgreSQL como Base de Datos](decisions/adr-007.md) ✓
   - Motor de base de datos principal
   - Status: Aprobado | Fecha: 2025-03-24

### Planeados para Fases Futuras

6. [ADR-006: YAML para Configuración](decisions/adr-006.md) ⏳
   - Usar YAML para archivos de configuración
   - Status: Pendiente (Fase 2) | Fecha: 2025-03-24

8. [ADR-008: Docker para Containerización](decisions/adr-008.md) ⏳
   - Reproducibilidad y deployment con Docker
   - Status: Aprobado (Fase 2) | Fecha: 2025-03-24

9. [ADR-009: GitHub Actions para CI/CD](decisions/adr-009.md) ⏳
   - Automatización de tests y deployment
   - Status: Aprobado (Fase 2) | Fecha: 2025-03-24

---

## Cambios Futuros

### Pendientes de Decisión

- [ ] Frontend framework (React, Vue, Svelte, etc.)
- [ ] Estrategia de caching (Redis, Memcached, etc.)
- [ ] Monitoreo y logging strategy
- [ ] Feature flag system
- [ ] Autenticación/Autorización estándar
- [ ] Versionado de API

---

## Cómo Usar Este Sistema

### Crear una Nueva ADR

1. Usa el template: [adr.md.template](.claude/skills/pm-thyrox/templates/adr.md.template)
2. Copia a `decisions/adr-NNN.md`
3. Completa todas las secciones
4. Agrega el link aquí en el índice
5. Commit con mensaje: `docs(adr): add ADR-NNN [título]`

### Actualizar una ADR

1. Edita el archivo correspondiente
2. Actualiza el versionado
3. Commit con mensaje: `docs(adr): update ADR-NNN [cambio]`

### Deprecar una ADR

1. Cambia Status a "Deprecado"
2. Agrega nota sobre qué la reemplaza
3. Mueve a sección "Deprecadas"

---

## Estadísticas

**Total ADRs:** 9<br>
**Aprobadas:** 7<br>
**Pendientes:** 2<br>
**Deprecadas:** 0<br>
**Activas en producción:** 7

---

## Convenciones

- **Formato:** ADR-XXX (Architecture Decision Record)
- **Basado en:** [ADRs by Michael Nygard](https://adr.github.io/)
- **Template:** [adr.md.template](.claude/skills/pm-thyrox/templates/adr.md.template)
- **Ubicación:** `.claude/context/decisions/`

---

## Referencias Relacionadas

- [ROADMAP.md](../ROADMAP.md) - Plan del proyecto
- [ARCHITECTURE.md](../ARCHITECTURE.md) - Decisiones arquitectónicas detalladas
- [commit-convention.md](../skills/pm-thyrox/references/commit-convention.md) - Convenciones de commits (ADR-003)
- [adr.md.template](../skills/pm-thyrox/templates/adr.md.template) - Template para nuevas ADRs

---

**Convención:** ADR-XXX (Architecture Decision Record)<br>
**Próxima Review:** 2025-04-24<br>
**Última Actualización:** 2026-03-25
