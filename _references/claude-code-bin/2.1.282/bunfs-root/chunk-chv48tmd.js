// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{Y}from"/$bunfs/root/chunk-zwm3fybx.js";import{Ga}from"/$bunfs/root/chunk-355q52cq.js";import{hN,lZ}from"/$bunfs/root/chunk-3msrdcq2.js";import{Ol}from"/$bunfs/root/chunk-npq8agtd.js";import{up,$At}from"/$bunfs/root/chunk-kda7f0br.js";import{lh,Gve}from"/$bunfs/root/chunk-1z65s61j.js";import{_d}from"/$bunfs/root/chunk-dg8z8cmw.js";import{MTt}from"/$bunfs/root/chunk-c9jscxk0.js";import{Kxe}from"/$bunfs/root/chunk-kgsd809r.js";var c=["default","reset","none","gray","grey"];async function vUo(n,e,o){return n(await nwn(o,e),{display:"system"}),null}async function nwn(n,e){if(Ga())return"Cannot set color: This session is a teammate. Teammate colors are assigned by the team leader.";let o=n?.trim()??"",t=o===""?lh[Math.floor(Math.random()*lh.length)]:o.toLowerCase(),r=c.includes(t);if(!r&&!lh.includes(t)){let s=lh.join(", ");return`Invalid color "${t}". Available colors: ${s}, default`}let d=Y(),m=_d(),i=r?"default":t,l=r?void 0:t;await MTt(d,i,m,e.storageV5),e.setAppState((s)=>Kxe(s,{color:l}));let a=e.getAppState(),g=a.agent?a.agentDefinitions.activeAgents.find((s)=>s.agentType===a.agent):void 0;return $At(up(),Gve({userOverride:l,agentDefinitionColor:g?.color}),e.storageV5),p(i,e.credentials),r?"Session color reset to default":`Session color set to: ${t}`}function p(n,e){let o=Ol()?.bridgeSessionId;if(!o)return;let t=hN();import("/$bunfs/root/chunk-vh1txpz7.js").then(({updateBridgeSessionColorTag:r})=>r(o,n,lh,{baseUrl:lZ(),getAccessToken:t?()=>t:void 0,credentials:e}).catch(()=>{}))}
export{vUo,nwn};
