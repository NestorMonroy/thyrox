#!/usr/bin/env bash
# Pruebas de .githooks/post-commit — el que sincroniza el indice del store tras
# un commit por pathspec.
#
# El defecto que cierra, medido por conducta en
# `.claude/workbench/indice-rancio-por-commit-de-pathspec-*`:
# `git commit -- <ruta>` corre el pre-commit con GIT_INDEX_FILE apuntando a un
# indice TEMPORAL (`next-index-<pid>.lock`). El `git add` del pre-commit —que es
# NECESARIO: sin el, el commit pierde la reconciliacion— escribe ahi, y el
# indice REAL se queda con la instantanea previa al hook. Resultado: `git status`
# publica `MM` para siempre con HEAD y worktree identicos byte a byte.
#
# El arreglo no puede vivir en el pre-commit: forzar el indice real desde ahi da
# `fatal: Unable to create '.git/index.lock'` (EXIT=128) — lo retiene el propio
# `git commit`. Por eso el sujeto es un `post-commit`.
#
# Su guarda es lo que lo hace seguro: sincroniza SOLO cuando HEAD y disco
# coinciden, o sea cuando no hay trabajo real que un reset pudiera ocultar.
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
HOOK="$ROOT/.githooks/post-commit"
STORE_REL="agent-results/agent_store.sqlite3"

OK=0; FAILED=0
check() {
    local etiqueta="$1" esperado="$2" obtenido="$3"
    if [ "$esperado" = "$obtenido" ]; then
        OK=$((OK+1)); echo "  ok    $etiqueta"
    else
        FAILED=$((FAILED+1))
        echo "  FALLO $etiqueta"
        echo "        esperado=[$esperado] obtenido=[$obtenido]"
    fi
}

if [ ! -f "$HOOK" ]; then
    echo "ERROR — no se encontro $HOOK." >&2
    echo "  NO se emite un conteo: un 0 aqui seria un verde falso." >&2
    exit 2
fi

FIXTURE="$(mktemp -d)"
trap 'rm -rf "$FIXTURE"' EXIT

# Un repo con el pre-commit que reproduce la forma real (muta y prepara) y, si
# `con_post` lo pide, el post-commit REAL de thyrox como sujeto.
mk_repo() {
    local dir="$1" con_post="$2"
    rm -rf "$dir"; mkdir -p "$dir/agent-results"
    git -C "$dir" init -q
    git -C "$dir" config user.email probe@local
    git -C "$dir" config user.name  probe
    printf 'v0\n' > "$dir/$STORE_REL"
    git -C "$dir" add "$STORE_REL"
    git -C "$dir" commit -q -m seed

    cat > "$dir/.git/hooks/pre-commit" <<HOOKPRE
#!/usr/bin/env bash
# Reproduce el pre-commit real: reconcilia (muta) y prepara.
printf 'reconciliado\n' > "\$(git rev-parse --show-toplevel)/$STORE_REL"
git add -- "$STORE_REL"
exit 0
HOOKPRE
    chmod +x "$dir/.git/hooks/pre-commit"

    if [ "$con_post" = "si" ]; then
        cp "$HOOK" "$dir/.git/hooks/post-commit"
        chmod +x "$dir/.git/hooks/post-commit"
    fi
}

terna() {   # HEAD index worktree, del path del store
    local dir="$1"
    echo "$(git -C "$dir" rev-parse "HEAD:$STORE_REL") \
$(git -C "$dir" ls-files -s "$STORE_REL" | awk '{print $2}') \
$(git -C "$dir" hash-object "$dir/$STORE_REL")"
}

echo "== 1. el defecto SIN el sujeto (control positivo: reproduce MM) =="
mk_repo "$FIXTURE/sin" no
printf 'previo\n' > "$FIXTURE/sin/$STORE_REL"
git -C "$FIXTURE/sin" commit -q -m "commit por pathspec" -- "$STORE_REL"
estado=$(git -C "$FIXTURE/sin" status --porcelain "$STORE_REL" | cut -c1-2)
check "sin post-commit el indice queda rancio (MM)" "MM" "$estado"

echo
echo "== 2. CON el sujeto: el indice queda sincronizado =="
mk_repo "$FIXTURE/con" si
printf 'previo\n' > "$FIXTURE/con/$STORE_REL"
git -C "$FIXTURE/con" commit -q -m "commit por pathspec" -- "$STORE_REL"
estado=$(git -C "$FIXTURE/con" status --porcelain "$STORE_REL" | cut -c1-2)
check "el arbol queda limpio" "" "$estado"
read -r h i w <<< "$(terna "$FIXTURE/con")"
check "HEAD e indice coinciden" "$h" "$i"
check "el worktree NO se toco (sigue en HEAD)" "$h" "$w"
check "y el commit SI llevo la reconciliacion" "reconciliado" "$(cat "$FIXTURE/con/$STORE_REL")"

