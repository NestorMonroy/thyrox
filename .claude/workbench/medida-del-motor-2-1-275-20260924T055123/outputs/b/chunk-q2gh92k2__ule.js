function ule(e,n,r){let s=pe(r);if(OU(e)?.onBlock!=="flag"||!LCe(s))return!1;let g={...s,alwaysDenyRules:Ua(s.alwaysDenyRules,(h,y)=>Bzo.has(y))};return ws(g,e)===null&&Ah(g,e,n,"deny")===null}
