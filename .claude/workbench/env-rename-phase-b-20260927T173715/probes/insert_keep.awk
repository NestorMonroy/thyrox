# Inserta `# thyrox-rename: keep — <razón>` encima de las líneas indicadas.
# Uso: gawk -v lines="19 98" -v reasons="r1|r2" -i inplace -f insert_keep.awk <archivo>
BEGIN { n = split(lines, L, " "); split(reasons, R, "|"); for (i = 1; i <= n; i++) at[L[i]] = R[i] }
FNR in at { match($0, /^[ \t]*/); print substr($0, 1, RLENGTH) "# thyrox-rename: keep — " at[FNR] }
{ print }
