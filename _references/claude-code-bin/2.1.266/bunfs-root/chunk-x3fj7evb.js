// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{ll}from"/$bunfs/root/chunk-3mz60s54.js";import{v,fn,d,L}from"/$bunfs/root/chunk-v21q572m.js";L();function Ne(t,o,r={}){let{context:n="Global",isActive:i=!0}=r,e=ll(),[s]=d(()=>({handler:o}));fn(()=>{s.handler=o}),v(()=>{if(!e||!i)return;return e.registerHandler({action:t,context:n,handler:()=>s.handler(),singleKey:!0})},[t,n,e,i,s])}function Qe(t,o={}){let{context:r="Global",isActive:n=!0}=o,i=ll(),[e]=d(()=>({handlers:t})),s=Object.keys(t).sort().join("|");fn(()=>{e.handlers=t}),v(()=>{if(!i||!n)return;let c=Object.keys(e.handlers).map((a)=>i.registerHandler({action:a,context:r,handler:()=>e.handlers[a]?.(),singleKey:!0}));return()=>{for(let a of c)a()}},[r,s,i,n,e])}function vR(t,{isActive:o=!0}={}){let r=ll(),[n]=d(()=>({handler:t}));fn(()=>{n.handler=t}),v(()=>{if(!o||!r)return;return r.registerPreDispatch({handler:(i,e,s)=>n.handler(i,e,s)})},[o,r,n])}
export{Ne,Qe,vR};
