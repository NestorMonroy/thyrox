==== GC: 1 definicion(es) de nivel superior
---- chunk-4h0c4z04.js function GC [24523,24686)
function GC(e){let t=e.toLowerCase();for(let n of Object.values(Po))for(let r of Object.values(n))if(typeof r==="string"&&r.toLowerCase()===t)return n;return null}
==== Nv: 1 definicion(es) de nivel superior
---- chunk-wg7ts4cy.js function Nv [1007129,1007262)
function Nv(e,t){if(!e.models)return!0;let n=GC(t);return e.models.some((i)=>i.toLowerCase()===t.toLowerCase()||n!==null&&GC(i)===n)}
==== mj: 1 definicion(es) de nivel superior
---- chunk-wg7ts4cy.js function mj [1006919,1007033)
function mj(e,t){let n=GC(e),i=e.toLowerCase();return t.find((r)=>r.id.toLowerCase()===i||n!==null&&GC(r.id)===n)}
==== So: 1 definicion(es) de nivel superior
---- chunk-wg7ts4cy.js function So [1007033,1007129)
function So(e){let t=e.replace(/[^\x20-\x7e]/g,"");return t.length>128?`${t.slice(0,128)}...`:t}
==== Bc: 1 definicion(es) de nivel superior
---- chunk-wg7ts4cy.js function Bc [1031006,1031092)
function Bc(e){let t=Yv(e);return t!==null?`builtin:${t}`:`string:${e.toLowerCase()}`}
symbol: 5 de 5 nombre(s) resueltos
