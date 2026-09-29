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
