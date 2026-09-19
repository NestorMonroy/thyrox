# El sujeto de los rojos de TypeScript, y el primer pase estructural

`TASK-THYROX-0192` (board #501). Banco de 2026-09-19.

El arbol publicaba **8160** errores con `tsc --noEmit` desde la raiz. Antes de
corregir ninguno, este banco mide **cual compilacion es el sujeto** y **que
parte de los 8160 es estructura de resolucion contra codigo roto**.

## Lo que decidio el pase

| | |
|---|---|
| Causa dominante | **139 pares (importador, hermano) SIN DECLARAR** en `package.json` — 1559 de los 1773 `TS2307` de alcance propio (88 %) |
| Poblacion vacia | **«declarado pero sin enlazar»: 0 pares.** bun enlaza todo lo declarado |
| Resultado | **8239 → 6864** (−1375); `TS2307` **2235 → 711** (−68 %) |

## La trampa del total

`TS2305` SUBE +216 al declarar. No es regresion: «el modulo no exporta ese
miembro» solo se puede emitir cuando el modulo **ya resuelve**. Un import que
no resolvia cancelaba el analisis aguas abajo. Por eso el veredicto de este
pase es el **delta por codigo**, nunca el total.

## Tres afirmaciones que la medicion refuto

1. **«La raiz no ve el enlace del linker aislado.»** Falso: con
   `moduleResolution: bundler`, `tsc` resuelve subiendo `node_modules` desde el
   ARCHIVO que importa. Era el sub-patron C, cometido en el asiento 1 de este
   mismo banco y corregido en el (`correction` en el manifiesto).
2. **«El subpath es la causa.»** 1548 de 1773 citan un subpath, pero los seis
   paquetes objetivo mas citados YA declaran sus subpaths en `exports`. Sin la
   dependencia declarada no hay `node_modules/@thyrox/<x>`, y ni raiz ni
   subpath resuelven.
3. **«La referencia es el modelo a seguir.»** `ccnmt` tiene **0 node_modules**
   y **0 tsconfig por paquete** sobre 32 paquetes. Su tsconfig mas laxo
   describe su postura declarada, no un verde medido.

## Archivos

- `manifest.jsonl` — la declaracion y los 9 asientos.
- `outputs/census-by-code-{before,after}-install,after-declare}.tsv`
- `outputs/ts2307-thyrox-classified.tsv` — los 168 pares por clase.
- `outputs/per-package-typecheck.txt` — 5 de 10 paquetes en VERDE.
- `probes/declare_deps.py` — la insercion quirurgica.
