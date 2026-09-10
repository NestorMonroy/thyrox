# claude-code 2.1.250 — volcado de cadenas

**Esta build NO está extraída.** Sólo tiene `claude_strings.txt`, el volcado de
`strings -n 4` sobre el ejecutable. `2.1.241/` y `2.1.246/` sí traen el corpus
completo (`bunfs-root/`, `src/`, `MANIFEST.tsv`); aquí no hay ninguno de los
tres, y leer este directorio como una extracción daría por medido lo que no lo
está.

Se vendorizó para cerrar la tarea **#932** por su opción 1: el ejecutable vivo
iba cuatro versiones por delante del corpus, así que toda cita a «el binario de
esta sesión» apuntaba a algo que nadie había archivado.

## Qué se midió, y cuándo

| Eje | Valor |
|---|---|
| Instante de la medición | `2026-08-28T06:12:27` |
| `claude_strings.txt` | 55 905 022 B · 846 346 líneas |
| sha256 del volcado | `f8780cf4bfd9e4f6…` |
| sha256 del ejecutable | `2be252a00ac56e70…` |
| Ruta del ejecutable | `/opt/claude-code/bin/claude` |

Las dos primeras filas son **propiedad de un artefacto congelado**, no de uno
vivo: el archivo no vuelve a cambiar, así que la cifra no envejece. Es la
distinción que `calibration-verified-numbers.md` traza en su corolario.

## La versión la decidió el contenido, no `claude --version`

El literal de tres partes más frecuente del propio volcado, con su margen sobre
el segundo candidato:

```
   2026 2.1.250
    126 127.0.0
    103 1.2.840
```

**16×** de margen. El procedimiento y el porqué están en
`docs: .claude/rules/redaccion-tecnica-es.md`, sección «Cómo se aplica»; el
episodio que lo obliga es :ref:`h-docs-455`, donde el volcado de 2.1.246 se tomó
en una sesión cuyo `claude --version` respondía 2.1.247.

*Métrica:* ocurrencias de un literal `N.N.N` en el volcado, agrupadas.
*Ciega a:* una build cuya versión no aparezca como literal, y al empate — que
aquí no ocurre, pero no está garantizado.

## Su procedencia es ejecutable

El archivo no se archivó a mano: lo produce
`.claude/eventos/persistencia-binario-20260828T061033/vendorizar_volcado.sh`,
que vuelca, deriva la versión por frecuencia con margen mínimo de 3×, y **rehúsa
sin dejar residuo** si el margen no alcanza. Su control es
`controles/margen-imposible.sh`, en el mismo evento.
