# Commit Message Templates

Plantillas de mensajes de commit siguiendo **Conventional Commits** para diferentes tipos de cambios.

---

## Estructura

Cada template incluye:
- **Formato base** - type(scope): description
- **Secciones opcionales** - Para explicar cambios complejos
- **Ejemplos** - Casos reales del proyecto

---

## Templates Disponibles

### 0. **commit-message-main.template** (Master Template)

Template principal y completo con todas las secciones de Conventional Commits.

Usar cuando:
- Necesitas referencia completa
- Quieres ver todas las opciones disponibles
- No estás seguro cuál template específico usar
- Necesitas entender la estructura completa de un commit

Cubre: Tipos, scopes, subject, body, footer, ejemplos completos, breaking changes, referencias, co-authored-by

---

### 1. **feature.template**
Para commits de **nueva funcionalidad**.

Usar cuando:
- Agregas nueva característica
- Implementas una feature completa
- Completas una tarea de PM-THYROX

Cubre: qué se implementó, por qué, contexto

---

### 2. **bugfix.template**
Para commits de **corrección de errores**.

Usar cuando:
- Corriges un bug reportado
- Fixes un problema de producción
- Corriges una regression

Cubre: qué estaba roto, por qué, cómo se fixeó

---

### 3. **refactor.template**
Para commits de **reorganización/mejora de código**.

Usar cuando:
- Reorganizas código sin cambiar funcionalidad
- Mejoras mantenibilidad
- Aplicas patrones de diseño

Cubre: por qué se refactorizó, qué cambió estructuralmente, impacto

---

### 4. **documentation.template**
Para commits de **cambios a documentación**.

Usar cuando:
- Actualizas README, guías, ejemplos
- Mejoras docstrings en código
- Agregas nuevas guías

Cubre: qué documentación se agregó/actualizó, tipos de docs, archivos

---

### 5. **task-completion.template**
Para commits cuando **completas una tarea de PM-THYROX**.

Usar cuando:
- Terminas una feature completa (con subtasks)
- Cierras una ROADMAP.md feature
- Completaste una phase entera

Cubre: qué se implementó, checklist de subtasks, testing, deployment

---

### 6. **multiple-files.template**
Para commits que **afectan múltiples archivos**.

Usar cuando:
- El cambio toca múltiples componentes
- Refactor o feature que requiere cambios en varias áreas
- Cambios transversales (database + api + tests)

Cubre: qué files cambiaron por tipo, por qué, impacto

---

## Cómo Usar

### Opción 1: Copiar y Pegar
```bash
# 1. Abre el template en editor
cat .claude/skills/pm-thyrox/templates/feature.template

# 2. Copia el contenido
# 3. Abre tu editor git
git commit

# 4. Pega y completa el template
# 5. Guarda y cierra
```

### Opción 2: Usar como Referencia
```bash
# Lee el template para recordar estructura
cat .claude/skills/pm-thyrox/templates/bugfix.template

# Escribe directamente sin copiar
git commit -m "fix(scope): description"
```

### Opción 3: Configurar como Template Global (Avanzado)
```bash
# Copiar a git config
git config commit.template .claude/skills/pm-thyrox/templates/feature.template

# Ahora git commit abre con el template
git commit
```

---

## Flujo Recomendado

1. **Completas trabajo** (feature, fix, refactor)
2. **Revisa archivos cambiados**: `git status`
3. **Lee cambios**: `git diff`
4. **Elige template apropiado** según tipo de commit
5. **Stagea archivos**: `git add [archivos]`
6. **Abre commit**: `git commit`
7. **Pega o sigue template**
8. **Completa secciones relevantes**
9. **Guarda y cierra editor**

---

## Estructura Base en Todos

```
<type>(<scope>): <description>
                        (línea en blanco)
[body - secciones relevantes del template]
                        (línea en blanco)
[footer - referencias a ROADMAP, issues, etc]
```

---

## Reglas Generales

- **type**: feat, fix, docs, style, refactor, test, chore, perf
- **scope**: api, auth, db, build, docs, tests, roadmap, changelog
- **description**: max 72 caracteres, imperativo, sin punto
- **body**: explicar QUÉ cambió y POR QUÉ (no CÓMO)
- **NO emojis** en ningún lado

---

## Ejemplos Reales Completados

### Feature Completo
```
feat(api): implement user authentication

Implementar sistema completo de autenticación con JWT tokens
y refresh token rotation.

Incluye:
- User registration endpoint
- Login with password hashing
- Token generation y validation
- Refresh token logic
- Middleware de autenticación

Related work:
Closes ROADMAP Phase 2: User Authentication
```

### Bugfix
```
fix(auth): handle null user in token validation

El middleware de validacion de tokens no manejaba el caso
cuando user era null, causando crash en la aplicación.

Ahora:
- Valida que user exista
- Retorna 401 Unauthorized si no existe
- Log de intento de acceso no autorizado
```

### Refactor
```
refactor(database): consolidate user queries

Centralizar todas las queries de usuarios en UserRepository
para evitar duplicación de código y mejorar mantenibilidad.

Cambios:
- Creado UserRepository class
- Movidas todas las user queries
- Actualizado UserService para usar repository
- Tests actualizados
```

---

## Próximo Paso

Ver **`references/commit-helper.md`** para guía completa de Conventional Commits y best practices.

---

**Última actualización**: 2026-03-25
