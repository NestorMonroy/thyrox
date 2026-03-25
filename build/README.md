```yml
Tipo: Documentación Técnica
Categoría: Build & CI/CD
Versión: 1.0
Propósito: Documentación de sub-proyecto Build, CI/CD y Deployment
Objetivo: Proporcionar información sobre scripts, configuración, y pipeline de deployment
Fecha actualización: 2026-03-25
```

# THYROX Build

## Propósito

Documentación del sub-proyecto Build: configuración de build, CI/CD, testing, y deployment pipeline.

> Objetivo: Que DevOps engineers puedan entender scripts, configuración, y deployment process.

---

## Descripción General

Sub-proyecto: Build, CI/CD y Deployment.

Configuración de build, testing, y deployment pipeline.

**Ubicación:** `/build`
**Documentación:** `/docs/BUILD.md`

---

## Componentes

### Scripts

Ubicación: `/build/scripts/`
- `setup.sh` - Setup inicial
- `build.sh` - Compilar proyecto
- `test.sh` - Ejecutar tests
- `deploy.sh` - Deploy a producción

### Config

Ubicación: `/build/config/`
- `github-actions.yml` - CI/CD pipeline
- `docker-compose.yml` - Docker setup
- `Dockerfile` - Container image
- `.env.example` - Ejemplo de variables

---

## Quick Start

```bash
cd build
npm install

# Ver scripts disponibles
npm run

# Desarrollo
npm run dev

# Build
npm run build

# Tests
npm test
```

---

## GitHub Actions

Pipeline automático:

1. **Lint** - Validar código
2. **Build** - Compilar
3. **Test** - Tests
4. **Deploy** - A staging/producción

Configuración: `.github/workflows/ci.yml`

---

## Docker

Build container:

```bash
docker build -t thyrox:0.1.0 .
docker run -p 3000:3000 thyrox:0.1.0
```

---

## Deployment

### Staging

```bash
git push origin develop
# Automáticamente deploya a staging
```

### Producción

```bash
git tag v0.1.0
git push origin v0.1.0
# Automáticamente deploya a producción
```

---

## Troubleshooting

Ver `/docs/BUILD.md` para:
- Setup issues
- Test failures
- Build errors
- Deployment problems

---

## Documentación

- Full build docs: `/docs/BUILD.md`
- Architecture: `/docs/ARCHITECTURE.md`
- Contributing: `/docs/CONTRIBUTING.md`

---

**Versión:** 0.1.0
**Última Actualización:** 2025-03-24
