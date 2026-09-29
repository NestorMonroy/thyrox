---
paths:
  - "src/packages/**"
---

# Dónde vive cada dato y cuándo hay un proceso aparte

Decisión completa, con la medición y las alternativas descartadas:
`kaupamex-docs: source/thyrox/adr/adr-006-tres-niveles-de-persistencia-y-procesos.rst`
(ADR-THYROX-006). Aquí sólo lo que se aplica al escribir código.

## Un proceso aparte sólo donde ya hay frontera de proceso

| Frontera | Transporte |
|---|---|
| cliente ↔ proxy local | HTTP sobre `Bun.serve` |
| CLI ↔ daemon | `control.sock` |
| sesión ↔ sesión | buzón UDS |

Un consumidor que vive en el mismo proceso que sus datos usa una biblioteca. No
se crea un servidor de storage, de datos ni de RAG.

## Tres niveles de persistencia

| Nivel | Cuándo | Cómo se abre |
|---|---|---|
| A · archivo | estado ligado a un proceso o de reemplazo atómico: pid, claves, config, spool | `fs` directo con escritura atómica y modos 0700/0600 (`uds/atomicWrite.ts`) |
| B · SQLite local | registros que se consultan; es el nivel por defecto | `openLocal` de `@thyrox/store` (con `busy_timeout`) |
| C · PostgreSQL | sólo con motivo medido: compartir entre máquinas o escritores concurrentes, o vectores | `openByUrl` de `@thyrox/store`; el motor lo elige la URL |

- **Ningún `new Database(...)` fuera de `@thyrox/store`.** La excepción es una base
  ajena que sólo se lee, como la de Cursor.
- **Todo directorio de datos sale de `resolveDataDir(variable, subdir)`** de
  `@thyrox/config/env/configHome`. Todo directorio de configuración sale de
  `getConfigHomeDir()`, nunca de `homedir()/.claude` escrito a mano.
- Una función que necesite vectores declara qué motor requiere. No existe una
  columna vectorial común a todos los stores: `Bun.SQL` sobre SQLite no carga
  extensiones (H-THYROX-238).

## Estado compartido en caliente entre proxies

Lo que dice qué está ocurriendo **ahora** entre varias instancias del proxy
—leases, rate limits, cuotas, enfriamientos, caché efímera— no va al store:
va por el puerto `SharedStateStore` de `@thyrox/shared-state`, con dos
adaptadores (`memory` para un solo proxy, `redis` con `THYROX_REDIS_URL`).
Credenciales, hallazgos, errores y tareas **no** van ahí.

- Ningún consumidor escribe comandos de Redis: usa el puerto.
- Sin `THYROX_REDIS_URL` con varios proxies, lo que exige vista global
  (lease, cuota global) rehúsa en vez de actuar cada uno por su cuenta.
- `@thyrox/coordination` es otra cosa: el ledger de reclamos entre sesiones.

Decisión: ADR-THYROX-006, revisión 1.1.0 (fases TASK-THYROX-0267 a 0271).
