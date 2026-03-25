```yml
Tipo: Documentación del Proyecto
Categoría: Guía de Contribución
Versión: 1.0
Propósito: Guía para contribuir al proyecto THYROX
Objetivo: Que contributors sigan procesos consistentes y de calidad
Fecha actualización: 2026-03-25
```

# CONTRIBUTING

## Propósito

Guía para contribuir al proyecto THYROX. Documenta procesos, convenciones, y best practices.

> Objetivo: Asegurar contribuciones de calidad consistentes con los estándares del proyecto.

---

## Antes de Comenzar

### Prerequisites

**Requerido:**<br>
Node.js 18.x o superior<br>
Git 2.30+<br>
GitHub account<br>
Editor de código (VSCode recomendado)

**Opcional:**<br>
Docker<br>
PostgreSQL local<br>
Postman/Insomnia

### Setup Inicial

```bash
# Clonar repositorio
git clone https://github.com/user/thyrox.git
cd thyrox

# Instalar dependencias
npm install

# Setup inicial
npm run setup

# Verificar setup
npm run health-check
```

---

## Proceso de Contribución

### 1. Crear un Issue

Antes de empezar a trabajar, crea un issue describiendo:

**Título claro:** "Feature: X" o "Fix: Y"<br>
**Descripción:** Qué, por qué, cómo<br>
**Contexto:** Información relevante<br>
**Screenshots/Logs:** Si aplica<br>
**Labels:** feature, bug, documentation, etc.

### 2. Crear una Branch

```bash
# Actualizar main
git checkout main
git pull origin main

# Crear branch
git checkout -b feature/nombre-feature
# o
git checkout -b fix/nombre-bug
```

**Convención:** `type/description`<br>
`feature/user-auth`<br>
`fix/login-error`<br>
`docs/update-readme`

### 3. Hacer Cambios

**Código:**<br>
Sigue convenciones del proyecto<br>
Agrega tests para nuevo código<br>
Asegúrate de que tests pasen<br>
Documenta cambios complejos

**Commits:**<br>
Commits frecuentes y descriptivos<br>
Sigue Conventional Commits<br>
Referencia el issue: `fix: login error (fixes #123)`

### 4. Push y Pull Request

```bash
# Push a origin
git push origin feature/nombre-feature

# Crear Pull Request en GitHub
# Rellena el template PR
# Referencia el issue
```

**PR Description:**<br>
Qué cambia<br>
Por qué cambia<br>
Cómo testearlo<br>
Breaking changes (si aplica)<br>
Screenshots/videos<br>
Closes #123

### 5. Code Review

**Espera feedback** de los maintainers<br>
**Responde comentarios** constructivamente<br>
**Haz cambios** según feedback<br>
**Re-request review** después de cambios

### 6. Merge

Una vez aprobado:<br>
Squash commits (si aplica)<br>
Merge a main<br>
Delete feature branch<br>
Close issue relacionado

---

## Convenciones del Código

### JavaScript/Node.js

**Style:** ESLint config del proyecto<br>
**Linter:** `npm run lint`<br>
**Formatter:** Prettier<br>
**Tests:** Jest

**Ejemplo:**

```javascript
// Buen ejemplo
const getUserById = async (userId) => {
  try {
    const user = await db.users.findById(userId);
    if (!user) {
      throw new NotFoundError(`User ${userId} not found`);
    }
    return user;
  } catch (error) {
    logger.error('Error fetching user', { userId, error });
    throw error;
  }
};
```

### Markdown

**Formato:** Markdown estándar<br>
**Line breaks:** `<br>` para HTML<br>
**Headers:** `# Title`, `## Subtitle`, etc.<br>
**Lists:** `-` para viñetas, no números

### Git Commits

Sigue Conventional Commits:

```
feat(api): add user authentication endpoint
fix(db): resolve connection pooling issue
docs(readme): update installation steps
style(code): format with prettier
refactor(service): simplify user service
test(auth): add authentication tests
chore(deps): update dependencies
```

---

## Testing

### Unit Tests

```bash
npm run test
npm run test:watch
npm run test:coverage
```

**Requerimientos:**<br>
Mínimo 80% coverage<br>
Happy path y edge cases<br>
Mocking de dependencias

### Integration Tests

```bash
npm run test:integration
```

**Requerimientos:**<br>
Test contra staging DB<br>
Full workflow testing<br>
Error scenarios

### Manual Testing

- Test en local antes de PR
- Sigue casos de uso documentados
- Prueba en diferentes ambientes
- Verifica breaking changes

---

## Documentation

### Cambios en Código

**Comenta código complejo:**<br>
```javascript
// Evita el N+1 problem al pre-load relations
const users = await User.query()
  .withGraphFetched('posts');
```

