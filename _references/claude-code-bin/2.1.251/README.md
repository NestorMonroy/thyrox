# claude-code 2.1.251 — volcado de cadenas

**Esta build NO está extraída.** Sólo tiene `claude_strings.txt`, el volcado de
`strings -n 4` sobre el ejecutable. `2.1.241/` y `2.1.246/` sí traen el corpus
completo (`bunfs-root/`, `src/`, `MANIFEST.tsv`); aquí no hay ninguno de los
tres, y leer este directorio como una extracción daría por medido lo que no lo
está.

Se vendorizó al medir si el cliente tiene un análogo de `.claude/eventos/`
(tarea **#220**): el ejecutable vivo iba una versión por delante del corpus más
reciente, así que la cita habría apuntado a una build que nadie archivó. El
trabajo que lo produjo vive en
`api: scripts/workbench/analogue-in-the-client-20260830T192922/`.

## Qué se midió, y cuándo

| Eje | Valor |
|---|---|
| Instante de la medición | `2026-08-30T19:31:49` |
| `claude_strings.txt` | 47874147 B · 851307 líneas |
| sha256 del volcado | `03e9a9a077fc068a…` |
| sha256 del ejecutable | `fd5f10ff0eb58dae…` |
| Bytes del ejecutable | 214326616 |
| Ruta del ejecutable | `/opt/claude-code/bin/claude` |

Las dos primeras filas son **propiedad de un artefacto congelado**, no de uno
vivo: el archivo no vuelve a cambiar, así que la cifra no envejece. Es la
distinción que `calibration-verified-numbers.md` traza en su corolario.

## La versión la decidió el contenido, no `claude --version`

El literal de tres partes más frecuente del propio volcado, con su margen sobre
el segundo candidato:

| Puesto | Literal (ocurrencias) |
|---|---|
| 1º | **2.1.251 (2048)** |
| 2º | 127.0.0 (129) |

El margen decide: sin él, la versión no está decidida y haría falta otro
discriminador antes de archivar. Es la precaución que :ref:`h-docs-455`
registró, cuando el contenedor actualizó el ejecutable a media sesión y el
volcado estuvo a punto de archivarse bajo la build equivocada.

*Métrica:* ocurrencias (`grep -oE`) de un literal `N.N.N` en el volcado,
agrupadas.
*Ciega a:* una build cuya versión no aparezca como literal — no observado.
