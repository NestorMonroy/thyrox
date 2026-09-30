==== Le: 1 definicion(es) de nivel superior
---- chunk-92tvramn.js function Le [14704,15231)
async function Le(r){let e=process.stdout.isTTY,o=await Ut(r).then((u)=>u.size).catch(()=>0);if(o>at)await lt(r),o=0;let n=st(r),a=null,h=null,w=!1;return{write(u,k){let R=`[${new Date().toISOString()}] [${u}] ${Vo(k)}
`;if(e)process.stdout.write(R);if(w)return;if(o+=Buffer.byteLength(R),h)h.push(R);else n.write(R);if(o>at&&!a){let S=n,M=[];h=M,a=(async()=>{try{await dt(S),await lt(r),n=st(r),o=0;for(let E of M)o+=Buffer.byteLength(E),n.write(E)}catch{}finally{h=null,a=null}})()}},async close(){w=!0,await a,await dt(n)}}}
