==== ke: 1 definicion(es) de nivel superior
---- chunk-ygx717jg.js function ke [3384,4152)
function ke(e,r){let s="",h="",n=!0,p=0,o="",u=!1;function g(S,k){let _=Xc(Vo(h),ne),w=`${S}|${k}|${_}`;if(w===o)return;o=w,Pr(e,r).then((A)=>A&&!u?ja(e,{...A,state:S,tempo:k,detail:_,updatedAt:new Date().toISOString()},r):void 0).catch(d)}let f=setInterval(()=>{if(p>0&&Date.now()-p<Pe)g("working","active");else if(!n&&h)g("blocked","blocked");else g("working","idle")},Pe);return f.unref(),{feed(S){let k=wt(S.replace(st,"\x00")).replace(/\r\n?/g,`
`).replace(/\0+$/,"").replace(/\0/g,`
`);if(!k)return;p=Date.now(),s+=k;let _=s.split(`
`);if(s=_.pop()??"",n=s==="",h=s.trim()||_.findLast((A)=>A.trim())?.trim()||h,s.length>ne*2)s=s.slice(-ne);if(o.startsWith("blocked|"))g("working","active")},dispose(){u=!0,clearInterval(f)},get lastLine(){return Xc(Vo(h),ne)}}}
