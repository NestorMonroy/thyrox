#!/usr/bin/env bash
# Mide por conducta por que un commit por pathspec deja el indice real un blob
# atras cuando el pre-commit reescribe y prepara el mismo archivo.
#
# Tres casos sobre repos sinteticos. El observable que discrimina es
# GIT_INDEX_FILE tal como lo VE el hook: si git usa un indice temporal para el
# commit parcial, el `git add` del hook no toca el indice real.
set -uo pipefail

FIXTURE="${1:?uso: probe_stale_index.sh <dir-de-fixture>}"
rm -rf "$FIXTURE"; mkdir -p "$FIXTURE"

# Un repo nuevo con un pre-commit que muta el archivo. `con_add` decide si
# ademas lo prepara — es la mitad cuya anulacion mide el caso C.
mk_repo() {
    local dir="$1" con_add="$2"
    rm -rf "$dir"; mkdir -p "$dir"; git -C "$dir" init -q
    git -C "$dir" config user.email probe@local
    git -C "$dir" config user.name  probe
    printf 'v0\n' > "$dir/f.bin"
    git -C "$dir" add f.bin
    git -C "$dir" commit -q -m "seed"

    mkdir -p "$dir/.git/hooks"
    cat > "$dir/.git/hooks/pre-commit" <<HOOK
#!/usr/bin/env bash
# El indice que el hook ve. Es el observable que separa temp de real.
echo "\${GIT_INDEX_FILE:-(sin asignar)}" > "\$(git rev-parse --show-toplevel)/../index_file_visto.txt"
printf 'v1\n' > "\$(git rev-parse --show-toplevel)/f.bin"
if [ "$con_add" = "si" ]; then
    git add -- f.bin
    # ¿Se puede forzar el indice REAL desde el hook? Su error es la razon
    # medida de que el arreglo no pueda vivir aqui.
    GIT_INDEX_FILE="\$(git rev-parse --git-dir)/index" git add -- f.bin \
        2> "\$(git rev-parse --show-toplevel)/../forzar_indice_real.txt" \
        || echo "EXIT=\$?" >> "\$(git rev-parse --show-toplevel)/../forzar_indice_real.txt"
fi
exit 0
HOOK
    chmod +x "$dir/.git/hooks/pre-commit"
}

# Publica las tres versiones del mismo path, que es lo que git status compara.
report() {
    local dir="$1" etiqueta="$2"
    local head index worktree estado
    head=$(git -C "$dir" rev-parse HEAD:f.bin)
    index=$(git -C "$dir" ls-files -s f.bin | awk '{print $2}')
    worktree=$(git -C "$dir" hash-object f.bin)
    estado=$(git -C "$dir" status --porcelain f.bin)
    echo "=== $etiqueta"
    echo "  GIT_INDEX_FILE visto por el hook: $(cat "$dir/../index_file_visto.txt" 2>/dev/null || echo '(no corrio)')"
    echo "  HEAD     $head"
    echo "  index    $index"
    echo "  worktree $worktree"
    echo "  status   [${estado:-limpio}]"
    echo -n "  veredicto: "
    if   [ "$head" = "$worktree" ] && [ "$index" != "$head" ]; then echo "indice RANCIO (HEAD==worktree, index atras)"
    elif [ "$head" = "$index" ] && [ "$head" = "$worktree" ];   then echo "los tres coinciden — limpio"
    elif [ "$head" = "$index" ] && [ "$index" != "$worktree" ]; then echo "worktree adelante — el commit NO llevo la mutacion"
    else echo "otra combinacion"; fi
    echo
}

echo "git $(git --version | awk '{print $3}')"
echo

# A — la forma REAL: hook muta y prepara; commit por pathspec.
mk_repo "$FIXTURE/a" si
printf 'v0a\n' > "$FIXTURE/a/f.bin"   # cambio REAL: sin el, git rehusa el commit
git -C "$FIXTURE/a" commit -q -m "A: pathspec" -- f.bin
echo "  exit del commit A: $?"
report "$FIXTURE/a" "A  hook muta+add · commit POR PATHSPEC   (la forma que git.md manda)"
echo "  intento de forzar el indice real desde el hook:"
sed 's/^/    /' "$FIXTURE/a/../forzar_indice_real.txt" 2>/dev/null || echo "    (sin salida)"
echo

# B — control: mismo hook, commit PLANO. Si B sale limpio, el disparador es el
# pathspec y no el hook.
mk_repo "$FIXTURE/b" si
printf 'v0b\n' > "$FIXTURE/b/f.bin"
git -C "$FIXTURE/b" add f.bin
git -C "$FIXTURE/b" commit -q -m "B: plano"
report "$FIXTURE/b" "B  hook muta+add · commit PLANO          (control: aisla el pathspec)"

# C — anulacion del `git add`: si el commit pierde la mutacion, el add es lo
# que la mete al commit y no se puede retirar.
mk_repo "$FIXTURE/c" no
printf 'v0c\n' > "$FIXTURE/c/f.bin"   # idem: el caso solo existe si hay que commitear
git -C "$FIXTURE/c" commit -q -m "C: pathspec sin add" -- f.bin
echo "  exit del commit C: $?"
report "$FIXTURE/c" "C  hook muta SIN add · commit POR PATHSPEC (anulacion del git add)"
