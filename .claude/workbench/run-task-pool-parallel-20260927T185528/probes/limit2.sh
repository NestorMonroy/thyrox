#!/bin/bash
f="$1"; n=$(ls "$f" 2>/dev/null | wc -l)
if [ -e "$f.done" ]; then exit 0; fi
if [ "$(ls $f.run 2>/dev/null | wc -l)" -ge 2 ]; then touch "$f.done"; exit 2; fi
exit 0
