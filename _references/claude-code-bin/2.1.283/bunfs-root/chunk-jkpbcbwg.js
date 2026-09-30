// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{Y}from"/$bunfs/root/chunk-nvht7ckf.js";import{tl}from"/$bunfs/root/chunk-jzycvw5e.js";import{uH,Gee}from"/$bunfs/root/chunk-9nyn32jd.js";import{zl}from"/$bunfs/root/chunk-6ecc7sxv.js";import{Ep,tIt}from"/$bunfs/root/chunk-mxz6ht5b.js";import{Th,Yke}from"/$bunfs/root/chunk-ex4n0jxy.js";import{xd}from"/$bunfs/root/chunk-dqs077dg.js";import{JRt}from"/$bunfs/root/chunk-csayct82.js";import{iOe}from"/$bunfs/root/chunk-0vsdrps9.js";var c=["default","reset","none","gray","grey"];async function SKo(n,e,o){return n(await eAn(o,e),{display:"system"}),null}async function eAn(n,e){if(tl())return"Cannot set color: This session is a teammate. Teammate colors are assigned by the team leader.";let o=n?.trim()??"",t=o===""?Th[Math.floor(Math.random()*Th.length)]:o.toLowerCase(),r=c.includes(t);if(!r&&!Th.includes(t)){let s=Th.join(", ");return`Invalid color "${t}". Available colors: ${s}, default`}let d=Y(),m=xd(),i=r?"default":t,l=r?void 0:t;await JRt(d,i,m,e.storageV5),e.setAppState((s)=>iOe(s,{color:l}));let a=e.getAppState(),g=a.agent?a.agentDefinitions.activeAgents.find((s)=>s.agentType===a.agent):void 0;return tIt(Ep(),Yke({userOverride:l,agentDefinitionColor:g?.color}),e.storageV5),p(i,e.credentials),r?"Session color reset to default":`Session color set to: ${t}`}function p(n,e){let o=zl()?.bridgeSessionId;if(!o)return;let t=uH();import("/$bunfs/root/chunk-1r4bdgf3.js").then(({updateBridgeSessionColorTag:r})=>r(o,n,Th,{baseUrl:Gee(),getAccessToken:t?()=>t:void 0,credentials:e}).catch(()=>{}))}
export{SKo,eAn};
