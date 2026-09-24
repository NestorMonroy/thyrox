function St(e){let n=e.replace(/\/{2,}/g,"/");if(/^\s*(?:\/\*\*)?$/.test(n))return n;return n.replace(/^\uFEFF([!#]?)/,(r,s)=>s?"\\"+s:"").replace(/^\uFEFF/,"[\uFEFF]")}
