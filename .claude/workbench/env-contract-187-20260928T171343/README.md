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
