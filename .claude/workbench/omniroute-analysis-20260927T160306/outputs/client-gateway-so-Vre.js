==== so: 1 definicion(es) de nivel superior
---- chunk-wg7ts4cy.js function so [1007262,1007966)
function so(e,t,n,i=!0,r=!1){let o=GC(e);if(!Nv(t,e))return{ok:!1,listSkip:!0,error:r?`model ${So(e)} is not available on this upstream`:`model ${So(e)} is not served by upstream '${t.name}'`};let s=mj(e,n),c=s?.upstream_model[t.name];if(c)return{ok:!0,model:c};if(o&&(i||s)){let d=t.provider==="anthropic"?o.firstParty:o[t.provider];if(!d)return{ok:!1,error:r?`model ${So(e)} is not available on this upstream`:`model ${So(e)} is not available on ${t.provider}`};return{ok:!0,model:d}}if(s)return{ok:!1,error:r?`model ${So(e)} is not configured for this upstream`:`model ${So(e)} has no upstream_model.${t.name} configured`};return{ok:!1,error:`model ${So(e)} is not in the operator's model allowlist`}}
==== Vre: 1 definicion(es) de nivel superior
---- chunk-wg7ts4cy.js function Vre [1063797,1064000)
function Vre(e){let t=new Set,n=[];for(let i of[...(e.pricing?.overrides??[]).map((r)=>GC(r.model)?.firstParty??r.model),...e.models.map((r)=>r.id)]){let r=Bc(i);if(!t.has(r))t.add(r),n.push(i)}return n}
symbol: 2 de 2 nombre(s) resueltos
