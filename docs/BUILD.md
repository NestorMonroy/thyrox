```yml
Tipo: Documentación Técnica Detallada
Categoría: Build & Deployment
Versión: 1.0
Propósito: Guía completa para construir, probar y desplegar
Objetivo: Proporcionar instrucciones paso a paso para setup, build, test y deployment
Fecha actualización: 2026-03-25
```

# Documentación de Build

## Propósito

Guía completa para construir, probar y desplegar THYROX. Cubre setup local, CI/CD, Docker, y production deployment.

> Objetivo: Que desarrolladores puedan reproducir el ambiente, ejecutar tests, y hacer deploy a producción.

---

## Descripción General

Guía completa para construir, probar y desplegar THYROX.

### Sistema

- Node.js 18.x o superior
- Git 2.30+
- Docker (opcional, para containerización)

### Instalación de Dependencias

```bash
# Node.js
node --version  # v18.x o superior

# Git
git --version   # 2.30 o superior
```

---

## Setup Local

### 1. Clonar Repositorio

```bash
git clone https://github.com/user/thyrox.git
cd thyrox
```

### 2. Instalar Dependencias

```bash
# API sub-proyecto
cd api
npm install

# Build sub-proyecto
cd ../build
npm install

# Volver a raíz
cd ..
```

### 3. Variables de Ambiente

```bash
# Crear .env en raíz
cp .env.example .env

# Editar con tu configuración
nano .env
```

Variables necesarias:
```
NODE_ENV=development
API_PORT=3000
DATABASE_URL=postgresql://user:pass@localhost:5432/thyrox
API_KEY=your_api_key_here
```

### 4. Iniciar Desarrollo

```bash
# En terminal 1: API
cd api
npm run dev

# En terminal 2: Build
cd build
npm run dev

# Verificar
curl http://localhost:3000/health
```

---

## Desarrollo

### Estructura de Scripts

**API Scripts:**
```bash
npm run dev      # Desarrollo con hot reload
npm run build    # Compilar
npm start        # Producción
npm test         # Tests
npm run lint     # Linting
```

**Build Scripts:**
```bash
npm run dev      # Desarrollo
npm run build    # Compilar
npm run test     # Tests
npm run deploy   # Deploy (CI/CD)
```

### Crear Nueva Feature

```bash
# 1. Create feature branch
git checkout -b feature/nombre-feature

# 2. Desarrollo
cd api
npm run dev

# 3. Tests
npm test

# 4. Commit
git add .
git commit -m "feat(api): descripción clara"

# 5. Push
git push origin feature/nombre-feature

# 6. Open Pull Request
```

### Convenciones de Commits

Usar **Conventional Commits**:

```
feat(api): agregar nuevo endpoint
fix(build): resolver error en GitHub Actions
docs(readme): actualizar instrucciones
test(api): agregar tests para validación
refactor(api): mejorar estructura de código
chore(deps): actualizar dependencias
```

---

## Testing

### Tests Unitarios

```bash
cd api
npm test                    # Ejecutar todos
npm test -- --watch        # Modo watch
npm test -- --coverage     # Con cobertura
```

### Tests de Integración

```bash
cd api
npm run test:integration
```

### E2E Tests

```bash
cd build
npm run test:e2e
```

### Coverage Mínimo

- Líneas: 80%
- Funciones: 80%
- Ramas: 75%
- Sentencias: 80%

---

## CI/CD Pipeline

### GitHub Actions Workflow

**Archivo:** `.github/workflows/ci.yml`

El pipeline ejecuta automáticamente en cada push:

1. **Lint** - Validar código
2. **Build** - Compilar
3. **Test** - Ejecutar tests
4. **Coverage** - Verificar cobertura
5. **Deploy** - Desplegar a staging

### Verificar Pipeline

```bash
git push origin feature/nombre
# Ver progreso en: https://github.com/user/thyrox/actions
```

---

## Compilation

### Build para Producción

```bash
# API
cd api
npm run build

# Build
cd ../build
npm run build
```

