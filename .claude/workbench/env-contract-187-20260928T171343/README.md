# #187 — dos rojos de la suite: contrato de entorno y aritmética de ruta

## Contrato de entorno (`test_env_contract_keys`)

Antes (`before.txt`): 423 claves leídas, 117 declaradas, **319 sin declarar**.
225 son `THYROX_CODE_*`, los conmutadores del cliente portado renombrados de
`CLAUDE_CODE_*` por `renameEnvPrefix.ts`; el resto, credenciales de cliente
OAuth y claves de paquetes (`provider` 81, `agent` 56, `cli` 27…).

`probes/declare_missing.py` las anexa a `.env.example` agrupadas por el archivo
que las lee primero, vacías: rige el default del código. Las de cliente OAuth
van vacías también — no se publica ningún identificador de terceros.

Después: 423 leídas, 436 declaradas, **0 sin declarar**; la suite pasa. El
control que discrimina es el propio caso negativo de la suite (retira una clave
real y el gate la nombra).

*Métrica:* claves `THYROX_*` que el gate ve leídas, contra las declaradas.
*Ciega a:* si el comentario de grupo explica el significado de cada clave —
sólo nombra quién la lee—.

## Aritmética de ruta (`test_path_arithmetic`)

Ocho sitios nuevos fuera del baseline: cinco con el bootstrap partido
(variable y luego inserción, que el gate prohíbe) y tres `parents[2]` mudos
(un default de gate, una ruta de módulo, una raíz de prueba).
`probes/split_bootstrap_to_reach.py` reescribe los cinco a la forma admitida;
los tres restantes pasan a `reach.thyrox_root()`. Suite: 16/17 → 17/17, y las
siete pruebas tocadas siguen en verde.

## Las cinco suites de shell restantes

`remaining/summary.txt` las lista rojas; `remaining/*.log` guarda cada salida.

- **githooks (4 pruebas)** — cada fixture llevaba su lista de sustitutos a
  mano y el hook ganó gates que ninguna tenía (`check_md_relative_links.py`,
  `checkEnvPrefix.ts`). `tests/githooks/stub_hook_gates.sh` los deriva del
  hook; con la derivación anulada caen las cuatro.
- **check-skill-artifacts** — siete líneas de SKILL.md se reescribieron en el
  barrido de vocabulario sin su fuente en `src/skills/definitions/`; se
  alinearon las fuentes. 6/8 → 8/8.
- **script-naming** — el gate de identificadores empezó a ver nombres de
  subcomando (`e7a82551`) y sólo el baseline hermano se congeló; se regeneró
  éste. Las entradas que retira son deuda ya pagada. 30/31 → 31/31.
- **suite-discrimina** — su caso 6 depende de que script-naming esté verde;
  con ella verde, 41/43 → 43/43 (`remaining/test-suite-discrimina.after.log`).
