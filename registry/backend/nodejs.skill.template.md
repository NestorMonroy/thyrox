# SKILL — Node.js Backend — {{PROJECT_NAME}}

```yml
Tipo: Tech Skill
Tecnología: Node.js
Proyecto: {{PROJECT_NAME}}
Versión: 1.0
```

## Módulos

### ESM por defecto

```ts
// CORRECTO — ESM
import express from 'express'
import { Router } from 'express'
export const router = Router()

// Solo CJS si el ecosistema lo requiere (ej: Jest sin configuración)
const express = require('express')
```

### Barrel exports

```ts
// src/services/index.ts
export { AuthService } from './auth.service'
export { UserService } from './user.service'
```

## Async/Await

```ts
// CORRECTO
async function getUser(id: string): Promise<User> {
  const user = await db.users.findById(id)
  if (!user) throw new NotFoundError(`User ${id} not found`)
  return user
}

// Paralelo
const [user, posts] = await Promise.all([
  getUser(userId),
  getPosts(userId),
])

// INCORRECTO — callbacks
db.users.findById(id, (err, user) => { ... })
```

### Try/catch

Solo en los límites del sistema (controllers, handlers de error). **No capturar y silenciar.**

## Estructura Express/Fastify

```
src/
├── routes/         # auth.routes.ts, user.routes.ts
├── controllers/    # auth.controller.ts (req/res)
├── services/       # auth.service.ts (business logic, sin req/res)
├── middleware/     # auth.middleware.ts, error.middleware.ts
├── models/         # user.model.ts
└── utils/          # helpers, validators
```

### Rutas

```ts
// src/routes/auth.routes.ts
import { Router } from 'express'
import { AuthController } from '../controllers/auth.controller'

export const authRouter = Router()
authRouter.post('/login', AuthController.login)
authRouter.post('/refresh', AuthController.refresh)
```

### Middleware de error al final

```ts
// src/app.ts
app.use('/api/auth', authRouter)
app.use('/api/users', userRouter)
app.use(errorMiddleware) // SIEMPRE al final
```

## Testing

### Framework: Jest o Vitest

```ts
import request from 'supertest'
import { app } from '../src/app'

describe('POST /api/auth/login', () => {
  it('returns 200 with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@test.com', password: 'pass123' })

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('token')
  })
})
```

### Commands

```bash
# Tests
npm test

# Coverage
npm run test:coverage

# Watch
npm run test:watch
```

## Seguridad

| Riesgo | Mitigación |
|--------|-----------|
| SQL injection | Parámetros en queries — NUNCA interpolación |
| XSS | Sanitizar output antes de serializar |
| Input malicioso | Validar con Zod o Joi en límite de API |
| Headers inseguros | Helmet middleware |

```ts
// CORRECTO — Zod en el límite
const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

const body = LoginSchema.parse(req.body) // lanza si inválido
```
