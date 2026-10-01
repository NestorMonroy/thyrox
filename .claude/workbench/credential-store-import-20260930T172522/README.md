# credential-store-import

## El encargo

«Construir primero la herramienta que falta, un `bin/` que importe una
credencial al store de conexiones, con su prueba», vía pool, revisando antes
lo implementado contra lo que falta.

## La premisa, si se corrigio al primer comando

**La premisa era falsa, y era mía.** Afirmé que ningún envoltorio ni comando
alimentaba el store. Medido (`outputs/module_surface.txt`):
`connectionStore.ts` y `connectionStoreHome.ts` los consume
`src/packages/cli/src/commands/providers-commands.ts`, que registra
`thyrox providers <verbo>` con `list`, `remove`, `test`, `test-all`,
`validate`, `add`, `edit`, `import` y `login`. La prueba
`src/packages/cli/__tests__/providersAnthropicCredential.test.ts` ya cubre el
camino completo: `providers add anthropic --credential-env <VAR>` guarda la
clave cifrada bajo el id que lee `resolveCredential`, y `providers test` la
prueba. La credencial entra por una variable nombrada, por stdin o por un
prompt oculto; nunca por un argumento.

El ensayo, con un store aislado y una clave falsa:

```text
THYROX_PROVIDERS_DATA_DIR=<scratch> FAKE_PROBE_KEY=… bin/cli providers add anthropic --credential-env FAKE_PROBE_KEY --dry-run
dry-run: would add claude/claude      exit=0
```

`providers login claude` no sirve aquí: rehúsa sin
`THYROX_CLAUDE_OAUTH_CLIENT_ID`, y con ella necesita navegador y un servidor
de callback local.

## Lo que sí falta — dos defectos, dos tareas

1. **TASK-THYROX-0657.** Ningún documento nombra esta vía: `providers add`
   da 0 menciones en `README.md`, `.claude/rules/`, la cabecera de
   `headless-pool.sh` y `kaupamex-docs: source/thyrox/arquitectura/operacion-repository-job.rst`.
   Y el rechazo de `bin/provider-credential-proxy` en modo `proxy-store` sólo
   pide variables de entorno, aunque el pool ya derivó que la fuente es el
   store. Es lo que desvió el análisis: el mensaje nombra una salida y calla
   la otra.
2. **TASK-THYROX-0658.** El ensayo no es inerte: con un directorio de store
   vacío, `--dry-run` creó `connections.sqlite3`.

## Las piezas

| archivo | que hace |
|---|---|
| `probes/module_surface.sh` | exports, pruebas y consumidores de un módulo |
| `outputs/module_surface.txt` | la superficie de los nueve módulos, medida con `bin/parallel_map` |

*Metrica:* consumidores fuera de pruebas, verbos registrados y exit del ensayo.
*Ciega a:* otros proveedores y el flujo OAuth real.
