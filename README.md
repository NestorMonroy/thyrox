# THYROX

El sistema de gestión de proyecto y agentes. Este árbol es el **producto**; el
THYROX anterior está en `_archived/` (DEC-02) y sólo se reintegra una pieza si
hace falta verla.

## La partición

Viene de la DEC-01, y su precedente medido es `claw-code`:

| Dónde | Qué |
|---|---|
| `src/` | el producto: mecanismos |
| `tests/` | su suite, en espejo |
| `.claude/` | el estado: lo que la sesión escribe y lee |
| `_archived/` | el THYROX anterior, congelado |

`src/` se organiza **por dominio**, no por lenguaje. Cada módulo declara en su
cabecera de dónde se portó y qué cambió respecto de su fuente.

## El lenguaje se elige por dominio, no de forma uniforme

No hay una medida única de «buena solución»: depende del contexto. Cada dominio
declara su lenguaje y la razón de su elección.

| Dominio | Lenguaje | Por qué |
|---|---|---|
| `src/paths/` | Python | sus consumidores son los gates, que se invocan con `python3` pelado. Y no puede depender de una librería de terceros: `python-dotenv` no está instalado en ningún intérprete alcanzable, así que una dependencia ahí convertiría a cada consumidor en un rehúse por precondición ausente. |
| `src/workbench/` | TypeScript | porta un mecanismo que ya existía en TS; reescribirlo en otro lenguaje crearía la segunda fuente de verdad que `calibration-verified-numbers.md` prohíbe. |

Los ejes que la elección pondera, y ninguno domina siempre: rendimiento,
claridad, mantenibilidad, seguridad, escalabilidad, tiempo de desarrollo y
coste. Un mecanismo puede ser rápido y difícil de mantener; otro más lento y
mucho más simple de verificar.

## Convenciones

- **Los identificadores van en inglés** — nombres de archivo, clases,
  funciones, atributos y claves de manifiesto. Una clave de manifiesto es un
  atributo.
- **Los comentarios van en español**, sin coloquialismos, con los términos
  técnicos en inglés (`harness`, `scaffold`, `script`).
- **TDD**: la mitad roja se persiste al producirse. Un `N de N` en verde no
  discrimina «el mecanismo funciona» de «el test no pregunta», así que cada
  arreglo trae su **control de anulación**: se retira, y tienen que caer
  exactamente las aserciones que dependen de él.

## Correr las suites

```bash
bash tests/run.sh          # las dos mitades, con su conteo por separado
bun test tests/            # sólo TypeScript
python3 tests/paths/test_reach.py
```

## El alcance por variable

Los gates de THYROX miden árboles que no son el suyo. Qué árbol se declara por
variable, con una cadena de precedencia de lo más específico a lo más derivado:

```bash
python3 src/paths/reach.py --list
eval "$(python3 src/paths/reach.py --env)"
```
