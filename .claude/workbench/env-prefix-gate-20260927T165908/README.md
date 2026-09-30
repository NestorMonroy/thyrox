# Gate de prefijo THYROX_* y cobertura de pruebas de las variables propias

Directiva del ejecutor 2026-09-27: *«necesitamos crear pruebas de si nuestras
variables de entorno ya usan el prefijo THYROX_* y de si se tienen las pruebas
correspondientes»*. Mecanismo: `src/verify/checkEnvPrefix.ts`, suite
`tests/verify/checkEnvPrefix.test.ts`, cableado en `.githooks/pre-commit`.

## Estado medido al cablearlo

`bun src/verify/checkEnvPrefix.ts --root .` (las cifras vivas las publica el
gate; éstas son del episodio):

- 1804 lecturas de entorno en 3491 archivos de producción versionados:
  propias 152, proveedor (ANTHROPIC_*) 93, cliente ajeno (CLAUDE_*) 638, sin
  prefijo de producto 921.
- Las 638 lecturas CLAUDE_* son 494 pares archivo·nombre: la deuda del
  renombre, congelada en `src/verify/env_prefix_baseline.tsv`.
- 62 variables THYROX_* propias; al empezar, 7 sin ninguna prueba que las
  nombrara. Las 7 tienen ahora prueba y el baseline de cobertura está vacío.

## Las 7 pruebas nuevas, cada una con su anulación

| Variable | Suite | Anulación → cae |
|---|---|---|
| THYROX_SRC | tests/agents/test-reconcile-agents-reader.sh | 5 de 5 (sin el canal no clasifica nada) |
| THYROX_JOBS_ARCHIVE_DIR | tests/session/test-wait-jobs-archive-dir.sh | las 3 del caso 1; el 2 sobrevive |
| THYROX_TOOLCHAIN_MANIFESTS_REQUIRED/OPTIONAL | tests/lib/test-toolchain-manifests.sh | los 2 casos nuevos |
| THYROX_TOOLCHAIN_AWK_PROBE_INPUT | tests/lib/test-toolchain-gawk.sh | el caso 15 |
| THYROX_TOOLCHAIN_TEXLIVE_PROBE_DOC | tests/lib/test-toolchain-texlive.sh | el caso declarado; el de llamada sobrevive |
| THYROX_TS_WIDTH | tests/verify/test-run-ts-isolated.sh | el caso con la variable; el de nproc sobrevive |

## Lo que la medición corrigió

1. **La primera regla de shell contaba prosa y locales.** Contaba cualquier
   `$THYROX_*`: prefijos de familia en comentarios (`THYROX_CACHE_<CLONE>`),
   guardas `${X:-}`, asignaciones sueltas, un `declare -ga`. 16 «sin prueba»
   bajaron a 7 al restringirla a las formas de contrato de entorno: valor por
   defecto no vacío, `export`, `unset` y prefijo de comando.
2. **Una expresión por nombre sobre cada prueba costaba 20 s**; una pasada
   por texto, 2.3 s.
3. **Dos anulaciones no hicieron caer nada**, y la causa estaba escrita en el
   caso 12 de `test-toolchain-gawk.sh`: la guarda de idempotencia de
   `toolchain.sh` hace del `source` de un hijo un no-op cuando el padre ya lo
   cargó. Los casos nuevos leían el entorno heredado, no el archivo. Con
   `env -i`, cada anulación tumba su caso.
4. **Anular `wait-jobs.sh` en una copia no vale**: resuelve su raíz desde su
   propia ubicación y la copia falla por otra causa. Se anuló en sitio y se
   restauró.

Métrica: lecturas por nombre literal en archivos versionados de producción
(TS `process.env`/`readEnv`/`Bun.env`, Python `environ`/`getenv`, shell en
sus formas de contrato), y mención como palabra completa en archivos de
prueba versionados.
Ciega a: la lectura por nombre calculado, a que la prueba que nombra la
variable la ejercite (lo mide la anulación, no el gate) y a los archivos no
versionados.
