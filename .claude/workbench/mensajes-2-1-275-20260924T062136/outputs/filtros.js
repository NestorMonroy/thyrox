==== blr (894)
function blr(e,n=!1){let r,s,g=[],h=e.length-1;while(h>=0&&Gk(e[h]))h--;for(let w=e.length-1;w>=0;w--){let O=e[w],L=O.type==="assistant"?O.message.content:void 0;if(O.type!=="assistant"||!Array.isArray(L)||L.length===0||L.some((he)=>!Nfe(he))){g[w]=!0;continue}let B=w+1;while(B<e.length&&(Gk(e[B])||Hse(e[B])))B++;let U=e[B];g[w]=O.message.id!==void 0&&(r??=ILs(e)).has(O.message.id)||n&&w===h||U?.type==="assistant"&&U.resumedFromIncompleteThinking===!0&&g[B]===!0&&!(Array.isArray(U.message.content)&&nEt(U.message.content)&&!(U.message.id!==void 0&&(s??=ylr(e)).has(U.message.id)))&&!Hse(O)}let y;for(let w=0;w<e.length;w++){let O=e[w];if(O.type!=="assistant"||g[w]){y?.push(O);continue}if(!Lar.has(O.uuid))Lar.add(O.uuid),i("tengu_filtered_orphaned_thinking_message",{messageUUID:be(O.uuid),messageId:be(O.message.id),blockCount:O.message.content.length});if(!y)y=e.slice(0,w)}return y??e}

==== ILs (189)
function ILs(e){let n=new Set;for(let r of e){if(r.type!=="assistant"||!r.message.id)continue;let s=r.message.content;if(Array.isArray(s)&&s.some((g)=>!Nfe(g)))n.add(r.message.id)}return n}

==== Nfe (73)
function Nfe(e){return e.type==="thinking"||e.type==="redacted_thinking"}

==== Gk AUSENTE

==== Oi (57)
function Oi(e,n){let r=m6e(e);return r===-1?e:e.slice(r)}

==== m6e (88)
function m6e(e){for(let n=e.length-1;n>=0;n--){let r=e[n];if(r&&Ra(r))return n}return-1}
