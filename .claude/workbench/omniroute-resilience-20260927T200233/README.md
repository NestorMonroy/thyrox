# Resiliencia de OmniRoute en el proxy local — clasificador de errores

Porte de `open-sse/services/errorClassifier.ts` (OmniRoute a58000c7, MIT) a
`src/packages/provider/src/proxy/resilience/`, y los dos mecanismos que el
trabajo necesitó: anulación en paralelo para cualquier lenguaje y el detector
de historial en comentarios.

## Alcance del porte

`probes/closure.ts` mide el cierre de importaciones de cada módulo
(`outputs/closure.txt`): el clasificador arrastra 397 archivos (45 856 líneas)
porque consulta el registro de proveedores y la base de datos. Se porta el
núcleo sin ellos:

| Referencia | Aquí |
|---|---|
| `getRegistryEntry` / `getProviderCategory` | `traitsOf(provider)` → `{authType, surface}`; sin rasgos, clave de API (el defecto de la referencia para un proveedor desconocido) |
| señales de baja en la base de datos | `bannedSignals` |
| 403 «Request not allowed» sólo en `claude` | también `anthropic` con credencial OAuth |
| — | `blamesRequest`: la familia traducida al `skipCooldown` del selector |

El oráculo son las pruebas de la referencia, portadas a
`__tests__/proxyErrorClassifier.test.ts`: la referencia no corre sin sus
dependencias (`bun` rehúsa por `zod` ausente) y no se instala nada en ella.

## Anulaciones

Con `bin/annul_parallel`, cada variante en su propia copia:

- `outputs/annul-classifier.tsv`: 35 de 36 variantes discriminan.
  `fakelength` no. Con las listas de señales actuales la frase más larga tiene
  41 caracteres, y 41/401 queda por debajo de la cobertura mínima de 0.12, así
  que ningún texto de más de 400 caracteres llega al tope de longitud. El tope
  se conserva: es de la referencia y deja de ser redundante con una señal de
  49 caracteres o más.
- `outputs/annul-history-comment.tsv`: 15 de 15.
- `outputs/annul-annul-parallel.tsv`: 5 de 5. El mecanismo se anula a sí
  mismo, con su prueba leyendo el sujeto de `ANNUL_PARALLEL_MODULE`.

## `annul_parallel`: tres lenguajes

- La prueba se corre con `bun test`, `python3` o `bash` según su extensión, y
  se leen `(fail)` o las líneas `ok`/`FALLA` del árbol.
- La copia se mide como el original:
  - cada hermano se enlaza a su lado, para lo que se carga por ruta (`with_name`);
  - cada especificador relativo se ancla al directorio del original (`../x.ts`).
- Una prueba que sale con error sin nombrar fallos cuenta como un fallo.

## Detector de historial en comentarios

`src/hooks/detect_history_comment.py`, en `pretooluse_dispatch`:

- **Qué mira:** los comentarios y docstrings que se añaden en TypeScript,
  Python y shell, con el lenguaje resuelto por la extensión o por el shebang.
- **Qué marca:** fechas, bitácora, «antes era…», «la versión anterior»,
  rondas, episodios e ids de hallazgo.
- **Qué hace:** avisa, no bloquea.
- **Ciego a:** la historia narrada sin esas marcas.

```bash
python3 tests/hooks/test_detect_history_comment.py
bash tests/verify/test-annul-parallel.sh
(cd src/packages/provider && bun test __tests__/proxyErrorClassifier.test.ts)
```

## Lotes que implementan: `headless-pool --isolation worktree`

Antes de este trabajo, un ítem de `headless-pool` sólo leía (`--tools Read`)
y todos compartían un directorio. La única vía que implementaba era
`pool_pipeline`, atada a los diagnósticos de tsc: los ítems proponen
ediciones en JSON y un paso aparte las aplica en un worktree.

La forma general, equivalente a un subagente con `isolation: worktree`:

- **`item_worktree.sh`:**
  - `prepare`: crea el worktree del ítem desde HEAD, bajo el directorio común
    de git;
  - `finalize`: guarda el parche, los archivos y el veredicto, y retira el
    worktree;
  - `sweep`: retira lo que quede de la ejecución.
- **`pool_integrate.sh`:** aplica en orden lo verificado y disjunto, declara
  `conflicto: <archivo>` y no commitea.

Anulaciones, con `bin/annul_parallel` sobre
`tests/session/test-headless-pool-worktree.sh`:

- `outputs/annul-item-worktree.tsv`
- `outputs/annul-pool-integrate.tsv`
- `outputs/annul-headless-worktree.tsv`

**Lo que destaparon:**

1. **Un camino al directorio padre dejaba la copia sin arrancar.** Las seis
   variantes de `headless-pool` daban el mismo resultado, porque la copia no
   resolvía `$HP_HERE/../lib`. `annul_parallel` ahora monta un árbol sombra
   del repositorio, y la copia ocupa el lugar del original.
2. **Con seis variantes a la vez, una dejaba un worktree huérfano.** La
   variante sola no lo reproduce. La causa, inferida y no medida, es que
   `worktree add`/`remove` chocan con el candado de otro ítem. Se reintentan,
   y el pool barre al terminar; el barrido tiene su propio caso determinista.
