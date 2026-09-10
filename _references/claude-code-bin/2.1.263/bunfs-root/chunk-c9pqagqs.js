// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.263
import{CRt,H$n,uk,krt,fa}from"/$bunfs/root/chunk-k6vqz9fa.js";import{h3}from"/$bunfs/root/chunk-32f2qmtc.js";import{Q9,dqn,Vun,q4n,Mfn,Ffn,E5,B9n,X9n,oEe,Myt,l6n,FM,uyn,WYn,CE}from"/$bunfs/root/chunk-9wa0ka8p.js";import{nLn,Sje}from"/$bunfs/root/chunk-8bd42nrb.js";import{Bxn}from"/$bunfs/root/chunk-xrr6v9m7.js";import{Ei}from"/$bunfs/root/chunk-tjx05rry.js";import{Ebn}from"/$bunfs/root/chunk-q7xzm1tc.js";import{b9,jnn}from"/$bunfs/root/chunk-wczx7bjt.js";import{vPe}from"/$bunfs/root/chunk-f2p4g4df.js";import{kGn}from"/$bunfs/root/chunk-528x1zh5.js";function Unn(t,r=new Set,i,o,l,m=!1){let a=r.size>0;if(WYn(t),Sje(t),Ebn.of(t).clear(),jnn(b9),CE(),B9n(r),krt(null),!a)Mfn.peek(t)?.clear();let s=Ffn();if(s?.getTeleportCacheState().status==="active")s.revertTeleportCache("transcript_cleared");if(E5(t,void 0,i,void 0,void 0,void 0,l),uk("clear"),FM(),CRt(fa()),!m)WDt();if(uyn(t,"session_start"),Q9.of(t).reset(),Vun.of(t).clear(),oEe.of(t).reset(),i?.((e)=>{if(e.storedImagePaths.size===0&&e.imageDescriptions.size===0&&Object.keys(e.displayedMessageContent).length===0)return e;return{...e,storedImagePaths:new Map,imageDescriptions:new Map,displayedMessageContent:{}}}),dqn(),!a)kGn();if(Bxn(),!a)X9n();if(H$n(r),nLn(),l6n(),Myt().catch(()=>{}),q4n(t),o)o.get(vPe).clear(),import("/$bunfs/root/chunk-3gv7s25w.js").then(({WebFetchCache:e})=>o.get(e).clear()),import("/$bunfs/root/chunk-x0z07nty.js").then(({ToolSearchDescriptionCache:e})=>o.get(e).clear());import("/$bunfs/root/chunk-ady6ggsk.js").then(({clearAgentDefinitionsCache:e})=>e())}function WDt(){let t=Ei();t.bashPromptSkillCommands=void 0,t.workflowAuthoringSkillAvailable=void 0,h3()}
export{Unn,WDt};
