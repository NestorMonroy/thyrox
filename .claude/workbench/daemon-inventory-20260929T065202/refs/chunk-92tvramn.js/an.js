==== an: 1 definicion(es) de nivel superior
---- chunk-92tvramn.js function an [66670,66918)
function an(r){let e=r.origin??"unknown";if(e!=="transient"&&e!=="auto")return e;let o=r.spawnedBy;if(!o)return"transient \u2014 started on-demand by a client";return`transient \u2014 started on-demand by \`${o.label}\` (pid ${o.pid}) in ${o.cwd}`}
