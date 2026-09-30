# Sonda: compilar thyrox como ejecutable autónomo y extraerlo como la referencia

Fecha: 2026-09-28. Commit fuente: `source-commit.txt`. Bun 1.3.11.

## Qué se midió

1. `bun build --compile src/packages/cli/src/entry/cli.tsx` — compila en 2.73 s
   de pared, 842 MB de memoria pico, y deja un ejecutable de 129 549 033 B
   (`executable.sha256`). `build.log` tiene la salida de GNU Time.
2. Arranque fuera del árbol (`env -i`, cwd `/`): muere con ENOENT sobre
   `/package.json` — `cli.tsx` lee su versión relativa a `import.meta.dir`, que
   dentro del ejecutable es `/$bunfs/root/`. `run-version.txt`, `run-print.txt`.
3. Forma del contenedor: la referencia 2.1.283 (Bun 1.4.3) lleva el payload en
   una sección ELF `.bun`; la compilación propia (Bun 1.3.11) lo pega tras el
   ejecutable: `[payload][Offsets 32 B][magic][u64 largo total]`. El primer u64
   de Offsets es el largo del payload, que empieza esa cantidad antes de
   Offsets. Sondas: `probe-trailer.ts`, `probe-table.ts`, `probe-base.ts`,
   `probe-fixed.ts` y sus `.txt`.
4. Con `locatePayload` en `@thyrox/binary`, `binary info` y `binary extract`
   leen el propio igual que la referencia: 3 entradas, paso 52 (el mismo),
   `binary-info.txt`, `binary-extract.txt`, `corpus/0.0.0-dev/`.

## Lo que no se versiona, y cómo se reproduce

El ejecutable (124 MB, sobre el límite de 100 MB por archivo de GitHub), su
`bunfs-root/` (29 MB) y `claude_strings.txt` (36 MB) se retiraron tras medir.
El `MANIFEST.tsv` conserva el sha256 de cada entrada; se reproducen desde
`source-commit.txt` con el comando del punto 1 y `binary extract --bin <salida>
--declared-version 0.0.0-dev --out <banco>/corpus`.

## Anulaciones (`annul.sh`, `annul-results.txt`)

- Rama de apéndice retirada: caen las 2 pruebas que leen el payload apendizado;
  las de «largo que no cabe» y «sin magic» sobreviven (esperan `null`).
- Límites del encabezado ELF retirados: caen las 2 del ELF truncado y la de
  localizar el apéndice, cuyo prefijo empieza con el magic de ELF.

Censo de lecturas de ruta en tiempo de ejecución: `import-meta-census.txt`.