Output:
- API: `api/dist/`
- Build: `build/dist/`

### Verificar Build

```bash
# Ejecutar build localmente
cd api
npm start  # Ejecuta compilado
```

---

## Deployment

### Ambiente Local

```bash
npm run dev
```

### Ambiente Staging

```bash
# Push a rama 'staging'
git push origin feature:staging

# Automáticamente deploya a Heroku/AWS
```

### Ambiente Producción

```bash
# Create release tag
git tag v0.1.0
git push origin v0.1.0

# Automáticamente deploya a producción
# Publicación en npm si aplica
```

### Zero-Downtime Deployment

Estrategia: Blue-Green Deployment

1. Desplegar versión nueva (Green)
2. Rotar traffic a Green
3. Mantener Blue como rollback
4. Eliminar Blue después de validación

---

## Troubleshooting

### Problema: "npm install" falla

**Solución:**
```bash
# Limpiar caché
npm cache clean --force

# Eliminar node_modules
rm -rf node_modules package-lock.json

# Reinstalar
npm install
```

### Problema: Tests fallan localmente

**Solución:**
```bash
# Verificar variables de ambiente
cat .env

# Verificar base de datos
psql -U user -d thyrox -c "SELECT 1"

# Reset database
npm run db:reset
```

### Problema: Port 3000 en uso

**Solución:**
```bash
# Encontrar proceso
lsof -i :3000

# Cambiar en .env
API_PORT=3001
```

### Problema: Cambios no se reflejan

**Solución:**
```bash
# Limpiar cache y reiniciar
npm run clean
npm install
npm run dev
```

---

## Performance

### Optimizaciones

- Minificación de assets
- Tree-shaking de dependencias
- Code splitting
- Caching estratégico

### Monitoreo

```bash
# Analizar tamaño de bundles
npm run analyze

# Profiling
npm run profile
```

---

## Security

### Checklist de Seguridad

- [ ] Dependencias sin vulnerabilidades
- [ ] Secrets no en código
- [ ] HTTPS en producción
- [ ] SQL injection prevenido
- [ ] CORS configurado correctamente
- [ ] Rate limiting activo
- [ ] Logs de auditoría

### Verificar Vulnerabilidades

```bash
npm audit
npm audit fix
```

---

## Versionado

### Semantic Versioning

- MAJOR.MINOR.PATCH
- Ej: 0.1.0, 1.0.0, 1.1.1

### Crear Release

```bash
# Actualizar versión en package.json
npm version minor  # 0.1.0 → 0.2.0

# Crear tag
git push origin v0.2.0

# Esto triggers deployment automático
```

---

## Monitoreo en Producción

### Health Checks

```bash
curl https://api.example.com/health
```

### Logs

```bash
# Heroku
heroku logs --tail

# AWS CloudWatch
aws logs tail /aws/lambda/thyrox
```

### Métricas

- Response time
- Error rate
- CPU usage
- Memory usage

---

## Documentación Adicional

- [ARCHITECTURE](../ARCHITECTURE.md) - Decisiones técnicas
- [CONTRIBUTING](../CONTRIBUTING.md) - Guía de contribución
- [API](./API.md) - Documentación de endpoints

---

## Comandos Útiles

```bash
# Desarrollo rápido
npm run dev

# Linting
npm run lint
npm run lint:fix

# Formating
npm run format

# Testing
npm test
npm test:coverage

# Build y deploy
npm run build
npm run deploy

# Limpieza
npm run clean
```

---

## FAQ

**P: Cuál es la versión de Node?**
R: 18.x o superior. Verificar con `node --version`.

**P: Cómo reseto la base de datos?**
R: `npm run db:reset` (cuidado, elimina datos).

**P: Dónde están los logs?**
R: `./logs/` o plataforma de deployment.

**P: Cómo reporto problemas?**
R: Abre issue en GitHub o contacta support@example.com.

---

**Última Actualización:** 2025-03-24
**Estado:** En Desarrollo (v0.1.0)
