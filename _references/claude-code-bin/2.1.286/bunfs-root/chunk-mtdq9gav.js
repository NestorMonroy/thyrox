// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{el}from"/$bunfs/root/chunk-myhdvzg0.js";import{Jt,Da}from"/$bunfs/root/chunk-fsx1dvsr.js";import{le,C,Jr,on,T,g,D}from"/$bunfs/root/chunk-mqace48v.js";D();function ze(e,o,r={}){let{context:t="Global",isActive:s=!0}=r,n=el(),[i]=g(()=>({handler:o}));on(()=>{i.handler=o}),C(()=>{if(!n||!s)return;return n.registerHandler({action:e,context:t,handler:()=>i.handler(),singleKey:!0})},[e,t,n,s,i])}function qt(e,o={}){let{context:r="Global",isActive:t=!0}=o,s=el(),[n]=g(()=>({handlers:e})),i=Object.keys(e).sort().join("|");on(()=>{n.handlers=e}),C(()=>{if(!s||!t)return;let c=Object.keys(n.handlers).map((u)=>s.registerHandler({action:u,context:r,handler:()=>n.handlers[u]?.(),singleKey:!0}));return()=>{for(let u of c)u()}},[r,i,s,t,n])}function bb(e,{isActive:o=!0}={}){let r=el(),[t]=g(()=>({handler:e}));on(()=>{t.handler=e}),C(()=>{if(!o||!r)return;return r.registerPreDispatch({handler:(s,n,i)=>t.handler(s,n,i)})},[o,r,t])}D();var a=800;function IW(e,o,r,t=a){let s=Jt(),n=Da(),i=T(0),c=T(void 0),u=Jr(()=>e(!1)),l=le(()=>{if(c.current)c.current(),c.current=void 0},[]);return C(()=>()=>{if(c.current)l(),u()},[l]),le(()=>{let d=n();if(d-i.current<=t&&c.current!==void 0)l(),e(!1),o();else r?.(),e(!0),l(),c.current=s.setTimeout(()=>{e(!1),c.current=void 0},t);i.current=d},[e,o,r,l,s,n,t])}
export{IW,ze,qt,bb};
