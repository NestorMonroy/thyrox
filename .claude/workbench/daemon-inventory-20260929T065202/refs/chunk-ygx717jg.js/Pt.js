==== Pt: 1 definicion(es) de nivel superior
---- chunk-ygx717jg.js function Pt [17761,18018)
function Pt(e,r){if(e.kind==="retired")return!1;switch(r.kind){case"spawning":return e.kind==="upgrading"||e.kind==="running";case"running":return e.kind==="spawning";case"upgrading":return e.kind==="running";case"retiring":return!0;case"retired":return!0}}
