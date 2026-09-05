// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{Q}from"/$bunfs/root/chunk-b1z7jvb2.js";import{Ks}from"/$bunfs/root/chunk-e45krqw9.js";import{UR,nq}from"/$bunfs/root/chunk-9nqqseme.js";import{Ia}from"/$bunfs/root/chunk-1pzrx9y3.js";import{pu,e6e}from"/$bunfs/root/chunk-bnc671w7.js";import{sp,Mre}from"/$bunfs/root/chunk-1ag0ee2m.js";import{El}from"/$bunfs/root/chunk-ercqfpse.js";import{d3e}from"/$bunfs/root/chunk-vw215j9f.js";import{yle}from"/$bunfs/root/chunk-28sbj2a5.js";var g=["default","reset","none","gray","grey"];async function skr(n,e,t){return n(await QPt(t,e),{display:"system"}),null}async function QPt(n,e){if(Ks())return"Cannot set color: This session is a teammate. Teammate colors are assigned by the team leader.";let t=n?.trim()??"",o=t===""?sp[Math.floor(Math.random()*sp.length)]:t.toLowerCase(),r=g.includes(o);if(!r&&!sp.includes(o)){let s=sp.join(", ");return`Invalid color "${o}". Available colors: ${s}, default`}let m=Q(),d=El(),i=r?"default":o,l=r?void 0:o;await d3e(m,i,d,e.storageV5),e.setAppState((s)=>yle(s,{color:l}));let a=e.getAppState(),c=a.agent?a.agentDefinitions.activeAgents.find((s)=>s.agentType===a.agent):void 0;return e6e(pu(),Mre({userOverride:l,agentDefinitionColor:c?.color}),e.storageV5),f(i,e.credentials),r?"Session color reset to default":`Session color set to: ${o}`}function f(n,e){let t=Ia()?.bridgeSessionId;if(!t)return;let o=UR();import("/$bunfs/root/chunk-7w1wsbtx.js").then(({updateBridgeSessionColorTag:r})=>r(t,n,sp,{baseUrl:nq(),getAccessToken:o?()=>o:void 0,credentials:e}).catch(()=>{}))}
export{skr,QPt};
