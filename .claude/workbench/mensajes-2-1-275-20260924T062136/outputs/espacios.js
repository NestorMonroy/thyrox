==== _lr (724)
function _lr(e,{mergeAdjacentUsers:n=!0}={}){let r=!1;for(let y=0;y<e.length;y++){let w=e[y];if(w.type!=="assistant")continue;let O=w.message.content;if(!Array.isArray(O)||O.length===0)continue;if(nEt(O)){r=!0;break}}if(!r)return e;let s=ylr(e),g=e.filter((y)=>{if(y.type!=="assistant")return!0;if(s.has(y.message.id))return!0;let w=y.message.content;if(!Array.isArray(w)||w.length===0)return!0;if(nEt(w)){if(!Nar.has(y.uuid))Nar.add(y.uuid),i("tengu_filtered_whitespace_only_assistant",{messageUUID:be(y.uuid)});return!1}return!0});if(!n)return g;let h=[];for(let y of g){let w=h.at(-1);if(y.type==="user"&&w?.type==="user"&&!y.interruptedByShutdown&&!w.interruptedByShutdown)h[h.length-1]=kde(w,y);else h.push(y)}return h}

==== ZQ (117)
function ZQ(e,n=!1){let r=e;for(;;){let s=_lr(blr(r,n),{mergeAdjacentUsers:!1});if(s.length===r.length)return r;r=s}}
