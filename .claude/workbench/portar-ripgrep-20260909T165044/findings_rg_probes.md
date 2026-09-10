# Hallazgos de las sondas contra `rg` real (system binary)

- `rg --version`: ripgrep 14.1.0, `-simd-accel,+pcre2`, PCRE2 10.42 con JIT.
- `--json --max-columns 20`: el campo `lines.text` del evento `match` sigue
  llevando la línea COMPLETA (400+ chars), sin truncar a 20 columnas. Es decir
  `--max-columns` NO trunca el campo `lines.text` en modo `--json` (al menos en
  esta versión) — el truncado de texto en modo humano no aplica al JSON.
  Consecuencia: si el puerto necesita acotar el tamaño de una línea larga, se
  hace en post-proceso propio, no delegando a `--max-columns`.
- `--multiline-dotall` SIN `-U`/`--multiline`: 0 matches, exit=1. Confirma la
  documentación de rg: `--multiline-dotall` sólo tiene efecto si el modo
  multilinea (`-U`) también está activo. CON `-U` sí matchea across-newline
  (`foo\nbar` con patrón `foo.bar`), exit=0.
- `--files` sobre un directorio absoluto → devuelve rutas absolutas (confirma
  que no hace falta post-procesar para volverlas absolutas).
- Exit codes: sin coincidencias = 1; error real (regex mal formada) = 2. Firma
  estándar de rg, útil para distinguir "no match" (no es error) de "falla".
- Modo `--json` de contexto (`-A1 -B1`): NO existe un sentinel explícito de
  "salto de grupo de contexto" (a diferencia del `--` de modo texto). El salto
  entre el grupo de MATCH1 (líneas 10-12) y el de MATCH2 (líneas 20-21) se
  detecta SÓLO por discontinuidad en `line_number` (salta de 12 a 20 sin
  eventos intermedios). El puerto debe detectar el salto comparando
  `line_number` contra el `line_number` del evento anterior + 1.

Comando fuente: `probes_rg_output.txt` (mismo directorio), 44 líneas, sonda
ejecutada 2026-09-09 contra el binario `/usr/bin/rg` de este contenedor.
