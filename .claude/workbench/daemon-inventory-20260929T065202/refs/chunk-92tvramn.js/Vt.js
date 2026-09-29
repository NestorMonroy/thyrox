==== Vt: 1 definicion(es) de nivel superior
---- chunk-92tvramn.js function Vt [67757,68092)
function Vt(r,e){let o;switch(e.outcome){case"eperm":o="Stop it from the account that owns it";break;case"unverified":o=f8r();break;case"timed-out":o=`Wait for it to exit (or kill pid ${e.pid})`;break}return`${r} refused: ${Ibe(e)} \u2014 a freshly started service would lose the lockfile race to it and crash-loop. ${o}, then retry.`}
