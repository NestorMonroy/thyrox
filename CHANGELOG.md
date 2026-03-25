```yml
Tipo: Documentación de Cambios
Categoría: Historial de Proyecto
Versión: 0.1.0
Propósito: Registro automático de todos los cambios notables del proyecto
Objetivo: Documentar cambios siguiendo Semantic Versioning y Keep a Changelog
Fecha actualización: 2026-03-25
```

# CHANGELOG

## Propósito

Registro de todos los cambios notables del proyecto THYROX. Sigue el formato Keep a Changelog y Semantic Versioning.

> Objetivo: Proporcionar historial claro de qué se agregó, cambió, y deprecó en cada versión.

---

## Formato y Convenciones

Todos los cambios notables de este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
y este proyecto sigue [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.0] - 2025-03-24

### Added

- Estructura inicial de THYROX template
- README.md con documentación general
- ROADMAP.md con plan maestro del proyecto
- CLAUDE.md como contexto persistente
- CHANGELOG.md para tracking de cambios
- Documentación de API.md
- Documentación de BUILD.md
- Estructura de carpetas (.claude/, docs/, reference/)
- .gitignore configuration

### Changed

- N/A (Primera versión)

### Deprecated

- N/A

### Removed

- N/A

### Fixed

- N/A

### Security

- N/A

---

## [Unreleased]

### Added

- [ ] Configuración GitHub Actions
- [ ] Tests unitarios
- [ ] Endpoints de API base
- [ ] Build scripts

### Changed

- Mejoras en documentación

### Fixed

- Bugs encontrados en desarrollo

---

## Instrucciones de Actualización

Este archivo se actualiza automáticamente con:

```bash
/changelog:generate --from v0.0.0 --to v0.1.0
```

O manualmente siguiendo:

1. Agregar versión con fecha: `## [X.Y.Z] - YYYY-MM-DD`
2. Categorías: Added, Changed, Deprecated, Removed, Fixed, Security
3. Cada item descripción clara y concisa
4. Mantener formato [Keep a Changelog](https://keepachangelog.com/)

---

**Formato de versión:** Semantic Versioning (MAJOR.MINOR.PATCH)

Ejemplo:
- `0.1.0` - Primera release beta
- `1.0.0` - Primera release estable
- `1.1.0` - Nueva funcionalidad compatible
- `1.1.1` - Bugfix
- `2.0.0` - Breaking changes

---

**Última Actualización:** 2025-03-24
