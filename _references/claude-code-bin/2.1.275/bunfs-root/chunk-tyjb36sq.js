// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{V}from"/$bunfs/root/chunk-4qqe0nh4.js";import{oa}from"/$bunfs/root/chunk-cbmfm0r3.js";import{uM,AY}from"/$bunfs/root/chunk-akp1f214.js";import{Ga}from"/$bunfs/root/chunk-jeq53as7.js";import{Cd,qft}from"/$bunfs/root/chunk-f3t284zj.js";import{Km,Zme}from"/$bunfs/root/chunk-jbg7raey.js";import{Nc}from"/$bunfs/root/chunk-nm7g42qn.js";import{aut}from"/$bunfs/root/chunk-q2gh92k2.js";import{owe}from"/$bunfs/root/chunk-1j4rxdw4.js";var c=["default","reset","none","gray","grey"];async function hro(n,e,o){return n(await een(o,e),{display:"system"}),null}async function een(n,e){if(oa())return"Cannot set color: This session is a teammate. Teammate colors are assigned by the team leader.";let o=n?.trim()??"",t=o===""?Km[Math.floor(Math.random()*Km.length)]:o.toLowerCase(),r=c.includes(t);if(!r&&!Km.includes(t)){let s=Km.join(", ");return`Invalid color "${t}". Available colors: ${s}, default`}let d=V(),m=Nc(),i=r?"default":t,l=r?void 0:t;await aut(d,i,m,e.storageV5),e.setAppState((s)=>owe(s,{color:l}));let a=e.getAppState(),g=a.agent?a.agentDefinitions.activeAgents.find((s)=>s.agentType===a.agent):void 0;return qft(Cd(),Zme({userOverride:l,agentDefinitionColor:g?.color}),e.storageV5),p(i,e.credentials),r?"Session color reset to default":`Session color set to: ${t}`}function p(n,e){let o=Ga()?.bridgeSessionId;if(!o)return;let t=uM();import("/$bunfs/root/chunk-705zv90c.js").then(({updateBridgeSessionColorTag:r})=>r(o,n,Km,{baseUrl:AY(),getAccessToken:t?()=>t:void 0,credentials:e}).catch(()=>{}))}
export{hro,een};
