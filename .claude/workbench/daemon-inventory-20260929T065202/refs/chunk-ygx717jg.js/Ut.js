==== Ut: 1 definicion(es) de nivel superior
---- chunk-ygx717jg.js function Ut [66395,66643)
async function Ut(e,r){let s=Date.now(),h=5000;for(let n=0;;n++){if(Date.now()-s>5000)throw Error("send-claim timeout");try{await Ft(e,r);return}catch(p){let o=v(p);if(!(o==="ENOENT"||o==="ECONNREFUSED")||n>=it.length)throw p;await Q(it[n]??500)}}}
