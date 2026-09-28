# Una anulación: localiza el único archivo de las raíces dadas que contiene el
# texto, lo sustituye, corre `run` y restaura. Sin coincidencia única, lo dice.
locate() {
  local roots=$1 old=$2 hits
  hits=$(find $roots -name '*.ts' -print0 | OLD="$old" xargs -0 gawk 'BEGINFILE{RS="^$"} index($0, ENVIRON["OLD"]){print FILENAME}')
  [ "$(printf '%s\n' "$hits" | gawk 'NF' | wc -l)" = 1 ] && printf '%s' "$hits"
}
annul() {
  local f; f=$(locate "$1" "$2") || { echo "SIN COINCIDENCIA ÚNICA en $1"; return; }
  echo "   ($f)"; cp "$f" "$f.orig"
  OLD="$2" NEW="$3" bash "$T/bin/replace_literal" "$f" >/dev/null && run
  mv "$f.orig" "$f"
}
