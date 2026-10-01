// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{q}from"/$bunfs/root/chunk-hbjpbz2q.js";import{Xa}from"/$bunfs/root/chunk-ywx8e53p.js";import{DM,sne}from"/$bunfs/root/chunk-20sb8zsk.js";import{Ql}from"/$bunfs/root/chunk-4g23xw5g.js";import{$p,F0t}from"/$bunfs/root/chunk-j6mm9mhr.js";import{ty,TAe}from"/$bunfs/root/chunk-bpr1reze.js";import{jd}from"/$bunfs/root/chunk-wq44yhgc.js";import{zOt}from"/$bunfs/root/chunk-kt4703ww.js";import{wHe}from"/$bunfs/root/chunk-4kpd1p33.js";var c=["default","reset","none","gray","grey"];async function g7o(n,e,o){return n(await zPn(o,e),{display:"system"}),null}async function zPn(n,e){if(Xa())return"Cannot set color: This session is a teammate. Teammate colors are assigned by the team leader.";let o=n?.trim()??"",t=o===""?ty[Math.floor(Math.random()*ty.length)]:o.toLowerCase(),r=c.includes(t);if(!r&&!ty.includes(t)){let s=ty.join(", ");return`Invalid color "${t}". Available colors: ${s}, default`}let d=q(),m=jd(),i=r?"default":t,l=r?void 0:t;await zOt(d,i,m,e.storageV5),e.setAppState((s)=>wHe(s,{color:l}));let a=e.getAppState(),g=a.agent?a.agentDefinitions.activeAgents.find((s)=>s.agentType===a.agent):void 0;return F0t($p(),TAe({userOverride:l,agentDefinitionColor:g?.color}),e.storageV5),p(i,e.credentials),r?"Session color reset to default":`Session color set to: ${t}`}function p(n,e){let o=Ql()?.bridgeSessionId;if(!o)return;let t=DM();import("/$bunfs/root/chunk-z0sm7ctf.js").then(({updateBridgeSessionColorTag:r})=>r(o,n,ty,{baseUrl:sne(),getAccessToken:t?()=>t:void 0,credentials:e}).catch(()=>{}))}
export{g7o,zPn};
