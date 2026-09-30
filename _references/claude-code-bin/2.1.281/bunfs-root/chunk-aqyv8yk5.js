// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{Oa}from"/$bunfs/root/chunk-antv4vys.js";import{kl}from"/$bunfs/root/chunk-b8sc2vbx.js";import{Bt}from"/$bunfs/root/chunk-yn4wjwza.js";import{oe,A,Br,cn,T,g,D}from"/$bunfs/root/chunk-av0brfrs.js";D();function ze(e,o,r={}){let{context:t="Global",isActive:s=!0}=r,n=Oa(),[i]=g(()=>({handler:o}));cn(()=>{i.handler=o}),A(()=>{if(!n||!s)return;return n.registerHandler({action:e,context:t,handler:()=>i.handler(),singleKey:!0})},[e,t,n,s,i])}function It(e,o={}){let{context:r="Global",isActive:t=!0}=o,s=Oa(),[n]=g(()=>({handlers:e})),i=Object.keys(e).sort().join("|");cn(()=>{n.handlers=e}),A(()=>{if(!s||!t)return;let c=Object.keys(n.handlers).map((u)=>s.registerHandler({action:u,context:r,handler:()=>n.handlers[u]?.(),singleKey:!0}));return()=>{for(let u of c)u()}},[r,i,s,t,n])}function m_(e,{isActive:o=!0}={}){let r=Oa(),[t]=g(()=>({handler:e}));cn(()=>{t.handler=e}),A(()=>{if(!o||!r)return;return r.registerPreDispatch({handler:(s,n,i)=>t.handler(s,n,i)})},[o,r,t])}D();var a=800;function WB(e,o,r,t=a){let s=Bt(),n=kl(),i=T(0),c=T(void 0),u=Br(()=>e(!1)),l=oe(()=>{if(c.current)c.current(),c.current=void 0},[]);return A(()=>()=>{if(c.current)l(),u()},[l]),oe(()=>{let d=n();if(d-i.current<=t&&c.current!==void 0)l(),e(!1),o();else r?.(),e(!0),l(),c.current=s.setTimeout(()=>{e(!1),c.current=void 0},t);i.current=d},[e,o,r,l,s,n,t])}
export{WB,ze,It,m_};
