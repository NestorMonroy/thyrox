```yml
Tipo: Documentación Técnica
Categoría: API REST
Versión: 1.0
Propósito: Documentación de sub-proyecto API REST
Objetivo: Proporcionar quick start, estructura, y guía de desarrollo de API
Fecha actualización: 2026-03-25
```

# THYROX API

## Propósito

Documentación del sub-proyecto API: REST API construida con Node.js y Express para THYROX.

> Objetivo: Que developers puedan entender la estructura, instalar dependencias, y comenzar a desarrollar endpoints.

---

## Descripción General

Sub-proyecto: REST API para THYROX.

API REST construida con Node.js y Express.

**Ubicación:** `/api`
**Documentación:** [API.md](../docs/API.md)
**Build:** Ver [BUILD.md](../docs/BUILD.md)

---

## Quick Start

```bash
cd api
npm install
npm run dev
```

Abre `http://localhost:3000/health` para verificar.

---

## Estructura

```
api/
├── src/
│   ├── routes/       # Endpoint definitions
│   ├── controllers/  # Request handlers
│   ├── services/     # Business logic
│   ├── middleware/   # Express middleware
│   ├── validators/   # Input validation
│   ├── models/       # Data models
│   ├── utils/        # Utility functions
│   └── app.ts        # Express app setup
├── tests/            # Test files
├── package.json
└── README.md
```

---

## Scripts

```bash
npm run dev          # Desarrollo con hot reload
npm run build        # Compilar TypeScript
npm start            # Ejecutar compilado
npm test             # Tests
npm test:coverage    # Con cobertura
npm run lint         # ESLint
npm run lint:fix     # Auto-fix
```

---

## Endpoints Base

- `GET /health` - Health check
- `POST /auth/login` - Login
- `GET /users` - Listar usuarios (autenticado)

Para endpoints completos, ver [API.md](../docs/API.md).

---

## Testing

```bash
npm test                    # Todos los tests
npm test -- --watch        # Modo watch
npm test -- --coverage     # Con cobertura
```

---

## Documentación

- Full API docs: [API.md](../docs/API.md)
- Build/setup: [BUILD.md](../docs/BUILD.md)
- Architecture: [ARCHITECTURE.md](../ARCHITECTURE.md)

---

## Contribuir

1. Ver [CONTRIBUTING.md](../CONTRIBUTING.md)
2. Usar Conventional Commits
3. Tests obligatorios
4. Update documentación

---

**Versión:** 0.1.0
**Última Actualización:** 2025-03-24
