==== claudeMdExcludes
function Qtn(e,n){if(n!=="User"&&n!=="Project"&&n!=="Local")return!1;let r=Ve().claudeMdExcludes;if(!r||r.length===0)return!1;let s={dot:!0},g=e.replaceAll("\\","/"),h=Wwo(r).filter((y)=>y.length>0);if(h.length===0)return!1;return jtn.default.isMatch(g,h,s)}
