# Pool de escritura del modo rápido y del alcance del modelo de respaldo

Fases R-2b-3, R-2c y R-2b-4 (tabla del banco `socket-sesiones-20260928T180653`),
disjuntas por archivo, para `headless-pool --isolation worktree` con `template.md`
e `items.txt`. `specs/` trae la prueba de R-2b-3 escrita en rojo antes de despachar.

Se lanza con `launch.sh`, bajo `thyrox-bg`; la salida por ítem queda en `outputs/`
y `bin/pool_integrate outputs` aplica lo verificado.

## Resultado de la ejecución

Los tres ítems terminaron `fallido`, con parche vacío (0 bytes) y el mismo
`<n>.err`:

```text
thyrox -p: AnthropicHttpProvider exige credencial: ninguna de ANTHROPIC_AUTH_TOKEN,
THYROX_CODE_OAUTH_TOKEN, THYROX_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR ni ANTHROPIC_API_KEY
está en el entorno. Sin ella, usa RecordedProvider.
```

No se integró nada (`verificados=0`). Los worktrees de los ítems se retiraron
solos. La causa no está en el pool: `thyrox -p` no recibe ninguna credencial
en el shell, y la que el anfitrión da a la sesión no se lee ni se reutiliza.
