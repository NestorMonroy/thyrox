// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{Ka}from"/$bunfs/root/chunk-w0zwyw43.js";import{Zt,Ea}from"/$bunfs/root/chunk-k0qnyh4a.js";import{ie,A,qr,nn,k,g,D}from"/$bunfs/root/chunk-bqbammwz.js";D();function ze(e,o,r={}){let{context:t="Global",isActive:s=!0}=r,n=Ka(),[i]=g(()=>({handler:o}));nn(()=>{i.handler=o}),A(()=>{if(!n||!s)return;return n.registerHandler({action:e,context:t,handler:()=>i.handler(),singleKey:!0})},[e,t,n,s,i])}function Gt(e,o={}){let{context:r="Global",isActive:t=!0}=o,s=Ka(),[n]=g(()=>({handlers:e})),i=Object.keys(e).sort().join("|");nn(()=>{n.handlers=e}),A(()=>{if(!s||!t)return;let c=Object.keys(n.handlers).map((u)=>s.registerHandler({action:u,context:r,handler:()=>n.handlers[u]?.(),singleKey:!0}));return()=>{for(let u of c)u()}},[r,i,s,t,n])}function ob(e,{isActive:o=!0}={}){let r=Ka(),[t]=g(()=>({handler:e}));nn(()=>{t.handler=e}),A(()=>{if(!o||!r)return;return r.registerPreDispatch({handler:(s,n,i)=>t.handler(s,n,i)})},[o,r,t])}D();var a=800;function rW(e,o,r,t=a){let s=Zt(),n=Ea(),i=k(0),c=k(void 0),u=qr(()=>e(!1)),l=ie(()=>{if(c.current)c.current(),c.current=void 0},[]);return A(()=>()=>{if(c.current)l(),u()},[l]),ie(()=>{let d=n();if(d-i.current<=t&&c.current!==void 0)l(),e(!1),o();else r?.(),e(!0),l(),c.current=s.setTimeout(()=>{e(!1),c.current=void 0},t);i.current=d},[e,o,r,l,s,n,t])}
export{rW,ze,Gt,ob};