### Cambios en API

Actualiza `docs/API.md`:

```
### GET /api/v1/users/:id

Obtiene usuario por ID.

**Parameters:**
- id (string, required): User ID

**Response:**
- 200: User object
- 404: User not found
```

### Cambios en Arquitectura

Actualiza `ARCHITECTURE.md`:

- Decisiones arquitectónicas
- Patrones nuevos
- Cambios en estructura

### Cambios en Proceso

Actualiza `CONTRIBUTING.md` (este archivo):

- Nuevos procesos
- Cambios en convenciones
- Nuevas herramientas

---

## Best Practices

### Code Quality

**DRY:** Don't Repeat Yourself<br>
**SOLID:** Single Responsibility, etc.<br>
**KISS:** Keep It Simple, Stupid<br>
**YAGNI:** You Aren't Gonna Need It

### Naming

**Variables:** Descriptivas, claras<br>
`const userName = 'John';` ✓<br>
`const u = 'John';` ✗

**Functions:** Verbo + sustantivo<br>
`getUserById()` ✓<br>
`getUser()` con múltiples parámetros ✗

### Comments

**Usa cuando:**<br>
Explicas el "por qué", no el "qué"<br>
Código complejo<br>
Workarounds o hacks

**No uses cuando:**<br>
El código es autoexplicativo<br>
El nombre de función/variable es claro

---

## Reportar Issues

### Bug Report

```markdown
**Descripción:** Qué está roto

**Pasos para reproducir:**
1. ...
2. ...
3. ...

**Comportamiento esperado:** Qué debería pasar

**Actual:** Qué pasa actualmente

**Ambiente:**
- OS: Ubuntu 20.04
- Node: 18.0.0
- Versión: 0.1.0

**Logs:**
[Pegá los logs aquí]

**Screenshots:**
[Si aplica]
```

### Feature Request

```markdown
**Descripción:** Qué quieres agregar

**Casos de uso:** Cuándo se usaría

**Diseño propuesto:** Cómo se vería

**Alternativas:** Otros enfoques

**Contexto adicional:** Información relevante
```

---

## Ayuda y Soporte

### Preguntas

Abre un issue con label `question`<br>
O contacta a los maintainers<br>
O revisa la documentación existente

### Discussion

Para discusiones amplias, abre un Discussion en GitHub<br>
No merece un issue individual<br>
Puede llevar a un issue después

### Escalation

Si algo está bloqueado, menciona a los maintainers<br>
Sé respetuoso<br>
Proporciona contexto completo

---

## Code of Conduct

### Principios

**Respeto:** A todos los miembros<br>
**Inclusión:** Bienvenida a todos<br>
**Constructivo:** Feedback helpful<br>
**Profesional:** Comunicación clara

### Prohibido

Abuso, acoso, discriminación<br>
Spam o solicitudes injustificadas<br>
Lenguaje ofensivo<br>
Desviar temas

### Violations

Reporta violations a maintainers<br>
Proporciona evidencia<br>
Mantén privacidad<br>
Se tomarán acciones

---

## Tips para Contribuciones Exitosas

✓ Lee la documentación existente<br>
✓ Sigue las convenciones del proyecto<br>
✓ Tests para todo código nuevo<br>
✓ Commits descriptivos<br>
✓ PRs enfocadas en un tema<br>
✓ Comunica claramente<br>
✓ Sé paciente con reviews<br>
✓ Aprende del feedback<br>
✓ Ayuda a otros contributors<br>
✓ Celebra cuando merges

---

## Recursos

**Documentación:**<br>
README.md - Overview<br>
ARCHITECTURE.md - Arquitectura<br>
ROADMAP.md - Plan del proyecto<br>
docs/ - Documentación detallada

**Links útiles:**<br>
Conventional Commits: https://www.conventionalcommits.org/<br>
GitHub Flow: https://guides.github.com/introduction/flow/<br>
Semantic Versioning: https://semver.org/

---

## FAQ

**Q: ¿Cómo empiezo?**<br>
A: Lee este archivo, luego elige un issue con label `good first issue`

**Q: ¿Puedo trabajar en múltiples issues?**<br>
A: Sí, pero en branches separadas. Una rama = un tema.

**Q: ¿Cuánto tarda el code review?**<br>
A: 24-48 horas normalmente. Depende de la complejidad.

**Q: ¿Qué si mi PR es rechazada?**<br>
A: Es feedback, no rechazo personal. Aprende y intenta de nuevo.

---

**Última Actualización:** 2026-03-25<br>
**Próxima Review:** 2026-04-25<br>
<br>
¡Gracias por contribuir!
