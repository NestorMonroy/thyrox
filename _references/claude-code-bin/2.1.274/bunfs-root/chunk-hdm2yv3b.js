// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{V}from"/$bunfs/root/chunk-ja309z9r.js";import{ca}from"/$bunfs/root/chunk-ebvrj09e.js";import{FO,H8}from"/$bunfs/root/chunk-en7cyb16.js";import{ga}from"/$bunfs/root/chunk-zczpshsx.js";import{jd,Mdt}from"/$bunfs/root/chunk-wae9xe9x.js";import{$m,Nfe}from"/$bunfs/root/chunk-5mzvkfyk.js";import{Pc}from"/$bunfs/root/chunk-58xqqga9.js";import{Yat}from"/$bunfs/root/chunk-ayyj05ne.js";import{Mbe}from"/$bunfs/root/chunk-fczp5fqz.js";var c=["default","reset","none","gray","grey"];async function xJr(n,e,o){return n(await gJt(o,e),{display:"system"}),null}async function gJt(n,e){if(ca())return"Cannot set color: This session is a teammate. Teammate colors are assigned by the team leader.";let o=n?.trim()??"",t=o===""?$m[Math.floor(Math.random()*$m.length)]:o.toLowerCase(),r=c.includes(t);if(!r&&!$m.includes(t)){let s=$m.join(", ");return`Invalid color "${t}". Available colors: ${s}, default`}let d=V(),m=Pc(),i=r?"default":t,l=r?void 0:t;await Yat(d,i,m,e.storageV5),e.setAppState((s)=>Mbe(s,{color:l}));let a=e.getAppState(),g=a.agent?a.agentDefinitions.activeAgents.find((s)=>s.agentType===a.agent):void 0;return Mdt(jd(),Nfe({userOverride:l,agentDefinitionColor:g?.color}),e.storageV5),p(i,e.credentials),r?"Session color reset to default":`Session color set to: ${t}`}function p(n,e){let o=ga()?.bridgeSessionId;if(!o)return;let t=FO();import("/$bunfs/root/chunk-wwvtpam7.js").then(({updateBridgeSessionColorTag:r})=>r(o,n,$m,{baseUrl:H8(),getAccessToken:t?()=>t:void 0,credentials:e}).catch(()=>{}))}
export{xJr,gJt};
