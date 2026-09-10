// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.263
import{sl}from"/$bunfs/root/chunk-99d7k3tk.js";import{E,dn,d,F}from"/$bunfs/root/chunk-1c6mq242.js";F();function Oe(t,o,r={}){let{context:n="Global",isActive:i=!0}=r,e=sl(),[s]=d(()=>({handler:o}));dn(()=>{s.handler=o}),E(()=>{if(!e||!i)return;return e.registerHandler({action:t,context:n,handler:()=>s.handler(),singleKey:!0})},[t,n,e,i,s])}function Ze(t,o={}){let{context:r="Global",isActive:n=!0}=o,i=sl(),[e]=d(()=>({handlers:t})),s=Object.keys(t).sort().join("|");dn(()=>{e.handlers=t}),E(()=>{if(!i||!n)return;let c=Object.keys(e.handlers).map((a)=>i.registerHandler({action:a,context:r,handler:()=>e.handlers[a]?.(),singleKey:!0}));return()=>{for(let a of c)a()}},[r,s,i,n,e])}function YN(t,{isActive:o=!0}={}){let r=sl(),[n]=d(()=>({handler:t}));dn(()=>{n.handler=t}),E(()=>{if(!o||!r)return;return r.registerPreDispatch({handler:(i,e,s)=>n.handler(i,e,s)})},[o,r,n])}
export{Oe,Ze,YN};
