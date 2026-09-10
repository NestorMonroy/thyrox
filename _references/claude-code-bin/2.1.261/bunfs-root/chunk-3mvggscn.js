// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import{TRt,b$n,uk,krt,fa}from"/$bunfs/root/chunk-annedm50.js";import{m3}from"/$bunfs/root/chunk-hyqdn9c0.js";import{X9,lqn,Wun,z4n,$fn,Nfn,H5,O9n,q9n,rEe,$yt,s6n,FM,cyn,jYn,CE}from"/$bunfs/root/chunk-vd630rs0.js";import{eLn,bje}from"/$bunfs/root/chunk-hsewrfs2.js";import{Nxn}from"/$bunfs/root/chunk-abjvv046.js";import{Ei}from"/$bunfs/root/chunk-s1cxej39.js";import{wbn}from"/$bunfs/root/chunk-71tvqbzt.js";import{y9,Unn}from"/$bunfs/root/chunk-9t826aw3.js";import{vPe}from"/$bunfs/root/chunk-jx16bmwk.js";import{EGn}from"/$bunfs/root/chunk-mq7x9hzc.js";function Bnn(t,r=new Set,i,o,l,m=!1){let a=r.size>0;if(jYn(t),bje(t),wbn.of(t).clear(),Unn(y9),CE(),O9n(r),krt(null),!a)$fn.peek(t)?.clear();let s=Nfn();if(s?.getTeleportCacheState().status==="active")s.revertTeleportCache("transcript_cleared");if(H5(t,void 0,i,void 0,void 0,void 0,l),uk("clear"),FM(),TRt(fa()),!m)zDt();if(cyn(t,"session_start"),X9.of(t).reset(),Wun.of(t).clear(),rEe.of(t).reset(),i?.((e)=>{if(e.storedImagePaths.size===0&&e.imageDescriptions.size===0&&Object.keys(e.displayedMessageContent).length===0)return e;return{...e,storedImagePaths:new Map,imageDescriptions:new Map,displayedMessageContent:{}}}),lqn(),!a)EGn();if(Nxn(),!a)q9n();if(b$n(r),eLn(),s6n(),$yt().catch(()=>{}),z4n(t),o)o.get(vPe).clear(),import("/$bunfs/root/chunk-87cqpb0v.js").then(({WebFetchCache:e})=>o.get(e).clear()),import("/$bunfs/root/chunk-825nv0fn.js").then(({ToolSearchDescriptionCache:e})=>o.get(e).clear());import("/$bunfs/root/chunk-twg1gpc9.js").then(({clearAgentDefinitionsCache:e})=>e())}function zDt(){let t=Ei();t.bashPromptSkillCommands=void 0,t.workflowAuthoringSkillAvailable=void 0,m3()}
export{Bnn,zDt};
