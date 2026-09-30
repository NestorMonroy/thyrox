function X5n(e,n,r,s,g){let h=e.filter((B)=>Ife(B)),b=h.map((B)=>B.name).join(","),w=Y5n.of(W().host),M=w.lookup(b);if(M!==void 0)return M;let F=Q5n(h,n,r,s,g);return w.remember(b,F),F}

function J5n(e,n,r,s){let g=e.filter((b)=>Ife(b));if(g.length===0)return 0;return(await Promise.all(g.map(async(b)=>{let w=await b.prompt({getToolPermissionContext:n,tools:e,agents:r,model:s}),M=b.inputJSONSchema?S(b.inputJSONSchema):b.inputSchema?S(ZG(b.inputSchema)):"";return b.name.length+w.length+M.length}))).reduce((b,w)=>b+w,0)}

function ryt(e){let n=gg(e,GR(Uin(e))),r=gEe()/100;return Math.floor(n*r)}

function V5n(e){return Math.floor(ryt(e)*K5n)}

function gEe(){let e=process.env.ENABLE_TOOL_SEARCH;if(!e)return mEe;if(e==="auto")return mEe;let n=TAr(e);if(n!==null)return n;return mEe}

// z8: no está en la línea de iPn

// W8: no está en la línea de iPn

// qpe: no está en la línea de iPn

function OSe(e){return e.some((n)=>Wt(n,Ma))}

// hh: no está en la línea de iPn

// CX: no está en la línea de iPn

// Ait: no está en la línea de iPn

