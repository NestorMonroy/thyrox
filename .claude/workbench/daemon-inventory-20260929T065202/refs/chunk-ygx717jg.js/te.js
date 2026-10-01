==== te: 1 definicion(es) de nivel superior
---- chunk-ygx717jg.js function te [16745,16981)
function te(e,r=[]){if(O()!=="windows")return;let s=new Map(r.map((h)=>[h.toUpperCase(),h]));for(let h of Object.keys(e)){let n=h.toUpperCase(),p=Tt.get(n)??s.get(n);if(p===void 0||p===h)continue;if(e[p]===void 0)e[p]=e[h];delete e[h]}}
