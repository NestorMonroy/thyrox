// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{Ja}from"/$bunfs/root/chunk-9f4kw8h9.js";import{It}from"/$bunfs/root/chunk-a0968h0d.js";import{oe,A,Vr,pn,T,g,D}from"/$bunfs/root/chunk-347kpssc.js";D();function Ue(e,i,s={}){let{context:n="Global",isActive:o=!0}=s,r=Ja(),[t]=g(()=>({handler:i}));pn(()=>{t.handler=i}),A(()=>{if(!r||!o)return;return r.registerHandler({action:e,context:n,handler:()=>t.handler(),singleKey:!0})},[e,n,r,o,t])}function at(e,i={}){let{context:s="Global",isActive:n=!0}=i,o=Ja(),[r]=g(()=>({handlers:e})),t=Object.keys(e).sort().join("|");pn(()=>{r.handlers=e}),A(()=>{if(!o||!n)return;let u=Object.keys(r.handlers).map((c)=>o.registerHandler({action:c,context:s,handler:()=>r.handlers[c]?.(),singleKey:!0}));return()=>{for(let c of u)c()}},[s,t,o,n,r])}function Db(e,{isActive:i=!0}={}){let s=Ja(),[n]=g(()=>({handler:e}));pn(()=>{n.handler=e}),A(()=>{if(!i||!s)return;return s.registerPreDispatch({handler:(o,r,t)=>n.handler(o,r,t)})},[i,s,n])}D();var l=800;function ID(e,i,s,n=l){let o=It(),r=T(0),t=T(void 0),u=Vr(()=>e(!1)),c=oe(()=>{if(t.current)t.current(),t.current=void 0},[]);return A(()=>()=>{if(t.current)c(),u()},[c]),oe(()=>{let d=Date.now();if(d-r.current<=n&&t.current!==void 0)c(),e(!1),i();else s?.(),e(!0),c(),t.current=o.setTimeout(()=>{e(!1),t.current=void 0},n);r.current=d},[e,i,s,c,o,n])}
export{Ue,at,Db,ID};
