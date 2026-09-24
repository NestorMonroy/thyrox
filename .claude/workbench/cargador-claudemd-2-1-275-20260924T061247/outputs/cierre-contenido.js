==== Gtn (485)
function Gtn(e,n,r,s){let g=Two(n).toLowerCase();if(g&&!Pwo.has(g))return t(`Skipping non-text file in @include: ${n}`),{info:null,includePaths:[]};let{content:h,paths:y}=Iwo(e),w=h.includes("<!--"),O=s!==void 0&&h.includes("@"),L=w||O?new Ok({gfm:!1}).lex(h):void 0,B=w&&L?d7e(L).content:h,U=L&&s!==void 0?Hwo(L,s):[],he=B;if(r==="AutoMem")he=Zht(B).content;let _e=he!==e;return{info:{path:n,type:r,content:he,globs:y,contentDiffersFromDisk:_e,rawContent:_e?e:void 0},includePaths:U}}

==== Wwo (347)
function Wwo(e){let n=le(),r=e.map((s)=>s.replaceAll("\\","/"));for(let s of r){if(!s.startsWith("/"))continue;let g=s.search(/[*?{[]/),h=g===-1?s:s.slice(0,g),y=d5(h);try{let{resolvedPath:w}=Po(n,y);if(Pn(w)&&!la(w)||Jr(w)||Vv(w)||Xh(w)||Gf(w))continue;let O=w.replaceAll("\\","/");if(O!==y){let L=O+s.slice(y.length);r.push(L)}}catch{}}return r}
