# SKILL — PostgreSQL — {{PROJECT_NAME}}

```yml
Tipo: Tech Skill
Tecnología: PostgreSQL
Proyecto: {{PROJECT_NAME}}
Versión: 1.0
```

## Naming Conventions

| Elemento | Convención | Ejemplo |
|----------|-----------|---------|
| Tablas | snake_case plural | `users`, `order_items` |
| Columnas | snake_case | `created_at`, `user_id` |
| Índices | `idx_{tabla}_{columna}` | `idx_users_email` |
| Foreign keys | `fk_{tabla}_{referencia}` | `fk_orders_user_id` |
| Constraints | `chk_{tabla}_{desc}` | `chk_users_email_format` |

## Schema

### Template de tabla

```sql
CREATE TABLE users (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT        NOT NULL UNIQUE,
  name        TEXT        NOT NULL,
  deleted_at  TIMESTAMPTZ NULL,         -- soft delete
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para foreign keys y filtros frecuentes
CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_deleted_at ON users (deleted_at) WHERE deleted_at IS NULL;
```

### Reglas

- `id UUID DEFAULT gen_random_uuid()` o `id SERIAL` según necesidad
- Timestamps: siempre `TIMESTAMPTZ` (con zona horaria)
- Soft delete con `deleted_at TIMESTAMPTZ NULL`
- NOT NULL por defecto — NULL solo cuando tiene semántica propia (ej: `deleted_at`)

## Migrations

### Naming

```
YYYYMMDDHHMMSS_descripcion_breve.sql
20240315143022_create_users_table.sql
20240316090000_add_profile_to_users.sql
```

### Reglas

- Las migrations son **irreversibles en producción** — planificar bien
- Agregar índices en migration separada de la creación de tabla
- **NUNCA** `DROP COLUMN` sin período de deprecación previo
- Siempre probar en entorno staging antes de aplicar en producción

### Commands

```bash
# Knex
npx knex migrate:latest
npx knex migrate:rollback
npx knex migrate:status

# Alembic (Python)
alembic upgrade head
alembic downgrade -1
alembic current
```

## Índices

### Cuándo indexar

- Toda foreign key debe tener índice
- Columnas de filtro frecuente (`WHERE`, `JOIN ON`)
- Índice parcial cuando el filtro es selectivo:

```sql
-- Solo indexar usuarios activos
CREATE INDEX idx_users_active ON users (email)
WHERE deleted_at IS NULL;
```

### Verificar con EXPLAIN

```sql
EXPLAIN ANALYZE
SELECT * FROM users WHERE email = 'user@example.com';
-- Si aparece "Seq Scan" en tabla grande → considerar índice
-- Si aparece "Index Scan" → el índice se usa
```

## Transacciones

```sql
-- Operaciones multi-tabla
BEGIN;
  INSERT INTO orders (user_id, total) VALUES ($1, $2) RETURNING id INTO order_id;
  INSERT INTO order_items (order_id, product_id, qty) VALUES (order_id, $3, $4);
COMMIT;

-- Si algo falla
ROLLBACK;
```

| Nivel | Cuándo usar |
|-------|------------|
| `READ COMMITTED` (default) | Mayoría de casos |
| `REPEATABLE READ` | Reportes que no deben ver cambios intermedios |
| `SERIALIZABLE` | Consistencia estricta (caro — solo si necesario) |

## Commands Útiles

```bash
# Conectar
psql -U {user} -d {database}
psql -U {user} -d {database} -h localhost

# Listar bases de datos
psql -c '\l'

# Listar tablas
psql -d {database} -c '\dt'

# Ver tamaño de tabla
psql -d {database} -c "SELECT pg_size_pretty(pg_total_relation_size('users'));"
```
