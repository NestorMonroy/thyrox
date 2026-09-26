#!/usr/bin/env bash
# test-toolchain-texlive.sh — contrato de la adquisicion de TeX Live
# (`xelatex` y los paquetes que el consumidor declara).
#
# El defecto que cierra: un consumidor que compila notas con XeLaTeX no tenia
# en thyrox ni sonda ni instalador; TeX se instalaba a mano, sin dejar rastro
# de que faltaba ni de como verificarlo.
#
# El caso que DISCRIMINA es el 4: `xelatex` PRESENTE y un documento que no
# compila porque falta un paquete. Un guard de solo presencia pasa del 1 al 3
# y falla ahi. El 5 mide que el exit del compilador no decide: sale 0 sin PDF.
# El 7 mide que un consumidor que no declara TeX no recibe un aviso que
# saldria siempre: la sonda se OMITE y lo dice, en vez de aprobar sin medir.
#
# Los controles 9 y 10 son reales: `xelatex` del sistema sobre un documento
# con polyglossia en espanol, y sobre uno que pide un paquete inexistente.
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
SUBJECT="$ROOT/src/lib/toolchain.sh"
source "$ROOT/src/lib/assert.sh"
ok()  { thyrox_ok "$*"; }
bad() { thyrox_fail "$*" || true; }

source "$SUBJECT" 2>/dev/null || true
unset THYROX_TOOLCHAIN_TEXLIVE_PACKAGES THYROX_TOOLCHAIN_TEXLIVE_PROBE_FILE THYROX_INSTALL_TEXLIVE

# Caso 1 — las piezas existen.
if type thyrox_toolchain_require_texlive &>/dev/null \
   && type thyrox_toolchain_texlive_compiles &>/dev/null \
   && type thyrox_toolchain_probe_texlive &>/dev/null; then
  ok "el guard, su sonda de compilacion y la sonda del preflight existen"
else
  bad "faltan thyrox_toolchain_require_texlive / _texlive_compiles / _probe_texlive en $SUBJECT"
  thyrox_summary; exit 1
fi

T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT
MISSING="thyrox-xelatex-que-no-existe-$$"

# Un xelatex falso que escribe el log y, segun el modo, el PDF. Respeta
# -output-directory y el nombre del .tex, como el real.
fake() {  # fake <ruta> <modo: pdf|nopdf|missing-sty>
  cat > "$1" <<SH
#!/usr/bin/env bash
out=.; tex=
while (( \$# )); do case "\$1" in -output-directory) out="\$2"; shift 2;; -output-directory=*) out="\${1#*=}"; shift;; -*) shift;; *) tex="\$1"; shift;; esac; done
base="\$(basename "\$tex" .tex)"
case "$2" in
  pdf)   echo log > "\$out/\$base.log"; printf '%%PDF-1.4 fake' > "\$out/\$base.pdf"; exit 0;;
  pdf-if-doc) echo log > "\$out/\$base.log"; grep -q 'documentclass' "\$tex" && printf '%%PDF-1.4 fake' > "\$out/\$base.pdf"; exit 0;;
  nopdf) echo log > "\$out/\$base.log"; exit 0;;
  missing-sty) printf '! LaTeX Error: File \`polyglossia.sty'"'"' not found.\n' | tee "\$out/\$base.log"; exit 1;;
esac
SH
  chmod +x "$1"
}

# Caso 2 — EJE 1, presencia: ausente y sin opt-in REHUSA con exit 2, nombra el
# binario y el opt-in, y no emite conteo.
out="$(THYROX_TOOLCHAIN_XELATEX_BIN="$MISSING" thyrox_toolchain_require_texlive 2>&1)"; rc=$?
residue="${out//THYROX_INSTALL_TEXLIVE=1/}"; residue="${residue//$MISSING/}"
if [[ $rc -eq 2 && "$out" == *"$MISSING"* && "$out" == *THYROX_INSTALL_TEXLIVE* && ! "$residue" =~ [0-9] ]]; then
  ok "rehusa con exit 2 nombrando xelatex y el opt-in, sin conteo"
else bad "rechazo de presencia incorrecto; dio $rc: '$out'"; fi

# Caso 3 — opt-in con un instalador que MIENTE: se re-comprueba el binario.
out="$(THYROX_TOOLCHAIN_XELATEX_BIN="$MISSING" THYROX_INSTALL_TEXLIVE=1 \
       THYROX_TOOLCHAIN_TEXLIVE_INSTALL_CMD=true thyrox_toolchain_require_texlive 2>&1)"; rc=$?
if [[ $rc -eq 2 && "$out" == *"sigue sin resolver"* ]]; then
  ok "un instalador que sale 0 sin instalar no cuenta como exito"
else bad "esperaba exit 2 tras re-comprobar; dio $rc: '$out'"; fi

# Caso 4 — EJE 2, conducta: xelatex presente, falta un paquete. El rechazo
# nombra el archivo que falta y la variable donde el consumidor declara paquetes.
fake "$T/xe-missing" missing-sty
out="$(THYROX_TOOLCHAIN_XELATEX_BIN="$T/xe-missing" thyrox_toolchain_require_texlive 2>&1)"; rc=$?
if [[ $rc -eq 2 && "$out" == *polyglossia.sty* && "$out" == *THYROX_TOOLCHAIN_TEXLIVE_PACKAGES* && "$out" != *"no resuelve"* ]]; then
  ok "un documento que no compila rehusa nombrando el paquete que falta"
else bad "rechazo de conducta incorrecto; dio $rc: '$out'"; fi