echo
echo "== 3. GUARDA: un cambio real sin commitear NO se toca =="
# Tras el commit, alguien escribe el store de nuevo. HEAD != disco, asi que un
# reset ocultaria trabajo. El sujeto debe abstenerse.
#
# El hook se invoca CON EL CWD DENTRO DE LA FIXTURE: `post-commit` resuelve su
# repo con `git rev-parse --show-toplevel`, asi que invocarlo desde otro sitio
# lo apuntaria a OTRO arbol y este caso pasaria sin ejercitar nada — el
# sub-patron D con la propia suite como sujeto.
printf 'trabajo posterior\n' > "$FIXTURE/con/$STORE_REL"
git -C "$FIXTURE/con" add -- "$STORE_REL"
( cd "$FIXTURE/con" && bash "$HOOK" ) >/dev/null 2>&1
estado=$(git -C "$FIXTURE/con" status --porcelain "$STORE_REL" | cut -c1-2)
check "el cambio preparado sobrevive al hook (PREPARADO, no revertido)" "M " "$estado"
check "y su contenido intacto" "trabajo posterior" "$(cat "$FIXTURE/con/$STORE_REL")"

echo
echo "== 4. el pathspec NO describe el commit: manda lo que HEAD registro =="
# MEDIDO, y refuta la premisa con que este caso se escribio primero: un
# `git add` del pre-commit sobre una ruta FUERA del pathspec TAMBIEN aterriza
# en el commit. Asi que el store viaja aunque el usuario nombrara otro archivo,
# y el `MM` aparece igual. La condicion del hook es el arbol de HEAD, no el
# pathspec — por eso aqui SI sincroniza.
mk_repo "$FIXTURE/otro" si
printf 'x\n' > "$FIXTURE/otro/otro.txt"
git -C "$FIXTURE/otro" add otro.txt
git -C "$FIXTURE/otro" commit -q -m "ajeno al store" -- otro.txt
check "el store viajo en el commit pese al pathspec" "reconciliado" \
      "$(git -C "$FIXTURE/otro" show "HEAD:$STORE_REL")"
estado=$(git -C "$FIXTURE/otro" status --porcelain "$STORE_REL" | cut -c1-2)
check "y el hook lo dejo limpio" "" "$estado"

echo
echo "== 5. un commit cuyo HEAD NO nombra el store: el hook se abstiene =="
# Sin pre-commit que mute: el store queda preparado a mano y el commit nombra
# otro archivo. HEAD no registra el store, asi que el hook no tiene por que
# tocar su entrada de indice — y despreparla perderia trabajo.
mk_repo "$FIXTURE/ajeno" si
rm -f "$FIXTURE/ajeno/.git/hooks/pre-commit"
printf 'preparado a mano\n' > "$FIXTURE/ajeno/$STORE_REL"
git -C "$FIXTURE/ajeno" add -- "$STORE_REL"
printf 'y\n' > "$FIXTURE/ajeno/otro.txt"
git -C "$FIXTURE/ajeno" add otro.txt
git -C "$FIXTURE/ajeno" commit -q -m "no nombra el store" -- otro.txt
check "HEAD no registra el store" "" \
      "$(git -C "$FIXTURE/ajeno" diff-tree --no-commit-id --name-only -r HEAD \
         | grep -F "$STORE_REL" || true)"
estado=$(git -C "$FIXTURE/ajeno" status --porcelain "$STORE_REL" | cut -c1-2)
check "el cambio preparado sigue preparado" "M " "$estado"

echo
echo "== 6. el FILTRO por arbol de HEAD: preparado que el disco ya no tiene =="
# Es el unico escenario donde el filtro carga peso y la guarda de igualdad NO
# alcanza: alguien prepara un contenido y luego revierte el DISCO a HEAD. Queda
# HEAD == worktree (la guarda pasa) con el indice llevando algo que no existe en
# ningun otro sitio. Sin el filtro, el hook lo despreparia y ese contenido se
# pierde — no esta ni en disco ni en ningun commit.
mk_repo "$FIXTURE/preparado" si
rm -f "$FIXTURE/preparado/.git/hooks/pre-commit"
printf 'solo en el indice\n' > "$FIXTURE/preparado/$STORE_REL"
git -C "$FIXTURE/preparado" add -- "$STORE_REL"
printf 'v0\n' > "$FIXTURE/preparado/$STORE_REL"     # el disco vuelve a HEAD
printf 'z\n' > "$FIXTURE/preparado/otro.txt"
git -C "$FIXTURE/preparado" add otro.txt
git -C "$FIXTURE/preparado" commit -q -m "no nombra el store" -- otro.txt
check "el contenido preparado sigue en el indice" "solo en el indice" \
      "$(git -C "$FIXTURE/preparado" cat-file -p :"$STORE_REL")"

echo
echo "resultado: $OK de $((OK+FAILED)) aserciones en verde"
[ "$FAILED" -eq 0 ] || exit 1
