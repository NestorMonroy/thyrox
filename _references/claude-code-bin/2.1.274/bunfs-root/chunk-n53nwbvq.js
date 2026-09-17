// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{cl}from"/$bunfs/root/chunk-2rrs6ffn.js";import{Rt}from"/$bunfs/root/chunk-q1g12e58.js";import{re,A,Gr,fn,T,m,L}from"/$bunfs/root/chunk-s59wj17y.js";L();function Be(e,i,s={}){let{context:n="Global",isActive:o=!0}=s,r=cl(),[t]=m(()=>({handler:i}));fn(()=>{t.handler=i}),A(()=>{if(!r||!o)return;return r.registerHandler({action:e,context:n,handler:()=>t.handler(),singleKey:!0})},[e,n,r,o,t])}function st(e,i={}){let{context:s="Global",isActive:n=!0}=i,o=cl(),[r]=m(()=>({handlers:e})),t=Object.keys(e).sort().join("|");fn(()=>{r.handlers=e}),A(()=>{if(!o||!n)return;let u=Object.keys(r.handlers).map((c)=>o.registerHandler({action:c,context:s,handler:()=>r.handlers[c]?.(),singleKey:!0}));return()=>{for(let c of u)c()}},[s,t,o,n,r])}function pR(e,{isActive:i=!0}={}){let s=cl(),[n]=m(()=>({handler:e}));fn(()=>{n.handler=e}),A(()=>{if(!i||!s)return;return s.registerPreDispatch({handler:(o,r,t)=>n.handler(o,r,t)})},[i,s,n])}L();var l=800;function uD(e,i,s,n=l){let o=Rt(),r=T(0),t=T(void 0),u=Gr(()=>e(!1)),c=re(()=>{if(t.current)t.current(),t.current=void 0},[]);return A(()=>()=>{if(t.current)c(),u()},[c]),re(()=>{let d=Date.now();if(d-r.current<=n&&t.current!==void 0)c(),e(!1),i();else s?.(),e(!0),c(),t.current=o.setTimeout(()=>{e(!1),t.current=void 0},n);r.current=d},[e,i,s,c,o,n])}
export{Be,st,pR,uD};