# Caso 5 — el exit del compilador no decide: sale 0 y no escribe el PDF.
fake "$T/xe-nopdf" nopdf
out="$(THYROX_TOOLCHAIN_XELATEX_BIN="$T/xe-nopdf" thyrox_toolchain_require_texlive 2>&1)"; rc=$?
if [[ $rc -eq 2 ]]; then ok "un compilador que sale 0 sin PDF rehusa"
else bad "esperaba exit 2 sin PDF; dio $rc: '$out'"; fi

# Caso 6 — conducta con opt-in: instala y vuelve a compilar. El instalador
# falso reemplaza el compilador roto por uno que funciona.
fake "$T/xe-swap" missing-sty
cat > "$T/install-ok" <<SH
#!/usr/bin/env bash
echo ran >> "$T/install-ran"
cp "$T/xe-good" "$T/xe-swap"
SH
chmod +x "$T/install-ok"; fake "$T/xe-good" pdf
out="$(THYROX_TOOLCHAIN_XELATEX_BIN="$T/xe-swap" THYROX_INSTALL_TEXLIVE=1 \
       THYROX_TOOLCHAIN_TEXLIVE_INSTALL_CMD="$T/install-ok" thyrox_toolchain_require_texlive 2>&1)"; rc=$?
if [[ $rc -eq 0 && "$(wc -l < "$T/install-ran" 2>/dev/null)" -eq 1 ]]; then
  ok "con opt-in, un paquete faltante se instala y el documento se recompila"
else bad "esperaba exit 0 tras instalar una vez; dio $rc: '$out'"; fi

# Caso 7 — un consumidor que no declara TeX: la sonda del preflight se OMITE
# (exit 3) y lo dice; no aprueba sin medir ni avisa siempre.
out="$(thyrox_toolchain_probe_texlive 2>&1)"; rc=$?
if [[ $rc -eq 3 && "$out" == *"no declara"* ]]; then
  ok "sin declaracion, la sonda se omite y lo dice"
else bad "esperaba exit 3 sin declaracion; dio $rc: '$out'"; fi

HAS_XELATEX=0; command -v xelatex >/dev/null && HAS_XELATEX=1
cat > "$T/es.tex" <<'TEX'
\documentclass{article}
\usepackage{fontspec}
\usepackage{polyglossia}
\setdefaultlanguage[variant=mexican]{spanish}
\begin{document}
Tokenización, año, pingüino.
\end{document}
TEX
printf '\\documentclass{article}\n\\usepackage{thyrox-paquete-inexistente}\n\\begin{document}x\\end{document}\n' > "$T/bad.tex"

# Caso 8 — con declaracion, la sonda del preflight delega en el guard.
if (( HAS_XELATEX )); then
  if THYROX_TOOLCHAIN_TEXLIVE_PROBE_FILE="$T/es.tex" thyrox_toolchain_probe_texlive 2>/dev/null; then
    ok "declarado el documento, la sonda del preflight lo compila"
  else bad "la sonda declarada no compila un documento valido"; fi
else echo "  omitido: xelatex no esta en este entorno (caso 8 sin medir)"; fi

# Caso 9 — control positivo real: polyglossia en espanol de Mexico.
if (( HAS_XELATEX )); then
  if THYROX_TOOLCHAIN_TEXLIVE_PROBE_FILE="$T/es.tex" thyrox_toolchain_require_texlive 2>/dev/null; then
    ok "xelatex real compila polyglossia en espanol"
  else bad "xelatex real no compila polyglossia en espanol"; fi
else echo "  omitido: xelatex no esta en este entorno (caso 9 sin medir)"; fi

# Caso 10 — control negativo real: un paquete que no existe se nombra.
if (( HAS_XELATEX )); then
  out="$(THYROX_TOOLCHAIN_TEXLIVE_PROBE_FILE="$T/bad.tex" thyrox_toolchain_require_texlive 2>&1)"; rc=$?
  if [[ $rc -eq 2 && "$out" == *thyrox-paquete-inexistente* ]]; then
    ok "xelatex real rehusa nombrando el paquete inexistente"
  else bad "esperaba exit 2 nombrando el paquete; dio $rc: '$out'"; fi
else echo "  omitido: xelatex no esta en este entorno (caso 10 sin medir)"; fi

# Caso 11 — la sonda de compilacion funciona en un hijo (constantes exportadas).
# El compilador falso solo produce PDF si recibe un documento real: sin la
# constante exportada, el hijo escribiria un .tex vacio.
fake "$T/xe-child" pdf-if-doc
if THYROX_TOOLCHAIN_XELATEX_BIN="$T/xe-child" bash -c 'thyrox_toolchain_texlive_compiles' 2>/dev/null; then
  ok "la sonda de compilacion funciona en un proceso hijo"
else bad "la sonda falla en un hijo: constantes sin exportar"; fi

# Caso 12 — el preflight muestra la sonda omitida y no la cuenta como medida.
pre="$(env -u THYROX_TOOLCHAIN_TEXLIVE_PACKAGES -u THYROX_TOOLCHAIN_TEXLIVE_PROBE_FILE \
       bash "$ROOT/src/verify/check-toolchain-ready.sh" 2>&1)"
if [[ "$pre" == *"omitida · texlive"* && "$pre" == *"omitida"*"alcance medido"* ]]; then
  ok "el preflight declara la sonda de TeX omitida"
else bad "el preflight no declara la sonda omitida: '$(tail -3 <<<"$pre")'"; fi

thyrox_summary
