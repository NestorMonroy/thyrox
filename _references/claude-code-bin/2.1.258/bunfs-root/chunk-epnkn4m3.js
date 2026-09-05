// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
var p={stream:!0};function u(n,t){let e=n.charCodeAt(t);if(e===10)return 1;if(e===13){if(t+1>=n.length)return-1;return n.charCodeAt(t+1)===10?2:1}return 0}function m(n,t){let e=t;while(e<n.length){let i=u(n,e);if(i===0){e++;continue}if(i===-1)return null;let r=e+i;if(r>=n.length)return null;let s=u(n,r);if(s===-1)return null;if(s>0)return{contentEnd:e,afterDelim:r+s};e=r}return null}function h(n){if(!/\S/.test(n))return null;let t={},e=!1;for(let i of n.split(/\r\n|\r|\n/)){if(i.startsWith(":")){e=!0;continue}let r=i.indexOf(":");if(r===-1)continue;let s=i.slice(0,r),a=i[r+1]===" "?i.slice(r+2):i.slice(r+1);switch(s){case"event":t.event=a;break;case"id":t.id=a;break;case"data":t.data=t.data?t.data+`
`+a:a;break}}return t.data||e?t:null}class KVe{decoder=new TextDecoder;pending=[];pendingLength=0;push(n){let t=typeof n==="string"?n:this.decoder.decode(n,p);if(!t)return[];return this.drain(t)}flush(){let n=this.decoder.decode();if(n)this.pending.push(n),this.pendingLength+=n.length;let t=this.joinPending();this.pending=[],this.pendingLength=0;let e=h(t);return e?[e]:[]}buffered(){return this.joinPending()}drain(n){let t=[],e=this.pendingLength,i=Math.min(3,e),r=this.tail(i)+n,s=e-i,a=0,l=-1;for(;;){let o=m(r,a);if(!o)break;let d=s+o.contentEnd,c;if(l===-1){let f=this.joinPending();c=d<=e?f.slice(0,d):f+n.slice(0,d-e)}else c=n.slice(l-e,d-e);let g=h(c);if(g)t.push(g);l=s+o.afterDelim,a=o.afterDelim}if(l===-1)this.pending.push(n),this.pendingLength=e+n.length;else{let o=n.slice(l-e);this.pending=o?[o]:[],this.pendingLength=o.length}return t}tail(n){if(n<=0)return"";let t=n,e="";for(let i=this.pending.length-1;i>=0&&t>0;i--){let r=this.pending[i];if(r.length<=t)e=r+e,t-=r.length;else e=r.slice(r.length-t)+e,t=0}return e}joinPending(){return this.pending.length===1?this.pending[0]:this.pending.join("")}}
export{KVe};
