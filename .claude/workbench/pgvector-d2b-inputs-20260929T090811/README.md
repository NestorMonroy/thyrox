# Entradas medidas de D2b (pgvector) — sin decisión

Sondas de solo lectura, `bash bin/parallel_map "bash probe.sh {} ..." ::: <5 sondas>`,
salida en `results.tsv`. La decisión 0.6.0 frente a ≥0.7/0.8.x sigue esperando a D5.

- Disponible por apt: sólo `0.6.0-1` (archive.ubuntu.com).
- Instalado en `thyrox_test`: el tipo `vector`; índices `hnsw` e `ivfflat` con
  `vector_l2_ops`, `vector_ip_ops` y `vector_cosine_ops`. Sin `halfvec` ni `sparsevec`.
  El tipo `bit` que aparece es el nativo de PostgreSQL, no de pgvector.
- Compilar ≥0.7 aquí: gcc, make, pg_config y pgxs presentes; faltan las cabeceras
  del servidor (`postgres.h`), o sea `postgresql-server-dev-16`.
- Última etiqueta upstream: `v0.8.6` (`git ls-remote`).
- El repositorio PGDG responde (HTTP 200): otra fuente empaquetada posible; qué
  versión ofrece para PostgreSQL 16 no está medido.

Ciego a: rendimiento, recall y memoria de cada índice; eso exige el volumen y la
dimensionalidad de D5. Las variables `hnsw.*`/`ivfflat.*` no salen porque la
biblioteca no estaba cargada en la sesión de la sonda.

## PGDG, medido después (índice `noble-pgdg/main/binary-amd64/Packages.gz`)

- `postgresql-16-pgvector`: `0.8.5-1.pgdg24.04+1`, `0.8.6-1.pgdg24.04+1`, `0.8.6-1.pgdg24.04+2`.
- `0.8.6-1.pgdg24.04+2` declara `Depends: postgresql-16, libc6 (>= 2.38)`, sin versión
  mínima del servidor; aquí corre `postgresql-16 16.13-0ubuntu0.24.04.1`.
- Por tanto hay una ≥0.8 empaquetada sin compilar. Ciego a: si añadir el repositorio
  PGDG arrastra además un `postgresql-16` más nuevo en la próxima actualización (depende
  de la prioridad de apt, no del índice), y a la conducta de la extensión instalada.

## Orden acordado con el ejecutor (2026-09-29)

D2b sigue abierto hasta que D5 fije: entidades, volumen inicial y crecimiento, modelo,
dimensionalidad, denso frente a disperso, necesidad de `halfvec`, patrón de escritura,
`top_k`, objetivo de recall y latencia, y presupuesto de memoria y almacenamiento.
Después se mide exacto frente a HNSW frente a IVFFlat con un corpus representativo.
0.6.0 basta para un primer corte con embeddings densos. La preferencia «paquete PGDG
antes que compilar» quedó RETIRADA por H-THYROX-256 (ver la sección siguiente).

## Simulación APT con PGDG, sin tocar el sistema (2026-09-29)

Configuración APT privada (fuentes, listas y caché en el scratchpad; `/etc/apt` y
`/var/lib/apt` intactos, comprobado con md5 de `sources.list.d` y `preferences.d`
vacío). Salida en `apt-simulation.txt`.

- **Sin pinning, instalar sólo `postgresql-16-pgvector` ya migra el servidor**:
  `postgresql-16` 16.13 Ubuntu → 16.15 PGDG, `postgresql-client-16` igual, y `libpq5`
  16.13 → **18.6** (cambio de versión mayor de la biblioteca cliente). Un `upgrade`
  después movería también `postgresql-common` 257 → 293.
- **Con pinning (`pgdg-pgvector-only.pref`: PGDG a 100, pgvector de PGDG a 600) la
  instalación es imposible**: `postgresql-16-pgvector : Breaks: postgresql-16-jit-llvm (< 19)`.
  El `postgresql-16` de Ubuntu declara `Provides: postgresql-16-jit-llvm (= 17)`
  (JIT sobre LLVM 17); el de PGDG, `(= 19)`. La razón del Breaks es inferida, no medida:
  el bitcode de JIT de pgvector compilado con LLVM 19 no lo carga un JIT de LLVM 17.

Consecuencia para D2b: «PGDG 0.8.6 sólo para pgvector» no existe. Las opciones reales son
(1) quedarse en 0.6.0 Ubuntu; (2) migrar el servidor completo a PGDG, a propósito,
fijando además `libpq5` si no se quiere la 18; (3) compilar pgvector ≥0.7 contra el
servidor de Ubuntu (`postgresql-server-dev-16` de Ubuntu, sin tocar el servidor).
La (3) es la única que conserva el PostgreSQL de Ubuntu con una versión moderna.

## Regla de decisión vigente tras H-THYROX-256 (acordada con el ejecutor, 2026-09-29)

1. Si D5 queda cubierto por 0.6.0: se conserva pgvector 0.6.0 de Ubuntu.
2. Si D5 exige capacidades de 0.8.x y se conserva el PostgreSQL 16 de Ubuntu: compilar
   pgvector contra ese servidor (`postgresql-server-dev-16` de Ubuntu).
3. Migrar el servidor, el cliente y `libpq` a PGDG sólo con una razón independiente de
   pgvector; nunca únicamente para obtener una extensión más nueva.

Evidencia: los `Breaks`/`Provides` declarados y los cambios que APT propone
(`apt-simulation.txt`). Inferencia no medida: la causa concreta del `Breaks` en LLVM/JIT.
No se tocan los repositorios APT reales ni `toolchain.sh` hasta que D5 concluya que 0.6.0
no basta.
