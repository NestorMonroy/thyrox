// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{mgd as g,qgd as y,ugd as I}from"/$bunfs/root/_820.js";import{xxd as B}from"/$bunfs/root/_837.js";function b(r){let e=typeof r==="string"?Buffer.from(r,"utf8"):r,t=Buffer.allocUnsafe(n+e.length);return t.writeUInt32BE(e.length,0),t.writeUInt8(l,4),e.copy(t,n),t}function k(r){let e=Buffer.from(g(r),"utf8"),t=Buffer.allocUnsafe(n+e.length);return t.writeUInt32BE(e.length,0),t.writeUInt8(s,4),e.copy(t,n),t}function A(r,e){let t=Buffer.alloc(0),o=!1;return(c)=>{if(o)return;t=t.length===0?c:Buffer.concat([t,c]);while(t.length>=n){let f=t.readUInt32BE(0);if(f>p){o=!0,e(`frame too large (${f} > ${p})`);return}let u=n+f;if(t.length<u)return;let i=t.readUInt8(4),a=t.subarray(n,u);if(t=t.subarray(u),i===l)r({kind:l,payload:Buffer.from(a)});else if(i===s){let d;try{d=y(a.toString("utf8"))}catch{o=!0,e("bad ctrl json");return}r({kind:s,ctrl:d})}else{o=!0,e(`unknown frame kind ${i}`);return}}}}var l=0,s=1,x=262144,n=5,p=1048576,_=1e4;var m=B(()=>{I()});
export{l as Wib,s as Xib,x as Yib,p as Zib,_ as _ib,b as $ib,k as ajb,A as bjb,m as cjb};
