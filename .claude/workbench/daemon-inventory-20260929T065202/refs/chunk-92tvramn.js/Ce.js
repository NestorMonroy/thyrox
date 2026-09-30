==== Ce: 1 definicion(es) de nivel superior
---- chunk-92tvramn.js function Ce [67208,67557)
function Ce(r,e){let o=[];for(let n=0;n<r.length;n++){let a=r[n];if(e.includes(a))continue;if(a==="--debug"||a==="-d"||a==="--debug-to-stderr"||a==="-d2e"||a.startsWith("--debug=")||a.startsWith("--debug-file="))continue;if(a==="--debug-file"&&n+1<r.length){n++;continue}o.push(a)}if(o.length>0)z(`warning: extra arguments ignored: ${o.join(" ")}`)}
