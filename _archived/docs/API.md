```yml
Tipo: Documentación Técnica Detallada
Categoría: API REST
Versión: 0.1.0
Propósito: Documentación completa de endpoints, autenticación y ejemplos
Objetivo: Proporcionar guía detallada para usuarios de API
Fecha actualización: 2026-03-25
```

# Documentación de API

## Propósito

Documentación completa y detallada de la API REST: endpoints, autenticación, ejemplos, y mejores prácticas.

> Objetivo: Que desarrolladores puedan integrar fácilmente con la API siguiendo ejemplos prácticos.

---

## Descripción General

Documentación completa de endpoints, autenticación y ejemplos de uso.

Esta API proporciona endpoints para [descripción general].

**Base URL:** `https://api.example.com/v1`
**Versión:** 0.1.0

---

## Autenticación

### API Keys

Obtener API key:
1. Registrarse en [plataforma]
2. Ir a Settings → API Keys
3. Generar nueva clave
4. Incluir en headers: `Authorization: Bearer YOUR_API_KEY`

### Headers Requeridos

```
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
```

### Seguridad

- Nunca exponer API keys en código
- Usar variables de ambiente: `.env` (gitignored)
- Rotar keys periódicamente
- Usar HTTPS siempre

---

## Endpoints

### 1. Health Check

**Endpoint:** `GET /health`

Verificar que el servidor está operacional.

**Request:**
```bash
curl -X GET https://api.example.com/v1/health \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Response (200):**
```json
{
  "status": "ok",
  "timestamp": "2025-03-24T10:30:00Z",
  "version": "0.1.0"
}
```

---

### 2. [Endpoint Name]

**Endpoint:** `[METHOD] /[path]`

[Descripción clara del endpoint]

**Request:**
```bash
curl -X [METHOD] https://api.example.com/v1/[path] \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ /* body */ }'
```

**Parameters:**

| Nombre | Tipo | Requerido | Descripción |
|--------|------|-----------|-------------|
| `param1` | string | Sí | Descripción |
| `param2` | integer | No | Descripción |

**Request Body:**
```json
{
  "field1": "value",
  "field2": 123
}
```

**Response (200):**
```json
{
  "id": "123",
  "field1": "value",
  "created_at": "2025-03-24T10:30:00Z"
}
```

---

## Códigos de Status

| Código | Significado | Descripción |
|--------|-------------|-------------|
| `200` | OK | Solicitud exitosa |
| `201` | Created | Recurso creado |
| `400` | Bad Request | Parámetros inválidos |
| `401` | Unauthorized | Autenticación requerida |
| `403` | Forbidden | Sin permiso |
| `404` | Not Found | Recurso no existe |
| `429` | Too Many Requests | Rate limit excedido |
| `500` | Server Error | Error interno |
| `503` | Service Unavailable | Servicio no disponible |

---

## Códigos de Error

### 400 - Bad Request

```json
{
  "error": "INVALID_PARAMETER",
  "message": "Parameter 'email' must be a valid email address",
  "details": {
    "field": "email",
    "value": "invalid-email"
  }
}
```

### 401 - Unauthorized

```json
{
  "error": "UNAUTHORIZED",
  "message": "Invalid or missing API key"
}
```

### 429 - Rate Limit

```json
{
  "error": "RATE_LIMITED",
  "message": "Too many requests",
  "retry_after": 60
}
```

---

## Rate Limiting

- **Límite:** 1000 requests por hora
- **Header:** `X-RateLimit-Remaining`
- **Retry:** Esperar según `Retry-After` header

---

## Ejemplos de Uso

### JavaScript / Node.js

```javascript
const apiKey = process.env.API_KEY;

async function getHealth() {
  const response = await fetch('https://api.example.com/v1/health', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}

getHealth().then(data => console.log(data));
```

### Python

```python
import requests
import os

api_key = os.getenv('API_KEY')
headers = {
    'Authorization': f'Bearer {api_key}',
    'Content-Type': 'application/json'
}

response = requests.get(
    'https://api.example.com/v1/health',
    headers=headers
)

print(response.json())
```

### cURL

```bash
curl -X GET https://api.example.com/v1/health \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json"
```

---

## Webhook Events

*Documentación de webhooks si aplica*

---

## Límites y Cuotas

- Requests por hora: 1000
- Tamaño máximo de body: 10MB
- Timeout: 30 segundos
- Máximo de conexiones simultáneas: 100

---

## Changelog de API

| Versión | Fecha | Cambios |
|---------|-------|---------|
| 0.1.0 | 2025-03-24 | Release inicial |

---

## FAQ

**P: Cómo obtengo una API key?**
R: Regístrate en [plataforma] y ve a Settings → API Keys.

**P: Hay límite de requests?**
R: Sí, 1000 requests por hora.

**P: Qué hacer si recibo 429?**
R: Espera según el header `Retry-After`.

---

## Soporte

- Email: support@example.com
- Slack: #api-support
- Docs: https://docs.example.com

---

**Última Actualización:** 2025-03-24
**Versión de API:** 0.1.0
