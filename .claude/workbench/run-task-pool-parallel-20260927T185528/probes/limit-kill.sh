#!/bin/bash
# Sale 2 (matar al más joven) mientras exista el testigo <f>.kill; 0 si no.
[ -e "$1.kill" ] && exit 2
exit 0
