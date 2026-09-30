==== AVo: 1 definicion(es) de nivel superior
---- chunk-ygx717jg.js function AVo [60516,61621)
async function AVo(e){let r=e[0];if(!r)process.stderr.write(`[bg-spare] missing claim sock path
`),process.exit(2);let s=await xt(),h=import("/$bunfs/root/chunk-fa2jy0nf.js");import("/$bunfs/root/chunk-ad0svcby.js").catch(()=>{}),import("/$bunfs/root/chunk-2bpeqyce.js").catch(()=>{});let n=()=>{try{It(r)}catch{}},p=()=>{n(),process.exit(0)},o=(k)=>{n(),process.stderr.write(`[bg-spare] uncaughtException: ${l(k)}
`),fh("spare_uncaught"),process.exit(1)},u=process.ppid,g=setInterval((k,_)=>{if(process.ppid!==k)_(),process.exit(0)},2000,u,n);g.unref();for(let k of["SIGTERM","SIGHUP","SIGINT"])process.on(k,p);process.on("uncaughtException",o);let f=()=>{clearInterval(g);for(let k of["SIGTERM","SIGHUP","SIGINT"])process.off(k,p);process.off("uncaughtException",o)},S;try{S=await Kjt(r,void 0,s)}catch(k){n(),process.stderr.write(`[bg-spare] claim recv failed: ${l(k)}
`),fh("spare_claim_recv"),process.exit(1)}f();try{await h,await Yjt(S,h)}catch(k){let _=ao(k)??Xm(k)??"Error";throw fh("spare_postclaim:"+_,S.env.CLAUDE_JOB_DIR),process.stderr.write(`[bg-spare] post-claim init failed: ${l(k)}
`),k}}
