// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{Ka}from"/$bunfs/root/chunk-dz47he0e.js";import{na}from"/$bunfs/root/chunk-mtq6m3s7.js";import{Yt}from"/$bunfs/root/chunk-wk20wnw4.js";import{se,C,zr,sn,T,g,L}from"/$bunfs/root/chunk-8fdrzdn0.js";L();function We(e,o,r={}){let{context:t="Global",isActive:s=!0}=r,n=Ka(),[i]=g(()=>({handler:o}));sn(()=>{i.handler=o}),C(()=>{if(!n||!s)return;return n.registerHandler({action:e,context:t,handler:()=>i.handler(),singleKey:!0})},[e,t,n,s,i])}function Wt(e,o={}){let{context:r="Global",isActive:t=!0}=o,s=Ka(),[n]=g(()=>({handlers:e})),i=Object.keys(e).sort().join("|");sn(()=>{n.handlers=e}),C(()=>{if(!s||!t)return;let c=Object.keys(n.handlers).map((u)=>s.registerHandler({action:u,context:r,handler:()=>n.handlers[u]?.(),singleKey:!0}));return()=>{for(let u of c)u()}},[r,i,s,t,n])}function G_(e,{isActive:o=!0}={}){let r=Ka(),[t]=g(()=>({handler:e}));sn(()=>{t.handler=e}),C(()=>{if(!o||!r)return;return r.registerPreDispatch({handler:(s,n,i)=>t.handler(s,n,i)})},[o,r,t])}L();var a=800;function Lj(e,o,r,t=a){let s=Yt(),n=na(),i=T(0),c=T(void 0),u=zr(()=>e(!1)),l=se(()=>{if(c.current)c.current(),c.current=void 0},[]);return C(()=>()=>{if(c.current)l(),u()},[l]),se(()=>{let d=n();if(d-i.current<=t&&c.current!==void 0)l(),e(!1),o();else r?.(),e(!0),l(),c.current=s.setTimeout(()=>{e(!1),c.current=void 0},t);i.current=d},[e,o,r,l,s,n,t])}
export{Lj,We,Wt,G_};
