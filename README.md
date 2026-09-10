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
| `src/coordination/` | TypeScript | su único consumidor es `claims.ts`, que ya es TS. Un módulo en otro lenguaje no podría importarse desde ahí, así que la ubicación seguiría declarada dos veces — que es el defecto que este módulo cierra. |

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

## Portar cuando el hermano no existe

El grafo de los paquetes que faltan **no tiene hoja**: 19 paquetes ausentes,
41 pares mutuamente dependientes. Esperar a que el hermano exista es esperar
indefinidamente, así que la **inyección del colaborador ausente** no es una
preferencia — es el único método que corta la arista del ciclo, y queda
adoptada por medición.

Lo que la inyección **no** resuelve es a qué archivos aplica. Tres clases, y la
frontera es si el archivo tiene lógica propia que un test pueda ejercitar:

| Clase | Cómo se reconoce | Qué se hace |
|---|---|---|
| **lógica propia** | aritmética, precedencia, filtro, orden — hay algo que puede salir mal | se inyecta el colaborador ausente, se porta la lógica y **se testea** |
| **cableado puro** | el cuerpo del archivo **es** el wiring de dos hermanos; sin ellos no queda nada que ejercitar | porte verbatim con la ausencia **declarada archivo por archivo**, y **sin test** |
| **condición de compilación ausente** | depende de un macro que este entorno no tiene (`bun:bundle` → `Cannot find package 'bundle'`) | el gate se **omite**, no se sustituye |

**Por qué el cableado puro no lleva test, y no es pereza.** Inyectarle sus dos
hermanos daría una función que recibe todo y no hace nada: un control que no
puede fallar, que es exactamente lo que las Convenciones de arriba prohíben. Un
test ahí no mide el porte — mide que la inyección compila.

**Por qué el macro ausente se omite en vez de sustituirse.** Sustituirlo por un
valor fijo decide, en silencio y para siempre, la rama que el macro elegía en
tiempo de compilación. Precedentes medidos: `runtimeActivation.ts` y
`storage/sessionStoragePredicates.ts` quedaron permanentemente apagados por esa
vía antes de que la clase tuviera nombre.

La clase se declara **en el docstring del puerto**, junto a su procedencia: quien
lo lea tiene que poder saber por qué no hay test sin ir a buscar el criterio.

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
