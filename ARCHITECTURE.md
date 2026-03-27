```yml
Tipo: Documentación Técnica
Categoría: Arquitectura del Sistema
Versión: 1.0
Propósito: Documentación de decisiones arquitectónicas y diseño del sistema
Objetivo: Proporcionar visión clara de la arquitectura y decisiones técnicas
Fecha actualización: 2026-03-25
```

# ARCHITECTURE

## Propósito

Documentación de decisiones arquitectónicas, patrones de diseño, y estructura del sistema THYROX.

> Objetivo: Que nuevos desarrolladores comprendan la arquitectura y tomen decisiones consistentes.

---

## Visión General de Arquitectura

THYROX es un template profesional para gestión de proyectos con Claude Code. La arquitectura se divide en componentes independientes:

**Backend:** Node.js + Express<br>
**Frontend:** (Por definir)<br>
**Base de Datos:** PostgreSQL<br>
**DevOps:** GitHub Actions + Docker<br>
**Documentación:** Markdown versionado en Git

---

## Componentes Principales

### API Sub-proyecto (./ api/)

REST API construida con Node.js y Express.

**Estructura:**<br>
`src/routes/` - Definición de endpoints<br>
`src/controllers/` - Manejadores de requests<br>
`src/services/` - Lógica de negocio<br>
`src/middleware/` - Middleware de Express<br>
`src/models/` - Modelos de datos

### Build Sub-proyecto (./ build/)

Configuración de build, testing, y deployment.

**Incluye:**<br>
Scripts de setup, compilación, testing<br>
Configuración GitHub Actions<br>
Docker setup y compose<br>
Ambiente variables

### Documentación (./ docs/)

Documentación técnica y guías.

**Incluye:**<br>
API.md - Endpoints y autenticación<br>
BUILD.md - Guía de build y deployment<br>
ARCHITECTURE.md - Decisiones arquitectónicas<br>
CONTRIBUTING.md - Guía de contribución

---

## Decisiones Arquitectónicas

### 1. Monorepo con Sub-proyectos

**Decisión:** Mantener API y Build como sub-proyectos independientes dentro de un monorepo.

**Razones:**<br>
Facilita desarrollo independiente<br>
Permite versioning separado<br>
Documentación colocalizada<br>
CI/CD pipeline unificado

### 2. Markdown como Fuente de Verdad

**Decisión:** Toda documentación en Markdown versionado en Git.

**Razones:**<br>
Versionable y auditable<br>
Sin dependencias externas<br>
GitHub lo renderiza nativamente<br>
Fácil de convertir a otros formatos

### 3. ROADMAP.md como Plan Maestro

**Decisión:** ROADMAP.md es la fuente única de verdad para el estado del proyecto.

**Razones:**<br>
Single source of truth<br>
Fácil de actualizar<br>
Histórico completo en Git<br>
Accesible para todo el equipo

### 4. Conventional Commits

**Decisión:** Usar Conventional Commits para estandarización.

**Razones:**<br>
Commits legibles y estructurados<br>
Facilita changelog automático<br>
Semántica clara<br>
Herramientas integran fácilmente

### 5. Claude Code Native

**Decisión:** Usar features nativas de Claude Code, no librerías externas.

**Razones:**<br>
Reduce dependencias<br>
Facilita mantenimiento<br>
No requiere configuración adicional<br>
Integración directa

---

## Patrones de Diseño

### API REST

- **Endpoints:** RESTful design
- **Autenticación:** API Keys + Bearer tokens
- **Validación:** Input validation en middleware
- **Error Handling:** Standardized error responses
- **Versionado:** `/v1/` prefix en URLs

### Base de Datos

- **ORM:** (Por definir)
- **Migraciones:** Git-based (no automáticas)
- **Backup:** Daily snapshots
- **Índices:** Optimizados para queries comunes

### Estructura de Código

**Separación de concerns:**<br>
Routes → Controllers → Services → Models<br>
Cada capa con responsabilidad clara<br>
Inyección de dependencias<br>
Testing en cada nivel

---

## Convenciones

### Naming

**Archivos:** `kebab-case.md`<br>
**Carpetas:** `lowercase-folders/`<br>
**Variables:** `camelCase`<br>
**Constantes:** `CONSTANT_CASE`<br>
**Classes:** `PascalCase`

### Estructura de Carpetas

```
project/
├── api/
│   ├── src/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── middleware/
│   │   ├── models/
│   │   └── helpers/
│   ├── tests/
│   └── package.json
├── build/
│   ├── scripts/
│   ├── config/
│   └── Dockerfile
├── docs/
├── .claude/
│   ├── context/
│   ├── skills/
│   └── prds/
└── reference/
```

---

## Escalabilidad

### Crecimiento Horizontal

**API:** Stateless design para fácil escalado<br>
**BD:** Connection pooling<br>
**Cache:** Redis para datos frecuentes<br>
**CDN:** Para assets estáticos

### Crecimiento Vertical

**Code:** Módulos independientes<br>
**DB:** Índices optimizados<br>
**Cache:** Estrategia inteligente<br>
**Monitoring:** Métricas clave

---

## Seguridad

### Principios

**Least Privilege:** Mínimos permisos necesarios<br>
**Defense in Depth:** Múltiples capas<br>
**Secure by Default:** Seguridad es el default<br>
**Audit Trail:** Logging de cambios

### Implementación

**HTTPS:** Siempre en producción<br>
**API Keys:** Rotación periódica<br>
**Input Validation:** En todos los endpoints<br>
**CORS:** Configurado restrictivamente<br>
**Rate Limiting:** Para prevenir abuse

---

## Deployment

### Ambientes

**Desarrollo:** Local machine<br>
**Staging:** Pre-producción para testing<br>
**Producción:** Live environment

### CI/CD Pipeline

1. **Commit:** Push a GitHub
2. **Test:** Automated tests corren
3. **Build:** Docker image se construye
4. **Deploy:** Auto-deploy a staging
5. **Review:** Manual approval
6. **Release:** Deploy a producción

### Rollback

- Versiones anteriores en registry
- Database migrations reversibles
- Health checks antes de considerar ready
- Monitoreo post-deployment

---

## Monitoreo y Logging

### Logs

**Application:** Estructura JSON<br>
**Access:** Request/response logs<br>
**Error:** Stack traces con contexto<br>
**Audit:** Cambios críticos

### Métricas

**Performance:** Response times<br>
**Availability:** Uptime y errors<br>
**Business:** User counts, transactions<br>
**Infrastructure:** CPU, memory, disk

---

## Roadmap Futuro

**Phase 1 (Actual):** Estructura base<br>
**Phase 2:** API completa<br>
**Phase 3:** Build & deployment<br>
**Phase 4:** Frontend<br>
**Phase 5:** Escalabilidad

---

**Última Actualización:** 2026-03-25<br>
**Próxima Review:** 2026-04-25
